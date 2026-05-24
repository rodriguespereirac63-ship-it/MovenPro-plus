import { auth, db } from './firebase.js';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export function lerLocal(chave, fallback = null){
  try{
    const valor = JSON.parse(localStorage.getItem(chave) || 'null');
    return valor ?? fallback;
  }catch(e){
    return fallback;
  }
}

export function salvarLocal(chave, valor){
  localStorage.setItem(chave, JSON.stringify(valor));
}

export function usuarioAtualLocal(){
  return lerLocal('movenproUser', {}) || {};
}

export function empresaIdAtual(){
  const usuario = usuarioAtualLocal();
  return usuario.empresaId || 'moven001';
}

function normalizarDoc(docSnap){
  const data = docSnap.data() || {};
  return { id: data.id || docSnap.id, ...data };
}

export async function carregarColecaoEmpresa(colecao, chaveLocal = '', fallback = []){
  const empresaId = empresaIdAtual();
  const mapa = new Map();

  try{
    const subSnap = await getDocs(collection(db, 'empresas', empresaId, colecao));
    subSnap.docs.forEach(d => mapa.set(d.id, normalizarDoc(d)));
  }catch(error){
    console.warn(`Não foi possível ler empresas/${empresaId}/${colecao}:`, error);
  }

  try{
    const raiz = query(collection(db, colecao), where('empresaId', '==', empresaId));
    const raizSnap = await getDocs(raiz);
    raizSnap.docs.forEach(d => {
      if(!mapa.has(d.id)) mapa.set(d.id, normalizarDoc(d));
    });
  }catch(error){
    console.warn(`Não foi possível ler ${colecao} por empresaId:`, error);
  }

  const online = Array.from(mapa.values());
  if(online.length){
    if(chaveLocal) salvarLocal(chaveLocal, online);
    return online;
  }

  if(chaveLocal){
    const local = lerLocal(chaveLocal, null);
    if(Array.isArray(local) && local.length) return local;
  }

  return fallback;
}

export async function salvarDocumentoEmpresa(colecao, id, dados){
  const empresaId = dados.empresaId || empresaIdAtual();
  const payload = {
    ...dados,
    empresaId,
    atualizadoEm: dados.atualizadoEm || new Date().toISOString(),
    atualizadoEmServidor: serverTimestamp(),
    uid: auth.currentUser?.uid || dados.uid || ''
  };

  await setDoc(doc(db, colecao, String(id)), payload, { merge: true });
  await setDoc(doc(db, 'empresas', empresaId, colecao, String(id)), payload, { merge: true });
  return payload;
}
