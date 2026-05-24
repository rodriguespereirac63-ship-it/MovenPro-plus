import './dashboard.js';
import { auth, db } from './firebase.js';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const PEDIDOS_KEY = 'movenproPlusPedidos';
const MESAS_KEY = 'movenproPlusMesas';

let pedidosAtuais = [];
let mesasAtuais = [];

function getUser(){ try{return JSON.parse(localStorage.getItem('movenproUser') || '{}') || {}}catch(e){return {}} }
function empresaIdAtual(){ return getUser().empresaId || 'moven001'; }
function salvar(chave, valor){ localStorage.setItem(chave, JSON.stringify(valor)); }
function carregar(chave, padrao){ try{const v=JSON.parse(localStorage.getItem(chave)||'null'); return v ?? padrao}catch(e){return padrao} }
function brl(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

function somenteMinhaEmpresa(lista){
  const emp = empresaIdAtual();
  return lista.filter(item => !item.empresaId || item.empresaId === emp);
}


function setorDoItem(item){
  const setor = String(item?.setorPreparo || item?.setor || '').toLowerCase();
  const categoria = String(item?.categoria || '').toLowerCase();
  const nome = String(item?.nome || '').toLowerCase();
  if(setor === 'bar') return 'bar';
  if(categoria.includes('bebida') || categoria.includes('drink') || nome.includes('coca') || nome.includes('água') || nome.includes('agua') || nome.includes('suco') || nome.includes('cerveja') || nome.includes('caipirinha')) return 'bar';
  return 'cozinha';
}
function itensDoSetor(pedido, setor){
  return (pedido.itens || []).filter(item => setorDoItem(item) === setor);
}

function juntarPorId(a, b){
  const map = new Map();
  [...a, ...b].forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

function atualizarMetricas(){
  document.getElementById('cozAguardando').textContent = pedidosAtuais.filter(p=>p.status==='aguardando' && itensDoSetor(p,'cozinha').length).length;
  document.getElementById('cozPreparo').textContent = pedidosAtuais.filter(p=>p.status==='preparo' && itensDoSetor(p,'cozinha').length).length;
  document.getElementById('cozProntos').textContent = pedidosAtuais.filter(p=>p.status==='pronto' && itensDoSetor(p,'cozinha').length).length;
  document.getElementById('cozMesas').textContent = mesasAtuais.filter(m=>m.status!=='livre').length;
}

function cardPedido(p){
  return `<article class="cozinha-card">
    <div class="cozinha-card-head">
      <strong>Mesa ${p.mesaNumero}</strong>
      <span>${new Date(p.data).toLocaleTimeString('pt-BR')}</span>
    </div>
    <p><b>Garçom:</b> ${p.garcom || '-'}</p>
    <div class="finance-list">
      ${itensDoSetor(p,'cozinha').map(i=>`<div><span>${i.qtd}x ${i.nome}</span><strong>${brl(i.total)}</strong><small>${p.obs || ''}</small></div>`).join('')}
    </div>
    <div class="mesa-actions">
      <button data-action="aguardando" data-id="${p.id}" class="stock-filter-btn" type="button">Aguardar</button>
      <button data-action="preparo" data-id="${p.id}" class="stock-filter-btn" type="button">Preparo</button>
      <button data-action="pronto" data-id="${p.id}" class="btn-primary" type="button">Pronto</button>
      <button data-action="entregue" data-id="${p.id}" class="stock-filter-btn" type="button">Entregue</button>
    </div>
  </article>`;
}

function render(){
  const visiveis = pedidosAtuais.filter(p=>p.status !== 'cancelado' && p.status !== 'entregue' && itensDoSetor(p,'cozinha').length);
  atualizarMetricas();

  const aguardando = visiveis.filter(p=>p.status==='aguardando' || !p.status);
  const preparo = visiveis.filter(p=>p.status==='preparo');
  const prontos = visiveis.filter(p=>p.status==='pronto');

  document.getElementById('listaAguardando').innerHTML = aguardando.map(cardPedido).join('') || '<p>Nenhum pedido aguardando.</p>';
  document.getElementById('listaPreparo').innerHTML = preparo.map(cardPedido).join('') || '<p>Nenhum pedido em preparo.</p>';
  document.getElementById('listaProntos').innerHTML = prontos.map(cardPedido).join('') || '<p>Nenhum pedido pronto.</p>';

  document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>alterarStatus(btn.dataset.id, btn.dataset.action)));
}


async function atualizarMesaPeloPedido(pedido, status){
  try{
    const empresaId = pedido.empresaId || empresaIdAtual();
    const mesaId = pedido.mesaId || `MESA-${String(pedido.mesaNumero).padStart(2,'0')}`;
    const mesaStatus = status === 'entregue' ? 'fechamento' : (status === 'pronto' ? 'fechamento' : 'ocupada');

    const mesaAtual = mesasAtuais.find(m => String(m.id) === String(mesaId)) || {};
    const itensAtuais = Array.isArray(mesaAtual.itens) ? [...mesaAtual.itens] : [];
    (pedido.itens || []).forEach(item => {
      const itemNormalizado = {...item, pedidoId: pedido.id, obs: pedido.obs || item.obs || ''};
      const jaExiste = itensAtuais.some(i =>
        String(i.pedidoId || '') === String(pedido.id) &&
        String(i.codigoInterno || i.nome) === String(item.codigoInterno || item.nome)
      );
      if(!jaExiste) itensAtuais.push(itemNormalizado);
    });

    const mesaPayload = {
      id: mesaId,
      numero: pedido.mesaNumero,
      status: mesaStatus,
      garcom: mesaAtual.garcom || pedido.garcom || '',
      pessoas: mesaAtual.pessoas || 0,
      abertaEm: mesaAtual.abertaEm || pedido.data || new Date().toISOString(),
      itens: itensAtuais,
      total: itensAtuais.reduce((s,i)=>s+Number(i.total||0),0),
      empresaId,
      atualizadoEm: new Date().toISOString(),
      origem: 'cozinha',
      servidorAtualizacao: serverTimestamp()
    };

    await setDoc(doc(db, 'mesas', mesaId), mesaPayload, {merge:true});
    await setDoc(doc(db, 'empresas', empresaId, 'mesas', mesaId), mesaPayload, {merge:true});
  }catch(e){
    console.warn('Não consegui atualizar mesa pelo pedido:', e);
  }
}

async function alterarStatus(id, status){
  const pedido = pedidosAtuais.find(p=>p.id===id);
  if(!pedido) return;

  const atualizado = {
    ...pedido,
    status,
    atualizadoEm:new Date().toISOString(),
    empresaId: pedido.empresaId || empresaIdAtual(),
    uidAtualizacao: auth.currentUser?.uid || '',
    servidorAtualizacao: serverTimestamp()
  };

  try{
    await setDoc(doc(db, 'pedidosRestaurante', id), atualizado, {merge:true});
    await setDoc(doc(db, 'empresas', atualizado.empresaId, 'pedidosRestaurante', id), atualizado, {merge:true});
    await atualizarMesaPeloPedido(atualizado, status);
  }catch(e){
    console.error(e);
    alert('Não foi possível atualizar o pedido no Firebase: ' + (e.code || e.message || e));
  }
}

let pedidosRoot = [];
let pedidosEmpresa = [];
let mesasRoot = [];
let mesasEmpresa = [];

function atualizarPedidosCombinados(){
  pedidosAtuais = somenteMinhaEmpresa(juntarPorId(pedidosRoot, pedidosEmpresa))
    .sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
  salvar(PEDIDOS_KEY, pedidosAtuais);
  render();
}

function atualizarMesasCombinadas(){
  mesasAtuais = somenteMinhaEmpresa(juntarPorId(mesasRoot, mesasEmpresa));
  salvar(MESAS_KEY, mesasAtuais);
  render();
}

function escutarPedidos(){
  onSnapshot(collection(db, 'pedidosRestaurante'), (snap)=>{
    pedidosRoot = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarPedidosCombinados();
  }, (err)=>{
    console.error('Erro ao escutar pedidos raiz:', err);
    document.getElementById('listaAguardando').innerHTML = '<p>Erro ao carregar pedidos raiz. Confira Firestore Rules.</p>';
  });

  onSnapshot(collection(db, 'empresas', empresaIdAtual(), 'pedidosRestaurante'), (snap)=>{
    pedidosEmpresa = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarPedidosCombinados();
  }, (err)=>console.warn('Erro ao escutar pedidos da empresa:', err));
}

function escutarMesas(){
  onSnapshot(collection(db, 'mesas'), (snap)=>{
    mesasRoot = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarMesasCombinadas();
  }, (err)=>console.warn('Erro ao escutar mesas raiz:', err));

  onSnapshot(collection(db, 'empresas', empresaIdAtual(), 'mesas'), (snap)=>{
    mesasEmpresa = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarMesasCombinadas();
  }, (err)=>console.warn('Erro ao escutar mesas da empresa:', err));
}

document.getElementById('btnAtualizarCozinha')?.addEventListener('click', render);
document.getElementById('btnTelaCheiaCozinha')?.addEventListener('click',()=>{
  document.documentElement.requestFullscreen?.();
  document.body.classList.add('fullscreen-mode');
});

document.addEventListener('fullscreenchange', ()=>{
  if(!document.fullscreenElement){
    document.body.classList.remove('fullscreen-mode');
  }
});

escutarPedidos();
escutarMesas();
