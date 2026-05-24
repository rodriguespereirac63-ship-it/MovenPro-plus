// Correção: garante que o item Bar abra bar.html e não volte para Dashboard.
document.addEventListener('click', (e) => {
  const link = e.target.closest?.('a[data-page-link="bar"]');
  if (!link) return;
  e.preventDefault();
  window.location.href = 'bar.html';
});

import { auth, db } from './firebase.js';
import { carregarColecaoEmpresa } from './data-sync.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

document.getElementById('appMenuBtn')?.remove();

function paginaAtual(){
  let page = location.pathname.split('/').pop() || 'index.html';

  if(page === '') page = 'index.html';

  // Compatível com Firebase cleanUrls: /dashboard vira dashboard.html
  if(page && !page.includes('.') && page !== ''){
    page = page + '.html';
  }

  return page;
}

const pagina = paginaAtual();
const paginasPublicas = ['index.html', '', '404.html'];

const permissoes = {
  admin: ['dashboard.html','vendas.html','mesas.html','garcom.html','cozinha.html','bar.html','alertas.html','estoque.html','financeiro.html','cartoes.html','monitor-nfe.html','relatorios.html','fiscal.html','config.html','contas-fixas.html','markup.html','produtos.html'],
  caixa: ['vendas.html','mesas.html','garcom.html','cozinha.html','bar.html','estoque.html','alertas.html','relatorios.html'],
  garcom: ['garcom.html','mesas.html','cozinha.html','bar.html'],
  cozinha: ['cozinha.html','bar.html'],
  bar: ['bar.html','cozinha.html']
};

const destinoPerfil = {
  admin: 'dashboard.html',
  caixa: 'vendas.html',
  garcom: 'garcom.html',
  cozinha: 'cozinha.html',
  bar: 'bar.html'
};

function getCacheUser(){
  try { return JSON.parse(localStorage.getItem('movenproUser') || '{}') || {}; }
  catch(e){ return {}; }
}

function normalizarPerfil(perfil){
  const p = (perfil || '').toLowerCase().trim();
  if(p === 'garçon' || p === 'garcon') return 'garcom';
  if(p === 'administrador' || p === 'adm' || p === 'gerente') return 'admin';
  if(p === 'bar' || p === 'bartender' || p === 'barman') return 'bar';
  if(p === 'funcionario') return 'caixa';
  return p || 'caixa';
}

function setCacheUser(user, perfil){
  const data = {
    uid: user.uid,
    email: user.email,
    nome: perfil.nome || user.email || 'Usuário',
    perfil: normalizarPerfil(perfil.perfil),
    empresaId: perfil.empresaId || 'moven001',
    ativo: perfil.ativo !== false
  };
  localStorage.setItem('movenproUser', JSON.stringify(data));
  return data;
}

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

function podeAcessar(perfil, page){
  if(paginasPublicas.includes(page)) return true;
  return (permissoes[perfil] || []).includes(page);
}

function aplicarInterface(userData){
  const perfil = normalizarPerfil(userData.perfil);
  document.body.classList.add(`perfil-${perfil}`);

  if(perfil !== 'admin'){
    document.querySelectorAll('[data-admin-only]').forEach(el => el.remove());
  }

  const bloqueios = {
    cozinha: ['vendas.html','mesas.html','garcom.html','estoque.html','financeiro.html','config.html','fiscal.html','cartoes.html','monitor-nfe.html','relatorios.html','alertas.html','dashboard.html'],
    garcom: ['financeiro.html','config.html','fiscal.html','cartoes.html','monitor-nfe.html','relatorios.html','estoque.html','alertas.html','dashboard.html'],
    bar: ['dashboard.html','vendas.html','mesas.html','garcom.html','estoque.html','financeiro.html','config.html','fiscal.html','cartoes.html','monitor-nfe.html','relatorios.html','alertas.html'],
    caixa: ['financeiro.html','config.html','fiscal.html','cartoes.html','monitor-nfe.html']
  };

  (bloqueios[perfil] || []).forEach(href => {
    document.querySelectorAll(`a[href="${href}"]`).forEach(el => el.remove());
  });

  const userName = document.getElementById('userName');
  if (userName) userName.textContent = userData.nome || userData.email || perfil;

  const empresaTopo = document.getElementById('empresaTopo');
  if (empresaTopo) empresaTopo.textContent = userData.empresaId || 'Loja Matriz';

  atualizarDashboardOperacional();
}

function brl(v){
  return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function arrayLocal(chave){
  try{
    const arr = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function cardPorTitulo(texto){
  return [...document.querySelectorAll('.metric-card')].find(card => card.textContent.includes(texto));
}

async function atualizarDashboardOperacional(){
  if(!document.body.classList.contains('app-page')) return;
  if(!cardPorTitulo('Vendas hoje')) return;

  let vendas = arrayLocal('movenproVendas');
  let produtos = arrayLocal('movenproProdutosEstoque');
  try{
    [vendas, produtos] = await Promise.all([
      carregarColecaoEmpresa('vendas', 'movenproVendas', vendas),
      carregarColecaoEmpresa('produtos', 'movenproProdutosEstoque', produtos)
    ]);
  }catch(error){
    console.warn('Dashboard usando dados locais:', error);
  }

  const hoje = new Date().toISOString().slice(0,10);
  const vendasHoje = vendas.filter(v => String(v.data || '').slice(0,10) === hoje);
  const totalHoje = vendasHoje.reduce((s,v)=>s + Number(v.bruto || v.total || 0),0);
  const lucroHoje = vendasHoje.reduce((s,v)=>s + Number(v.liquido || v.bruto || v.total || 0),0);
  const baixos = produtos.filter(p => Number(p.qtd ?? p.estoque ?? 0) <= Number(p.minimo ?? 0)).length;

  const vendasCard = cardPorTitulo('Vendas hoje')?.querySelector('h2');
  const lucroCard = cardPorTitulo('Lucro estimado')?.querySelector('h2');
  const baixoCard = cardPorTitulo('Estoque baixo')?.querySelector('h2');

  if(vendasCard) vendasCard.textContent = brl(totalHoje);
  if(lucroCard) lucroCard.textContent = brl(lucroHoje);
  if(baixoCard) baixoCard.textContent = String(baixos);
}

function destinoAtualIgual(destino){
  return pagina === destino || location.pathname.endsWith('/' + destino.replace('.html','')) || location.pathname.endsWith('/' + destino);
}

function redirecionarSeNecessario(userData){
  const perfil = normalizarPerfil(userData.perfil);
  const destino = destinoPerfil[perfil] || 'index.html';

  if(!podeAcessar(perfil, pagina)){
    if(!destinoAtualIgual(destino)){
      window.location.replace(destino);
      return true;
    }
  }

  return false;
}

function irLogin(){
  localStorage.removeItem('movenproUser');
  if(!paginasPublicas.includes(pagina) && !location.pathname.endsWith('/index') && !location.pathname.endsWith('/index.html')){
    window.location.replace('index.html');
    return true;
  }
  return false;
}

const logout = document.getElementById('logoutBtn');
logout?.addEventListener('click', async (e)=>{
  e.preventDefault();
  try { await signOut(auth); } catch(err) {}
  localStorage.removeItem('movenproUser');
  window.location.replace('index.html');
});

if(!paginasPublicas.includes(pagina)){
  document.documentElement.style.visibility = 'hidden';

  onAuthStateChanged(auth, async (firebaseUser) => {
    let redirected = false;

    try{
      if(!firebaseUser){
        redirected = irLogin();
        return;
      }

      let perfil = await buscarPerfil(firebaseUser);

      if(!perfil){
        const cache = getCacheUser();
        if(cache.uid === firebaseUser.uid && cache.empresaId) perfil = cache;
      }

      if(!perfil || perfil.ativo === false){
        await signOut(auth);
        redirected = irLogin();
        return;
      }

      const userData = setCacheUser(firebaseUser, perfil);
      redirected = redirecionarSeNecessario(userData);

      if(redirected) return;

      aplicarInterface(userData);
    }catch(error){
      console.error('Falha na validação de sessão:', error);
      redirected = irLogin();
    }finally{
      if(!redirected){
        document.documentElement.style.visibility = 'visible';
      }
    }
  });
}
