import './dashboard.js';
import { auth, db } from './firebase.js';
import { collection, doc, onSnapshot, query, setDoc, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const drawer = document.getElementById('drawer');
const menuBtn = document.getElementById('menuBtn');
menuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  drawer?.classList.toggle('open');
});
document.addEventListener('click', (e)=>{
  if(drawer?.classList.contains('open') && !drawer.contains(e.target) && e.target !== menuBtn){
    drawer.classList.remove('open');
  }
});

const MESAS_KEY = 'movenproPlusMesas';
const PEDIDOS_KEY = 'movenproPlusPedidos';

function brl(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function getUser(){ try{return JSON.parse(localStorage.getItem('movenproUser') || '{}') || {}}catch(e){return {}} }
function empresaIdAtual(){ return getUser().empresaId || 'moven001'; }
function carregar(chave, padrao){ try{const v=JSON.parse(localStorage.getItem(chave)||'null'); return v ?? padrao}catch(e){return padrao} }
function salvar(chave, valor){ localStorage.setItem(chave, JSON.stringify(valor)); }

function setorPreparoProduto(produto){
  const categoria = String(produto?.categoria || '').toLowerCase();
  const nome = String(produto?.nome || '').toLowerCase();
  if(categoria.includes('bebida') || categoria.includes('drink') || nome.includes('coca') || nome.includes('água') || nome.includes('agua') || nome.includes('suco') || nome.includes('cerveja') || nome.includes('caipirinha')) return 'bar';
  return 'cozinha';
}

function mesasPadrao(){
  return Array.from({length:16},(_,i)=>({
    id:`MESA-${String(i+1).padStart(2,'0')}`,
    numero:i+1,
    status:'livre',
    garcom:'',
    pessoas:0,
    abertaEm:'',
    itens:[],
    total:0,
    empresaId:empresaIdAtual()
  }));
}

function numeroMesa(mesa){
  const direto = Number(mesa?.numero);
  if(Number.isFinite(direto) && direto > 0) return direto;
  const achado = String(mesa?.id || '').match(/(\d+)/);
  return achado ? Number(achado[1]) : 0;
}

function normalizarMesa(mesa){
  const numero = numeroMesa(mesa);
  const id = mesa?.id || `MESA-${String(numero).padStart(2,'0')}`;
  const itens = Array.isArray(mesa?.itens) ? mesa.itens : [];
  const total = itens.length
    ? itens.reduce((s,i)=>s+Number(i.total || 0),0)
    : Number(mesa?.total || 0);

  return {
    ...mesa,
    id,
    numero,
    status: mesa?.status || (itens.length ? 'ocupada' : 'livre'),
    garcom: mesa?.garcom || '',
    pessoas: Number(mesa?.pessoas || 0),
    abertaEm: mesa?.abertaEm || '',
    itens,
    total,
    empresaId: mesa?.empresaId || empresaIdAtual()
  };
}

function combinarMesas(...listas){
  const map = new Map();
  listas.flat().filter(Boolean).forEach(mesaOriginal => {
    const mesa = normalizarMesa(mesaOriginal);
    if(!mesa.numero) return;
    const anterior = map.get(mesa.numero) || {};
    // A lista que vem depois tem prioridade. Assim as mesas criadas na tela Mesas/Firebase
    // entram no Garçom Mobile sem limitar em 16.
    map.set(mesa.numero, normalizarMesa({...anterior, ...mesa}));
  });
  return Array.from(map.values()).sort((a,b)=>Number(a.numero)-Number(b.numero));
}

let mesasRoot = [];
let mesasEmpresa = [];

function atualizarMesasGarcom(){
  const selecionada = mesaSelect?.value || '';
  const local = carregar(MESAS_KEY, []);
  mesas = combinarMesas(mesasPadrao(), local, mesasRoot, mesasEmpresa);
  salvar(MESAS_KEY, mesas);
  renderMesasSelect();
  if(selecionada && mesaSelect && mesas.some(m=>String(m.id)===String(selecionada))){
    mesaSelect.value = selecionada;
  }
}


const cardapio = [
  {codigoInterno:'R001', nome:'X-Burger Artesanal', preco:24.90, categoria:'Lanches', estoque:999, img:'img/products_real/doritos96.png'},
  {codigoInterno:'R002', nome:'Porção de Batata', preco:18.00, categoria:'Pratos', estoque:999, img:'img/products_real/amendoim50.png'},
  {codigoInterno:'R003', nome:'Prato Executivo', preco:29.90, categoria:'Pratos', estoque:999, img:'img/products_real/lacta.png'},
  {codigoInterno:'R004', nome:'Pizza Broto', preco:32.00, categoria:'Pratos', estoque:999, img:'img/products_real/gelo5kg.png'},
  {codigoInterno:'R005', nome:'Coca-Cola 600ml', preco:6.50, categoria:'Bebidas', estoque:48, img:'img/products_real/coca600.png'},
  {codigoInterno:'R006', nome:'Água Mineral 500ml', preco:3.50, categoria:'Bebidas', estoque:35, img:'img/products_real/agua500.png'},
  {codigoInterno:'R007', nome:'Suco Natural', preco:9.00, categoria:'Bebidas', estoque:999, img:'img/products_real/schweppes350.png'},
  {codigoInterno:'R008', nome:'Sobremesa da Casa', preco:14.00, categoria:'Sobremesas', estoque:999, img:'img/products_real/lacta.png'}
];

let mesas = carregar(MESAS_KEY, mesasPadrao());
let pedido = [];
let categoria = 'Todos';

const mesaSelect = document.getElementById('mesaSelect');
const grid = document.getElementById('cardapioGrid');
const busca = document.getElementById('buscaProdutoGarcom');
const pedidoItens = document.getElementById('pedidoItens');
const pedidoTotal = document.getElementById('pedidoTotal');

function renderMesasSelect(){
  if(!mesaSelect) return;
  const selecionada = mesaSelect.value;
  mesas.sort((a,b)=>Number(a.numero)-Number(b.numero));
  mesaSelect.innerHTML = mesas.map(m=>`<option value="${m.id}">Mesa ${m.numero} - ${m.status || 'livre'} - ${brl(m.total || 0)}</option>`).join('');
  if(selecionada && mesas.some(m=>m.id===selecionada)) mesaSelect.value = selecionada;
}

function filtrarCardapio(){
  const termo = String(busca?.value || '').toLowerCase();
  return cardapio.filter(p => (categoria === 'Todos' || p.categoria === categoria) && (!termo || p.nome.toLowerCase().includes(termo)));
}

function renderCardapio(){
  if(!grid) return;
  const lista = filtrarCardapio();
  grid.innerHTML = lista.map((p)=>`
    <article class="product" data-codigo="${p.codigoInterno}">
      <div class="pic"><img src="${p.img}" alt="${p.nome}" onerror="this.src='img/products/coca.svg'"></div>
      <h4>${p.nome}</h4>
      <b>${brl(p.preco)}</b>
      <small>${p.categoria}</small>
    </article>
  `).join('');
  grid.querySelectorAll('.product').forEach(el=>el.addEventListener('click',()=>addItem(el.dataset.codigo)));
}

function addItem(codigo){
  const p = cardapio.find(x=>x.codigoInterno===codigo);
  if(!p) return;
  const item = pedido.find(x=>x.codigoInterno===codigo);
  if(item) item.qtd += 1;
  else pedido.push({...p, qtd:1, total:p.preco});
  renderPedido();
}

function renderPedido(){
  pedido.forEach(i=>i.total = Number(i.preco) * Number(i.qtd));
  pedidoItens.innerHTML = pedido.map((i,idx)=>`
    <div class="cart-row">
      <strong>${i.nome}</strong>
      <span>${i.qtd}</span>
      <b>${brl(i.total)}</b>
      <button data-i="${idx}" type="button">×</button>
    </div>
  `).join('');
  pedidoItens.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{pedido.splice(Number(btn.dataset.i),1); renderPedido();}));
  pedidoTotal.textContent = brl(pedido.reduce((s,i)=>s+i.total,0));
}

async function salvarMesaFirebase(mesa){
  const empresaId = empresaIdAtual();
  const payload = {...mesa, empresaId, atualizadoEm:new Date().toISOString(), servidor:serverTimestamp()};
  await setDoc(doc(db, 'mesas', mesa.id), payload, {merge:true});
  await setDoc(doc(db, 'empresas', empresaId, 'mesas', mesa.id), payload, {merge:true});
}

async function salvarPedidoFirebase(pedidoPayload){
  const empresaId = empresaIdAtual();
  const payload = {...pedidoPayload, empresaId, uid:auth.currentUser?.uid || '', servidor:serverTimestamp()};
  await setDoc(doc(db, 'pedidosRestaurante', pedidoPayload.id), payload, {merge:true});
  await setDoc(doc(db, 'empresas', empresaId, 'pedidosRestaurante', pedidoPayload.id), payload, {merge:true});
}

async function enviarPedido(){
  if(!mesaSelect.value){ alert('Escolha uma mesa.'); return; }
  if(!pedido.length){ alert('Adicione itens ao pedido.'); return; }

  const mesa = mesas.find(m=>m.id===mesaSelect.value);
  if(!mesa){ alert('Mesa não encontrada.'); return; }

  const user = getUser();
  const obs = document.getElementById('obsPedido')?.value || '';
  const payload = {
    id:`PED-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    mesaId: mesa.id,
    mesaNumero: mesa.numero,
    garcom: user.nome || user.email || 'Garçom',
    data:new Date().toISOString(),
    status:'aguardando',
    obs,
    itens: pedido.map(i=>({...i, setorPreparo: i.setorPreparo || setorPreparoProduto(i)})),
    total: pedido.reduce((s,i)=>s+i.total,0),
    empresaId: empresaIdAtual()
  };

  mesa.status = 'ocupada';
  mesa.garcom = payload.garcom;
  mesa.abertaEm = mesa.abertaEm || new Date().toISOString();
  mesa.itens = [...(mesa.itens || []), ...payload.itens.map(i=>({...i, obs, pedidoId:payload.id}))];
  mesa.total = mesa.itens.reduce((s,i)=>s+Number(i.total||0),0);
  mesa.empresaId = empresaIdAtual();

  const pedidos = carregar(PEDIDOS_KEY, []);
  pedidos.unshift(payload);
  salvar(PEDIDOS_KEY, pedidos.slice(0,1000));
  salvar(MESAS_KEY, mesas);

  try{
    await salvarMesaFirebase(mesa);
    await salvarPedidoFirebase(payload);
    alert(`Pedido enviado. Bebidas vão para o Bar e comidas para a Cozinha. Mesa ${mesa.numero} • ${brl(payload.total)}`);
  }catch(e){
    console.error(e);
    alert('Pedido salvo localmente, mas não sincronizou no Firebase. Erro: ' + (e.code || e.message || e));
  }

  pedido = [];
  document.getElementById('obsPedido').value = '';
  renderMesasSelect();
  renderPedido();
}

function escutarMesas(){
  try{
    const empresaId = empresaIdAtual();

    const qRoot = query(collection(db, 'mesas'), where('empresaId', '==', empresaId));
    onSnapshot(qRoot, (snap)=>{
      mesasRoot = snap.docs.map(d=>({id:d.id, ...d.data()}));
      atualizarMesasGarcom();
    }, (err)=>console.warn('Falha ao escutar mesas raiz:', err));

    onSnapshot(collection(db, 'empresas', empresaId, 'mesas'), (snap)=>{
      mesasEmpresa = snap.docs.map(d=>({id:d.id, ...d.data()}));
      atualizarMesasGarcom();
    }, (err)=>console.warn('Falha ao escutar mesas da empresa:', err));
  }catch(e){ console.warn(e); }
}

document.querySelectorAll('.chips button').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.chips button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  categoria = btn.dataset.cat || btn.textContent.trim();
  renderCardapio();
}));
busca?.addEventListener('input', renderCardapio);
document.getElementById('btnEnviarPedido')?.addEventListener('click', enviarPedido);

atualizarMesasGarcom();
renderCardapio();
renderPedido();
escutarMesas();
