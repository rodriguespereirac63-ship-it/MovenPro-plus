import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');

async function salvarPerfilUid(user, perfil){
  if(!user || !perfil) return perfil;
  try{
    await setDoc(doc(db, 'usuarios', user.uid), {
      ...perfil,
      email: (perfil.email || user.email || '').toLowerCase(),
      empresaId: perfil.empresaId || 'moven001',
      ativo: perfil.ativo !== false
    }, { merge: true });
  }catch(error){
    console.warn('Não foi possível sincronizar perfil por UID:', error);
  }
  return perfil;
}

async function buscarPerfil(user){
  const uid = user.uid;
  const email = (user.email || '').toLowerCase();

  let snap = await getDoc(doc(db, 'usuarios', uid));
  if (snap.exists()) return snap.data();

  snap = await getDoc(doc(db, 'usuario', uid));
  if (snap.exists()) return snap.data();

  const q1 = query(collection(db, 'usuarios'), where('email', '==', email), limit(1));
  const r1 = await getDocs(q1);
  if (!r1.empty) return salvarPerfilUid(user, r1.docs[0].data());

  const q2 = query(collection(db, 'usuario'), where('email', '==', email), limit(1));
  const r2 = await getDocs(q2);
  if (!r2.empty) return salvarPerfilUid(user, r2.docs[0].data());

  return null;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = 'Entrando...';

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();

  try{
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    const perfil = await buscarPerfil(cred.user);

    if(!perfil){
      msg.textContent = 'Login autenticou, mas não encontrei o perfil no Firestore. Verifique a coleção usuarios.';
      return;
    }

    if(perfil.ativo === false){
      msg.textContent = 'Usuário desativado.';
      return;
    }

    localStorage.setItem('movenproUser', JSON.stringify({
      uid: cred.user.uid,
      email: cred.user.email,
      nome: perfil.nome || 'Usuário',
      perfil: perfil.perfil || 'funcionario',
      empresaId: perfil.empresaId || 'moven001'
    }));

    const tipoPerfil = (perfil.perfil || '').toLowerCase();

    if(tipoPerfil === 'admin'){
      window.location.replace('dashboard.html');
    }else if(tipoPerfil === 'caixa'){
      window.location.replace('vendas.html');
    }else if(tipoPerfil === 'garcom' || tipoPerfil === 'garçon' || tipoPerfil === 'garcon'){
      window.location.replace('garcom.html');
    }else if(tipoPerfil === 'cozinha'){
      window.location.replace('cozinha.html');
    }else if(tipoPerfil === 'bar' || tipoPerfil === 'barman' || tipoPerfil === 'bartender'){
      window.location.replace('bar.html');
    }else{
      window.location.replace('vendas.html');
    }
  }catch(error){
    console.error(error);
    if(error.code === 'auth/invalid-credential') msg.textContent = 'E-mail ou senha incorretos.';
    else if(error.code === 'auth/configuration-not-found') msg.textContent = 'Ative Email/Senha no Firebase Authentication.';
    else msg.textContent = 'Erro no login: ' + (error.message || error.code);
  }
});
