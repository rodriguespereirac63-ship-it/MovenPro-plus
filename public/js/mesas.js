import './dashboard.js';
import { auth, db } from './firebase.js';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const MESAS_KEY = 'movenproPlusMesas';
const PEDIDOS_KEY = 'movenproPlusPedidos';

function brl(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function getUser(){ try{return JSON.parse(localStorage.getItem('movenproUser') || '{}') || {}}catch(e){return {}} }
function empresaIdAtual(){ return getUser().empresaId || 'moven001'; }
function carregar(chave, padrao){ try{const v=JSON.parse(localStorage.getItem(chave)||'null'); return v ?? padrao}catch(e){return padrao} }
function salvar(chave, valor){ localStorage.setItem(chave, JSON.stringify(valor)); }

function mesasPadrao(){
  return Array.from({length: 16}, (_,i)=>({
    id: `MESA-${String(i+1).padStart(2,'0')}`,
    numero: i+1,
    status: 'livre',
    garcom: '',
    pessoas: 0,
    abertaEm: '',
    itens: [],
    total: 0,
    empresaId: empresaIdAtual()
  }));
}

let mesas = carregar(MESAS_KEY, mesasPadrao());
let pedidos = carregar(PEDIDOS_KEY, []);
let mesaSelecionada = null;

const grid = document.getElementById('gridMesas');
const detalhe = document.getElementById('mesaDetalhe');
const fila = document.getElementById('filaCozinha');

function statusLabel(status){
  if(status === 'livre') return '🟢 Livre';
  if(status === 'fechamento') return '🔵 Fechamento';
  return '🟡 Ocupada';
}

function recalcularMesa(mesa){
  mesa.total = (mesa.itens || []).reduce((s,i)=>s + Number(i.total || 0), 0);
  if((mesa.itens || []).length && mesa.status === 'livre') mesa.status = 'ocupada';
  if(!(mesa.itens || []).length && mesa.status !== 'fechamento') mesa.status = 'livre';
  mesa.empresaId = mesa.empresaId || empresaIdAtual();
  return mesa;
}

function salvarMesas(){
  mesas = mesas.map(recalcularMesa);
  salvar(MESAS_KEY, mesas);
}

async function salvarMesaFirebase(mesa){
  const empresaId = empresaIdAtual();
  const payload = {...recalcularMesa(mesa), empresaId, atualizadoEm:new Date().toISOString(), uid:auth.currentUser?.uid || '', servidor:serverTimestamp()};
  await setDoc(doc(db, 'mesas', mesa.id), payload, {merge:true});
  await setDoc(doc(db, 'empresas', empresaId, 'mesas', mesa.id), payload, {merge:true});
}

async function fecharPedidosDaMesa(mesa, statusFinal='fechado'){
  const empresaId = empresaIdAtual();
  const ids = Array.from(new Set((mesa?.itens || []).map(i => i.pedidoId).filter(Boolean)));
  if(!ids.length) return;
  await Promise.all(ids.map(async (id)=>{
    const payload = {
      status: statusFinal,
      fechadoEm: new Date().toISOString(),
      empresaId,
      uidFechamento: auth.currentUser?.uid || '',
      servidorFechamento: serverTimestamp()
    };
    await setDoc(doc(db, 'pedidosRestaurante', id), payload, {merge:true});
    await setDoc(doc(db, 'empresas', empresaId, 'pedidosRestaurante', id), payload, {merge:true});
  }));
}

function renderMetricas(){
  const livres = mesas.filter(m=>m.status==='livre').length;
  const ocupadas = mesas.filter(m=>m.status !== 'livre').length;
  const emPreparo = pedidos.filter(p=>p.status==='aguardando' || p.status==='preparo').length;
  const consumo = mesas.reduce((s,m)=>s+Number(m.total||0),0);
  document.getElementById('mesasLivres').textContent = livres;
  document.getElementById('mesasOcupadas').textContent = ocupadas;
  document.getElementById('pedidosPreparo').textContent = emPreparo;
  document.getElementById('consumoAberto').textContent = brl(consumo);
}


function aplicarPedidosNasMesas(){
  const pedidosAtivos = pedidos.filter(p => !['cancelado','fechado','pago','finalizado'].includes(String(p.status || '').toLowerCase()));

  pedidosAtivos.forEach(pedido => {
    let mesa = mesas.find(m => String(m.id) === String(pedido.mesaId) || String(m.numero) === String(pedido.mesaNumero));

    if(!mesa){
      mesa = {
        id: pedido.mesaId || `MESA-${String(pedido.mesaNumero).padStart(2,'0')}`,
        numero: pedido.mesaNumero || 0,
        status: 'ocupada',
        garcom: pedido.garcom || '',
        pessoas: 0,
        abertaEm: pedido.data || new Date().toISOString(),
        itens: [],
        total: 0,
        empresaId: pedido.empresaId || empresaIdAtual()
      };
      mesas.push(mesa);
    }

    mesa.status = ['pronto','entregue'].includes(String(pedido.status || '').toLowerCase()) ? 'fechamento' : 'ocupada';
    mesa.garcom = mesa.garcom || pedido.garcom || '';
    mesa.abertaEm = mesa.abertaEm || pedido.data || new Date().toISOString();

    const itensMesa = mesa.itens || [];
    (pedido.itens || []).forEach(item => {
      const jaExiste = itensMesa.some(i =>
        String(i.pedidoId || '') === String(pedido.id) &&
        String(i.codigoInterno || i.nome) === String(item.codigoInterno || item.nome)
      );

      if(!jaExiste){
        itensMesa.push({
          ...item,
          pedidoId: pedido.id,
          obs: pedido.obs || item.obs || ''
        });
      }
    });

    mesa.itens = itensMesa;
    mesa.total = mesa.itens.reduce((s,i)=>s+Number(i.total||0),0);
    mesa.empresaId = mesa.empresaId || empresaIdAtual();
  });

  salvarMesas();
}

function renderMesas(){
  if(!grid) return;
  salvarMesas();
  const filtro = document.getElementById('filtroMesas')?.value || 'todas';
  const lista = mesas
    .filter(m => filtro === 'todas' || m.status === filtro)
    .sort((a,b)=>Number(a.numero)-Number(b.numero));

  grid.innerHTML = lista.map(m => `
    <button class="mesa-card ${m.status}" data-id="${m.id}" type="button">
      <strong>Mesa ${m.numero}</strong>
      <span>${statusLabel(m.status)}</span>
      <small>${(m.itens || []).length} itens</small>
      <b>${brl(m.total)}</b>
    </button>
  `).join('');
  grid.querySelectorAll('.mesa-card').forEach(btn=>btn.addEventListener('click',()=>selecionarMesa(btn.dataset.id)));
  renderMetricas();
}

function selecionarMesa(id){
  mesaSelecionada = mesas.find(m=>m.id===id);
  if(!mesaSelecionada) return;
  renderDetalhe();
}

function renderDetalhe(){
  const m = mesaSelecionada;
  if(!m){ detalhe.innerHTML = 'Selecione uma mesa para ver os detalhes.'; return; }
  detalhe.innerHTML = `
    <div class="mesa-selected-head">
      <h2>Mesa ${m.numero}</h2>
      <span>${statusLabel(m.status)}</span>
    </div>
    <p><b>Garçom:</b> ${m.garcom || 'Não informado'} • <b>Pessoas:</b> ${m.pessoas || 0}</p>
    <div class="finance-list">
      ${(m.itens||[]).map(i=>`<div><span>${i.qtd}x ${i.nome}</span><strong>${brl(i.total)}</strong><small>${i.obs || ''}</small></div>`).join('') || '<p>Nenhum item lançado.</p>'}
    </div>
    <h3>Total: ${brl(m.total)}</h3>
    <div class="mesa-actions">
      <button id="btnAbrirMesa" class="btn-primary" type="button">Abrir/editar mesa</button>
      <button id="btnPagarMesaDetalhe" class="btn-primary" type="button">Conferir / Pagar</button>
      <button id="btnMarcarFechamento" class="stock-filter-btn" type="button">Aguardar fechamento</button>
      <button id="btnLimparMesa" class="stock-filter-btn danger" type="button">Liberar mesa</button>
    </div>
  `;
  document.getElementById('btnAbrirMesa')?.addEventListener('click', abrirEditarMesa);
  document.getElementById('btnPagarMesaDetalhe')?.addEventListener('click', abrirConferenciaPagamento);
  document.getElementById('btnMarcarFechamento')?.addEventListener('click', marcarFechamento);
  document.getElementById('btnLimparMesa')?.addEventListener('click', limparMesa);
}

async function abrirEditarMesa(){
  if(!mesaSelecionada) return;
  const pessoas = prompt('Quantidade de pessoas:', mesaSelecionada.pessoas || '2');
  if(pessoas === null) return;
  const garcom = prompt('Nome do garçom:', mesaSelecionada.garcom || getUser().nome || '');
  mesaSelecionada.pessoas = Number(pessoas || 0);
  mesaSelecionada.garcom = garcom || '';
  mesaSelecionada.abertaEm = mesaSelecionada.abertaEm || new Date().toISOString();
  mesaSelecionada.status = 'ocupada';
  salvarMesas();
  renderMesas(); renderDetalhe();
  await salvarMesaFirebase(mesaSelecionada);
}

async function enviarMesaParaPDV(){
  if(!mesaSelecionada || !mesaSelecionada.itens?.length){ alert('Mesa sem itens para enviar ao PDV.'); return; }
  mesaSelecionada.status = 'fechamento';
  salvarMesas();
  renderMesas(); renderDetalhe();
  await salvarMesaFirebase(mesaSelecionada);
  alert('Mesa enviada para fechamento no PDV.');
}

async function marcarFechamento(){
  if(!mesaSelecionada) return;
  mesaSelecionada.status = 'fechamento';
  salvarMesas();
  renderMesas(); renderDetalhe();
  await salvarMesaFirebase(mesaSelecionada);
}

async function limparMesa(){
  if(!mesaSelecionada) return;
  if(!confirm(`Liberar mesa ${mesaSelecionada.numero}?`)) return;
  await fecharPedidosDaMesa(mesaSelecionada, 'fechado');
  mesaSelecionada.status = 'livre';
  mesaSelecionada.itens = [];
  mesaSelecionada.total = 0;
  mesaSelecionada.pessoas = 0;
  mesaSelecionada.garcom = '';
  mesaSelecionada.abertaEm = '';
  salvarMesas();
  renderMesas(); renderDetalhe();
  await salvarMesaFirebase(mesaSelecionada);
}

function renderFila(){
  if(!fila) return;
  const lista = pedidos.filter(p=>p.status !== 'cancelado' && p.status !== 'entregue').slice(0,8);
  fila.innerHTML = lista.map(p=>`
    <div><span>Mesa ${p.mesaNumero} • ${p.itens.length} itens</span><strong>${p.status}</strong><small>${new Date(p.data).toLocaleTimeString('pt-BR')}</small></div>
  `).join('') || '<p>Nenhum pedido na fila.</p>';
}

function abrirFechamentoCaixaMesas(){
  const vendas = carregar('movenproVendas', []);
  const hoje = new Date().toISOString().slice(0,10);
  const lista = vendas.filter(v => String(v.data || '').slice(0,10) === hoje);
  const total = lista.reduce((s,v)=>s+Number(v.bruto||0),0);
  const mesasAbertas = mesas.filter(m=>m.status !== 'livre');
  let modal = document.getElementById('fechamentoCaixaMesasModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'fechamentoCaixaMesasModal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `<div class="price-modal product-modal">
      <button class="modal-close" id="closeFechamentoMesas" type="button">×</button>
      <h2>Fechamento de caixa</h2>
      <p class="modal-subtitle">Resumo do dia incluindo mesas abertas.</p>
      <div id="fechamentoMesasConteudo"></div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('closeFechamentoMesas').addEventListener('click',()=>modal.classList.remove('show'));
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('show'); });
  }
  document.getElementById('fechamentoMesasConteudo').innerHTML = `
    <section class="metric-grid">
      <article class="metric-card"><span>🧾</span><p>Total PDV</p><h2>${brl(total)}</h2><small>${lista.length} vendas</small></article>
      <article class="metric-card"><span>🍽️</span><p>Mesas abertas</p><h2>${mesasAbertas.length}</h2></article>
    </section>
    <article class="panel">
      <h3>Mesas ainda abertas</h3>
      <div class="finance-list">
        ${mesasAbertas.map(m=>`<div><span>Mesa ${m.numero}</span><strong>${brl(m.total)}</strong><small>${statusLabel(m.status)}</small></div>`).join('') || '<p>Nenhuma mesa aberta.</p>'}
      </div>
      <button id="btnIrPDVFechar" class="btn-primary" type="button">Ir para PDV / Caixa</button>
    </article>
  `;
  document.getElementById('btnIrPDVFechar')?.addEventListener('click',()=>{ window.location.href='vendas.html#caixa'; });
  modal.classList.add('show');
}

function abrirConferenciaPagamento(){
  if(!mesaSelecionada){ alert('Selecione uma mesa.'); return; }
  if(!mesaSelecionada.itens?.length){ alert('Mesa sem consumo.'); return; }

  let modal = document.getElementById('modalConferenciaMesa');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'modalConferenciaMesa';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="price-modal product-modal">
        <button class="modal-close" id="closeConferenciaMesa" type="button">×</button>
        <h2>Conferência de consumo</h2>
        <p class="modal-subtitle">Confira os produtos consumidos antes do pagamento.</p>
        <div id="conferenciaMesaConteudo"></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeConferenciaMesa').addEventListener('click',()=>modal.classList.remove('show'));
    modal.addEventListener('click',(e)=>{ if(e.target===modal) modal.classList.remove('show'); });
  }

  const subtotal = mesaSelecionada.itens.reduce((s,i)=>s+Number(i.total||0),0);

  document.getElementById('conferenciaMesaConteudo').innerHTML = `
    <div class="conferencia-lista">
      ${mesaSelecionada.itens.map(i=>`
        <div class="conferencia-item">
          <div><strong>${i.qtd}x ${i.nome}</strong><small>${i.obs || ''}</small></div>
          <b>${brl(i.total)}</b>
        </div>
      `).join('')}
    </div>
    <section class="metric-grid"><article class="metric-card"><span>🧾</span><p>Total da mesa</p><h2>${brl(subtotal)}</h2></article></section>
    <div class="pagamento-acoes">
      <button class="btn-primary" id="btnPagarDinheiro" type="button">💵 Dinheiro</button>
      <button class="btn-primary" id="btnPagarPix" type="button">📲 PIX</button>
      <button class="btn-primary" id="btnPagarCartao" type="button">💳 Cartão</button>
    </div>
    <div class="pagamento-acoes">
      <button class="stock-filter-btn" id="btnEmitirCupom" type="button">🧾 Emitir Cupom Fiscal</button>
      <button class="stock-filter-btn" id="btnEmitirNFe" type="button">📄 Emitir NF-e</button>
    </div>
  `;

  document.getElementById('btnPagarDinheiro')?.addEventListener('click',()=>finalizarMesaPagamento('Dinheiro'));
  document.getElementById('btnPagarPix')?.addEventListener('click',()=>finalizarMesaPagamento('PIX'));
  document.getElementById('btnPagarCartao')?.addEventListener('click',()=>finalizarMesaPagamento('Cartão'));
  document.getElementById('btnEmitirCupom')?.addEventListener('click',()=>alert('Cupom fiscal preparado para emissão padrão NFC-e.'));
  document.getElementById('btnEmitirNFe')?.addEventListener('click',()=>alert('NF-e/NFC-e preparada para integração fiscal.'));

  modal.classList.add('show');
}

async function finalizarMesaPagamento(forma){
  const vendas = carregar('movenproVendas', []);
  const venda = {
    id:'VENDA-MESA-'+Date.now(),
    mesa: mesaSelecionada.numero,
    forma,
    bruto: mesaSelecionada.total,
    data:new Date().toISOString(),
    itens:[...mesaSelecionada.itens],
    empresaId: empresaIdAtual(),
    tipo:'mesa'
  };
  vendas.unshift(venda);
  salvar('movenproVendas', vendas);

  try{
    await setDoc(doc(db, 'vendas', venda.id), {...venda, uid:auth.currentUser?.uid || '', servidor:serverTimestamp()}, {merge:true});
    await setDoc(doc(db, 'empresas', venda.empresaId, 'vendas', venda.id), {...venda, uid:auth.currentUser?.uid || '', servidor:serverTimestamp()}, {merge:true});
  }catch(e){ console.warn('Venda da mesa ficou local.', e); }

  await fecharPedidosDaMesa(mesaSelecionada, 'fechado');
  mesaSelecionada.status = 'livre';
  mesaSelecionada.itens = [];
  mesaSelecionada.total = 0;
  mesaSelecionada.garcom = '';
  mesaSelecionada.pessoas = 0;
  await salvarMesaFirebase(mesaSelecionada);

  salvarMesas();
  renderMesas();
  renderDetalhe();
  document.getElementById('modalConferenciaMesa')?.classList.remove('show');
  alert('Pagamento finalizado com sucesso via '+forma+'.');
}

async function criarMesasPadraoFirebase(){
  if(mesas.some(m=>m.empresaId === empresaIdAtual())) return;
  mesas = mesasPadrao();
  salvar(MESAS_KEY, mesas);
  renderMesas();
  for(const mesa of mesas){
    try{ await salvarMesaFirebase(mesa); }catch(e){}
  }
}

function juntarPorId(a, b){
  const map = new Map();
  [...a, ...b].forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}
function somenteMinhaEmpresa(lista){
  const emp = empresaIdAtual();
  return lista.filter(item => !item.empresaId || item.empresaId === emp);
}

let mesasRoot = [];
let mesasEmpresa = [];
let pedidosRoot = [];
let pedidosEmpresa = [];

function atualizarMesasCombinadas(){
  const selecionadaId = mesaSelecionada?.id;

  // Mantém o visual original com todas as mesas padrão e só aplica os dados do Firebase por cima.
  // Isso evita sumir botão/função de adicionar mesa ou aparecer somente a mesa que recebeu pedido.
  const local = carregar(MESAS_KEY, mesasPadrao());
  const basePadrao = mesasPadrao();
  const mesasFirebase = somenteMinhaEmpresa(juntarPorId(mesasRoot, mesasEmpresa));

  mesas = somenteMinhaEmpresa(juntarPorId(juntarPorId(basePadrao, local), mesasFirebase));

  if(pedidos.length){
    aplicarPedidosNasMesas();
  }else{
    salvar(MESAS_KEY, mesas);
  }

  if(selecionadaId) mesaSelecionada = mesas.find(m=>m.id===selecionadaId) || null;
  renderMesas();
  renderDetalhe();
  renderFila();
  renderMetricas();
}

function atualizarPedidosCombinados(){
  pedidos = somenteMinhaEmpresa(juntarPorId(pedidosRoot, pedidosEmpresa))
    .sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
  salvar(PEDIDOS_KEY, pedidos);
  aplicarPedidosNasMesas();
  renderMesas();
  renderDetalhe();
  renderFila();
  renderMetricas();
}

function escutarMesas(){
  onSnapshot(collection(db, 'mesas'), (snap)=>{
    mesasRoot = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarMesasCombinadas();
  }, err=>console.error('Erro ao carregar mesas raiz:', err));

  onSnapshot(collection(db, 'empresas', empresaIdAtual(), 'mesas'), (snap)=>{
    mesasEmpresa = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarMesasCombinadas();
  }, err=>console.warn('Erro ao carregar mesas da empresa:', err));
}

function escutarPedidos(){
  onSnapshot(collection(db, 'pedidosRestaurante'), (snap)=>{
    pedidosRoot = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarPedidosCombinados();
  }, err=>console.error('Erro ao carregar pedidos raiz:', err));

  onSnapshot(collection(db, 'empresas', empresaIdAtual(), 'pedidosRestaurante'), (snap)=>{
    pedidosEmpresa = snap.docs.map(d=>({id:d.id, ...d.data()}));
    atualizarPedidosCombinados();
  }, err=>console.warn('Erro ao carregar pedidos da empresa:', err));
}


function toggleFullscreenRestaurant(){
  document.documentElement.requestFullscreen?.();
  document.body.classList.add('fullscreen-mode');
}
document.addEventListener('fullscreenchange', ()=>{
  if(!document.fullscreenElement) document.body.classList.remove('fullscreen-mode');
});

document.getElementById('btnNovaMesa')?.addEventListener('click',async ()=>{
  const numero = prompt('Número da nova mesa:');
  if(!numero) return;
  if(mesas.some(m=>String(m.numero)===String(numero))){ alert('Mesa já existe.'); return; }
  const mesa = {id:`MESA-${numero}`, numero, status:'livre', garcom:'', pessoas:0, abertaEm:'', itens:[], total:0, empresaId:empresaIdAtual()};
  mesas.push(mesa);
  salvarMesas(); renderMesas();
  await salvarMesaFirebase(mesa);
});
document.getElementById('filtroMesas')?.addEventListener('change', renderMesas);
document.getElementById('btnFechamentoCaixaMesas')?.addEventListener('click', abrirFechamentoCaixaMesas);
document.getElementById('btnTelaCheiaMesaAtalho')?.addEventListener('click', toggleFullscreenRestaurant);
document.getElementById('btnConferirPagarMesa')?.addEventListener('click', abrirConferenciaPagamento);
document.getElementById('btnCaixaMesa')?.addEventListener('click', abrirFechamentoCaixaMesas);
document.getElementById('btnCancelarMesa')?.addEventListener('click', ()=>{ if(!mesaSelecionada){ alert('Selecione uma mesa primeiro.'); return; } limparMesa(); });
document.getElementById('btnDescontoMesa')?.addEventListener('click', ()=>alert('Desconto preparado para próxima etapa.'));
document.getElementById('btnClienteMesa')?.addEventListener('click', ()=>{
  if(!mesaSelecionada){ alert('Selecione uma mesa primeiro.'); return; }
  const cliente = prompt('Nome do cliente / responsável pela mesa:', mesaSelecionada.cliente || '');
  if(cliente === null) return;
  mesaSelecionada.cliente = cliente;
  salvarMesas(); renderDetalhe(); salvarMesaFirebase(mesaSelecionada);
});

renderMesas();
renderDetalhe();
renderFila();
escutarMesas();
escutarPedidos();
