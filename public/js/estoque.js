import './dashboard.js';
import { carregarColecaoEmpresa, empresaIdAtual, salvarDocumentoEmpresa } from './data-sync.js';

const produtosBase = [
  {id:'coca600', codigoInterno:'1001', nome:'Coca-Cola 600ml', categoria:'Bebidas', codigo:'7894900011517', qtd:48, minimo:20, validade:'2026-09-20', custo:4.10, venda:6.50, img:'img/products_real/coca600.png'},
  {id:'skol350', codigoInterno:'1002', nome:'Cerveja Skol Lata 350ml', categoria:'Bebidas', codigo:'7891149107419', qtd:12, minimo:36, validade:'2026-06-15', custo:2.45, venda:3.50, img:'img/products_real/skol350.png'},
  {id:'brahma350', codigoInterno:'1003', nome:'Cerveja Brahma Lata 350ml', categoria:'Bebidas', codigo:'7891991010851', qtd:30, minimo:24, validade:'2026-07-22', custo:2.45, venda:3.50, img:'img/products_real/brahma350.png'},
  {id:'agua500', codigoInterno:'1004', nome:'Água Mineral 500ml', categoria:'Bebidas', codigo:'7896336800116', qtd:35, minimo:30, validade:'2027-01-10', custo:0.85, venda:1.50, img:'img/products_real/agua500.png'},
  {id:'redbull250', codigoInterno:'1005', nome:'Energético Red Bull 250ml', categoria:'Bebidas', codigo:'9002490100070', qtd:8, minimo:20, validade:'2026-05-28', custo:7.20, venda:10.00, img:'img/products_real/redbull250.png'},
  {id:'marlboro', codigoInterno:'2001', nome:'Cigarro Marlboro', categoria:'Tabacaria', codigo:'7890000001001', qtd:18, minimo:12, validade:'2027-02-01', custo:12.00, venda:16.00, img:'img/products_real/marlboro.png'},
  {id:'derby', codigoInterno:'2002', nome:'Cigarro Derby', categoria:'Tabacaria', codigo:'7890000001002', qtd:16, minimo:12, validade:'2027-02-01', custo:10.50, venda:14.00, img:'img/products_real/derby.png'},
  {id:'doritos96', codigoInterno:'3001', nome:'Salg. Frito Doritos 96g', categoria:'Alimentos', codigo:'7892840815945', qtd:9, minimo:18, validade:'2026-05-18', custo:6.70, venda:9.50, img:'img/products_real/doritos96.png'},
  {id:'lacta90', codigoInterno:'3002', nome:'Chocolate Lacta 90g', categoria:'Doces', codigo:'7891000248799', qtd:50, minimo:25, validade:'2026-08-05', custo:4.65, venda:6.50, img:'img/products_real/lacta.png'},
  {id:'gelo5kg', codigoInterno:'4001', nome:'Gelo 5kg', categoria:'Outros', codigo:'7890000009001', qtd:28, minimo:10, validade:'2026-05-12', custo:4.50, venda:7.00, img:'img/products_real/gelo5kg.png'},
  {id:'heineken350', codigoInterno:'1006', nome:'Heineken Lata 350ml', categoria:'Bebidas', codigo:'7896045504703', qtd:30, minimo:24, validade:'2026-11-11', custo:4.20, venda:6.00, img:'img/products_real/heineken350.png'},
  {id:'schweppes350', codigoInterno:'1007', nome:'Schweppes Citrus 350ml', categoria:'Bebidas', codigo:'7894900030396', qtd:18, minimo:20, validade:'2026-06-01', custo:3.05, venda:4.50, img:'img/products_real/schweppes350.png'},
  {id:'trident', codigoInterno:'3003', nome:'Trident Unidade', categoria:'Doces', codigo:'7895800200000', qtd:42, minimo:25, validade:'2027-03-15', custo:1.55, venda:2.50, img:'img/products_real/trident.png'},
  {id:'amendoim50', codigoInterno:'3004', nome:'Amendoim Santa Helena 50g', categoria:'Alimentos', codigo:'7896336000073', qtd:40, minimo:20, validade:'2026-05-24', custo:1.90, venda:3.00, img:'img/products_real/amendoim50.png'},
  {id:'isqueiro', codigoInterno:'4002', nome:'Isqueiro BIC Unidade', categoria:'Utilidades', codigo:'7890000011001', qtd:25, minimo:15, validade:'2030-01-01', custo:2.60, venda:4.00, img:'img/products_real/isqueiro.png'}
];

const STORAGE_KEY = 'movenproProdutosEstoque';
let produtos = carregarProdutos();
let filtro = 'todos';
let produtoEditando = null;
let fotoNovoProduto = '';

const grid = document.getElementById('stockGrid');
const search = document.getElementById('stockSearch');
const alertPanel = document.getElementById('alertPanel');
const alertTitle = document.getElementById('alertTitle');
const alertList = document.getElementById('alertList');
const btnAddProduct = document.getElementById('btnAddProduct');
const usuario = JSON.parse(localStorage.getItem('movenproUser') || '{}');
const perfil = String(usuario.perfil || '').toLowerCase();
const isFuncionario = perfil === 'funcionario' || perfil === 'caixa';

function normalizarProduto(p, idx=0){
  return {
    ...p,
    id: p.id || p.codigoInterno || p.codigo || `produto-${idx}`,
    codigoInterno: p.codigoInterno || String(1001 + idx),
    codigo: p.codigo || '',
    img: p.img || imagemPadraoCategoria(p.categoria)
  };
}
function carregarProdutos(){
  try{
    const salvos = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if(Array.isArray(salvos) && salvos.length) return salvos.map(normalizarProduto);
  }catch(e){}
  return produtosBase.map(normalizarProduto);
}
function salvarProdutos(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos)); }
async function salvarProdutoOnline(p){
  try{
    if(!navigator.onLine) return false;
    const id = p.id || p.codigoInterno || slug(p.nome);
    await salvarDocumentoEmpresa('produtos', id, {...p, id, empresaId: empresaIdAtual()});
    return true;
  }catch(error){
    console.warn('Produto salvo localmente, mas não sincronizou no Firestore:', error);
    return false;
  }
}
async function carregarProdutosOnline(){
  const online = await carregarColecaoEmpresa('produtos', STORAGE_KEY, produtosBase);
  if(Array.isArray(online) && online.length){
    produtos = online.map(normalizarProduto);
    salvarProdutos();
    render();
  }
}
function brl(v){ return (Number(v || 0)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function numeroBR(valor){ if(typeof valor === 'number') return valor; return Number(String(valor || '').replace(/\./g,'').replace(',','.')) || 0; }
function diasAte(data){ const hoje = new Date(); hoje.setHours(0,0,0,0); const alvo = new Date((data || '2099-01-01')+'T00:00:00'); return Math.ceil((alvo-hoje)/(1000*60*60*24)); }
function margem(p){ const custo = Number(p.custo || 0); const venda = Number(p.venda || 0); if(custo <= 0) return 0; return ((venda - custo) / custo) * 100; }


function contasFixasMensais(){
  try{
    const contas = JSON.parse(localStorage.getItem('movenpro_contas_fixas') || '[]');
    return contas.reduce((s,c)=>s + Number(c.valor || 0), 0) || 6290;
  }catch(e){ return 6290; }
}

function vendasMensaisProduto(p){
  return Math.max(1, Math.round(vendaMediaDiaria(p) * 30));
}

function configuracaoCategoria(cat=''){
  const c = String(cat).toLowerCase();

  if(c.includes('bebida')){
    return {min:12, ideal:18, premium:28, pesoFixo:0.45};
  }
  if(c.includes('tabac')){
    return {min:6, ideal:10, premium:16, pesoFixo:0.20};
  }
  if(c.includes('doce')){
    return {min:25, ideal:38, premium:55, pesoFixo:0.70};
  }
  if(c.includes('util')){
    return {min:35, ideal:50, premium:75, pesoFixo:1};
  }

  return {min:18, ideal:28, premium:45, pesoFixo:0.60};
}

function rateioFixoProduto(p){
  const totalFixas = contasFixasMensais();
  const totalMovimento = Math.max(1, produtos.reduce((s,item)=>s + vendasMensaisProduto(item),0));
  const categoria = configuracaoCategoria(p.categoria);
  const base = totalFixas / totalMovimento;
  return base * categoria.pesoFixo;
}

function statusPrecoProduto(p, precoIdeal){
  const venda = Number(p.venda || 0);

  if(venda < precoIdeal * 0.90){
    return {texto:'🔴 preço baixo', cls:'red'};
  }
  if(venda < precoIdeal){
    return {texto:'🟡 lucro apertado', cls:'warning'};
  }
  if(venda <= precoIdeal * 1.15){
    return {texto:'🟢 saudável', cls:'green'};
  }
  return {texto:'🔵 premium', cls:'blue'};
}

function markupAutomaticoProduto(p){
  const custo = Number(p.custo || 0);
  const categoria = configuracaoCategoria(p.categoria);

  const imposto = Number(p.impostoPercentual ? 6) / 100;
  const taxa = Number(p.taxaRecebimentoPercentual ? 2.49) / 100;
  const perdas = Number(p.perdasPercentual ? 2) / 100;

  const fixoUn = rateioFixoProduto(p);

  function calcularPreco(margem){
    const margemValor = margem / 100;
    const divisor = 1 - (imposto + taxa + perdas + margemValor);
    return divisor > 0
      ? (custo + fixoUn) / divisor
      : (custo + fixoUn) * 2;
  }

  const precoMin = calcularPreco(categoria.min);
  const precoIdeal = calcularPreco(categoria.ideal);
  const precoPremium = calcularPreco(categoria.premium);

  const status = statusPrecoProduto(p, precoIdeal);

  return {
    fixoUn,
    precoMin,
    precoIdeal,
    precoPremium,
    status,
    margemAtual: custo > 0
      ? ((Number(p.venda || 0) - custo - fixoUn) / custo) * 100
      : 0
  };
}

function classeMarkup(auto){
  return auto.status.cls || 'green';
}


function statusProduto(p){ const validade = diasAte(p.validade); if (p.qtd <= p.minimo) return {txt:'Estoque baixo', cls:'danger'}; if (validade <= 30) return {txt:'Validade próxima', cls:'warning'}; return {txt:'Normal', cls:'ok'}; }
function imagemPadraoCategoria(cat=''){
  const c = String(cat).toLowerCase();
  if(c.includes('bebida')) return 'img/products/agua.svg';
  if(c.includes('alimento')) return 'img/products/amendoim.svg';
  if(c.includes('doce')) return 'img/products/bis.svg';
  return 'img/products/coca.svg';
}
function gerarCodigoInterno(){
  const nums = produtos.map(p => Number(p.codigoInterno)).filter(n => Number.isFinite(n));
  return String((nums.length ? Math.max(...nums) : 1000) + 1);
}
function slug(texto){ return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'produto'; }
function listaFiltrada(){
  const termo = (search?.value || '').toLowerCase().trim();
  return produtos.filter(p => {
    const campos = [p.nome,p.categoria,p.codigo,p.codigoInterno];
    const bateTermo = !termo || campos.some(v => String(v || '').toLowerCase().includes(termo));
    const validade = diasAte(p.validade);
    const bateFiltro = filtro === 'todos' || (filtro === 'baixo' && p.qtd <= p.minimo) || (filtro === 'validade' && validade <= 30);
    return bateTermo && bateFiltro;
  });
}
function renderResumo(){
  const baixos = produtos.filter(p=>p.qtd <= p.minimo);
  const validade = produtos.filter(p=>diasAte(p.validade) <= 30);
  const valor = produtos.reduce((s,p)=>s + (Number(p.qtd)||0)*(Number(p.custo)||0),0);
  document.getElementById('totalProdutos').textContent = produtos.length;
  document.getElementById('totalBaixo').textContent = baixos.length;
  document.getElementById('totalValidade').textContent = validade.length;
  document.getElementById('valorEstoque').textContent = brl(valor);
}
function renderAlertas(){
  if(!alertPanel) return;
  if(filtro === 'todos') { alertPanel.hidden = true; return; }
  let lista = [];
  let titulo = 'Produtos';
  if(filtro === 'baixo'){ lista = produtos.filter(p=>p.qtd<=p.minimo); titulo = 'Produtos com estoque baixo'; }
  else if(filtro === 'validade'){ lista = produtos.filter(p=>diasAte(p.validade)<=30); titulo = 'Produtos com validade próxima'; }
  else if(filtro === 'parados'){ lista = produtos.filter(p=>diasParado(p)>=15); titulo = 'Produtos parados'; }
  else if(filtro === 'sugestao'){ lista = produtos.filter(p=>sugestaoCompra(p)>0); titulo = 'Sugestão de compra inteligente'; }
  alertPanel.hidden = false;
  alertTitle.textContent = titulo;
  alertList.innerHTML = lista.map(p => `<div><strong>${p.nome}</strong><span>${textoFiltro(p)}</span></div>`).join('') || '<p>Nenhum produto encontrado.</p>';
}
/* ===== MovenPro V13 Estoque Inteligente ===== */
function ultimaVendaProduto(p){
  const mapa = { '1001':2, '1002':4, '1003':9, '1004':1, '1005':18, '2001':3, '2002':16, '3001':22, '3002':6, '4001':1, '1006':11, '1007':31, '3003':7, '3004':20, '4002':15 };
  const dias = mapa[String(p.codigoInterno)] ? 10;
  const d = new Date(); d.setDate(d.getDate() - dias); return d;
}
function diasParado(p){ const d = ultimaVendaProduto(p); return Math.floor((new Date() - d)/(1000*60*60*24)); }
function vendaMediaDiaria(p){
  const mapa = { '1001':6, '1002':5, '1003':3, '1004':4, '1005':1, '2001':2, '2002':1, '3001':1, '3002':3, '4001':4, '1006':2, '1007':0.5, '3003':2, '3004':1, '4002':1 };
  return mapa[String(p.codigoInterno)] ? 1;
}
function sugestaoCompra(p){
  const necessidade = Math.ceil(vendaMediaDiaria(p) * 7 + Number(p.minimo||0) - Number(p.qtd||0));
  return Math.max(0, necessidade);
}
function textoFiltro(p){
  if(filtro === 'baixo') return `${p.qtd} un / mínimo ${p.minimo}`;
  if(filtro === 'validade') return `vence em ${Math.max(diasAte(p.validade),0)} dias`;
  if(filtro === 'parados') return `${diasParado(p)} dias sem venda`;
  if(filtro === 'sugestao') return `comprar ${sugestaoCompra(p)} un`;
  return '';
}
function abrirHistoricoProduto(id){
  const p = produtos.find(x=>x.id===id); if(!p) return;
  let modal = document.getElementById('historicoModal');
  if(!modal){ modal = document.createElement('div'); modal.id='historicoModal'; modal.className='modal-backdrop'; modal.innerHTML = `<div class="price-modal product-modal"><button class="modal-close" id="closeHistoricoModal" type="button">×</button><h2>Histórico do produto</h2><div id="historicoConteudo"></div></div>`; document.body.appendChild(modal); document.getElementById('closeHistoricoModal').addEventListener('click',()=>modal.classList.remove('show')); modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('show'); }); }
  const m = margem(p).toFixed(1);
  document.getElementById('historicoConteudo').innerHTML = `<p class="modal-subtitle">${p.nome} • cód. ${p.codigoInterno}</p><section class="metric-grid"><article class="metric-card"><span>🛒</span><p>Última venda</p><h2>${ultimaVendaProduto(p).toLocaleDateString('pt-BR')}</h2><small>${diasParado(p)} dias</small></article><article class="metric-card"><span>📦</span><p>Última compra</p><h2>20/04/2026</h2><small>Fornecedor padrão</small></article><article class="metric-card"><span>💰</span><p>Margem</p><h2>${m}%</h2><small>custo ${brl(p.custo)}</small></article><article class="metric-card"><span>🏷️</span><p>Markup IA</p><h2>${brl(markupAutomaticoProduto(p).precoIdeal)}</h2><small>${markupAutomaticoProduto(p).status.texto}</small></article><article class="metric-card"><span>📈</span><p>Vendido no mês</p><h2>${Math.round(vendaMediaDiaria(p)*30)} un</h2><small>sugestão comprar ${sugestaoCompra(p)} un</small></article></section><div class="panel"><h3>Movimentações</h3><p>Entrada XML/manual: +24 un</p><p>Venda balcão: -3 un</p><p>Alteração preço venda: ${brl(p.venda)}</p></div>`;
  modal.classList.add('show');
}
function render(){
  if(!grid) return;
  const lista = listaFiltrada();
  grid.innerHTML = lista.map(p => {
    const st = statusProduto(p);
    const margemAtual = margem(p);
    return `<article class="stock-card" data-produto-id="${p.id}">
      ${isFuncionario ? '' : `<button class="btn-delete-stock" data-id="${p.id}" title="Excluir produto" type="button">×</button>`}
      <div class="stock-img"><img src="${p.img}" alt="${p.nome}" onerror="this.src='img/products/coca.svg'"></div>
      <div class="stock-info">
        <span class="stock-status ${st.cls}">${st.txt}</span>
        <h3>${p.nome}</h3>
        <p>${p.categoria} • cód. interno <b>${p.codigoInterno}</b>${p.codigo ? ` • barras ${p.codigo}` : ''}</p>
        <div class="stock-numbers">
          <span><b>${p.qtd}</b><small>quantidade</small></span>
          <span><b>${p.minimo}</b><small>mínimo</small></span>
          <span><b>${new Date((p.validade || '2099-01-01')+'T00:00:00').toLocaleDateString('pt-BR')}</b><small>validade</small></span>
        </div>
        <div class="price-row">
          <span>Entrada <b>${brl(p.custo)}</b></span>
          <span>Venda <b>${brl(p.venda)}</b></span>
          <span>Margem <b>${margemAtual.toFixed(1)}%</b></span>
          <span class="markup-auto ${classeMarkup(markupAutomaticoProduto(p))}">
            Markup IA
            <b>${brl(markupAutomaticoProduto(p).precoIdeal)}</b>
            <small>
              mín ${brl(markupAutomaticoProduto(p).precoMin)} • premium ${brl(markupAutomaticoProduto(p).precoPremium)}
            </small>
            <small>${markupAutomaticoProduto(p).status.texto}</small>
          </span>
        </div>
        ${isFuncionario ? '' : `<div class="admin-actions"><button class="btn-editar-preco" data-id="${p.id}">Alterar preço de venda</button><button class="btn-aplicar-markup" data-id="${p.id}" type="button">Aplicar markup</button><button class="btn-historico" data-id="${p.id}" type="button">Histórico</button></div>`}
      </div>
    </article>`;
  }).join('') || '<article class="panel"><h3>Nenhum produto encontrado</h3></article>';
  document.querySelectorAll('.btn-editar-preco').forEach(btn => btn.addEventListener('click', () => abrirModalPreco(btn.dataset.id)));
  document.querySelectorAll('.btn-aplicar-markup').forEach(btn => btn.addEventListener('click', () => aplicarMarkupProduto(btn.dataset.id)));
  document.querySelectorAll('.btn-historico').forEach(btn => btn.addEventListener('click', () => abrirHistoricoProduto(btn.dataset.id)));
  document.querySelectorAll('.btn-delete-stock').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); excluirProduto(btn.dataset.id); }));
  const tp = document.getElementById('totalParados'); if(tp) tp.textContent = String(produtos.filter(p=>diasParado(p)>=15).length);
  renderResumo(); renderAlertas();
}


function excluirProduto(id){
  if(isFuncionario) return;
  const p = produtos.find(x=>x.id===id);
  if(!p) return;

  const confirmar = confirm(`Excluir produto do estoque?\n\n${p.nome}\n\nEssa ação remove o produto da lista local.`);
  if(!confirmar) return;

  produtos = produtos.filter(x=>x.id!==id);

  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
    localStorage.setItem('movenproProdutosEstoque', JSON.stringify(produtos));
    localStorage.setItem('movenproProdutos', JSON.stringify(produtos));
  }catch(e){
    console.warn('Erro ao salvar exclusão do produto:', e);
  }

  render();
  alert('Produto excluído com sucesso.');
}

function aplicarMarkupProduto(id){
  if(isFuncionario) return;
  const p = produtos.find(x=>x.id===id);
  if(!p) return;
  const auto = markupAutomaticoProduto(p);
  const confirmar = confirm(`Aplicar preço sugerido pelo markup automático?\n\n${p.nome}\nPreço atual: ${brl(p.venda)}\nPreço sugerido: ${brl(auto.precoSugerido)}\nCusto fixo rateado: ${brl(auto.fixoUn)}`);
  if(!confirmar) return;
  p.venda = Number(auto.precoIdeal.toFixed(2));
  salvarProdutos();
  render();
}

function criarModalPreco(){
  if(document.getElementById('priceModal')) return;
  const modal = document.createElement('div');
  modal.id = 'priceModal'; modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="price-modal" role="dialog" aria-modal="true">
    <button class="modal-close" id="closePriceModal" type="button">×</button>
    <h2>Alterar preço de venda</h2><p id="modalProdutoNome" class="modal-subtitle">Produto</p>
    <div class="modal-field"><label>Preço de entrada automático</label><input id="modalCusto" type="text" disabled><small>Atualizado pela última entrada/XML da nota.</small></div>
    <div class="modal-field"><label>Novo preço de venda</label><input id="modalVenda" type="text" inputmode="decimal" placeholder="Ex: 5,50"></div>
    <div class="margin-preview"><span>Margem automática</span><strong id="modalMargem">0%</strong></div>
    <div class="modal-actions"><button id="cancelPriceModal" type="button" class="muted-action">Cancelar</button><button id="savePriceModal" type="button" class="btn-login">Salvar preço</button></div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('closePriceModal').addEventListener('click', fecharModalPreco);
  document.getElementById('cancelPriceModal').addEventListener('click', fecharModalPreco);
  document.getElementById('savePriceModal').addEventListener('click', salvarPrecoVenda);
  document.getElementById('modalVenda').addEventListener('input', atualizarMargemModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) fecharModalPreco(); });
}
function abrirModalPreco(id){
  if(isFuncionario) return;
  criarModalPreco(); produtoEditando = produtos.find(p => p.id === id); if(!produtoEditando) return;
  document.getElementById('modalProdutoNome').textContent = `${produtoEditando.nome} • cód. ${produtoEditando.codigoInterno}`;
  document.getElementById('modalCusto').value = brl(produtoEditando.custo);
  document.getElementById('modalVenda').value = Number(produtoEditando.venda).toFixed(2).replace('.', ',');
  atualizarMargemModal(); document.getElementById('priceModal').classList.add('show'); setTimeout(()=>document.getElementById('modalVenda').focus(), 50);
}
function fecharModalPreco(){ const modal = document.getElementById('priceModal'); if(modal) modal.classList.remove('show'); produtoEditando = null; }
function atualizarMargemModal(){ if(!produtoEditando) return; const venda = numeroBR(document.getElementById('modalVenda').value); const custo = Number(produtoEditando.custo || 0); const margemCalculada = custo > 0 ? ((venda - custo) / custo) * 100 : 0; document.getElementById('modalMargem').textContent = `${margemCalculada.toFixed(1)}%`; }
function salvarPrecoVenda(){
  if(!produtoEditando) return; const venda = numeroBR(document.getElementById('modalVenda').value);
  if(venda <= 0){ alert('Informe um preço de venda válido.'); return; }
  produtoEditando.venda = venda;
  produtoEditando.atualizadoEm = new Date().toISOString();
  salvarProdutos();
  salvarProdutoOnline(produtoEditando);
  fecharModalPreco(); render(); alert(`Preço atualizado com sucesso. Nova margem: ${margem(produtoEditando).toFixed(1)}%`);
}
function criarModalProduto(){
  if(document.getElementById('productModal')) return;
  const modal = document.createElement('div'); modal.id = 'productModal'; modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="price-modal product-modal" role="dialog" aria-modal="true">
    <button class="modal-close" id="closeProductModal" type="button">×</button>
    <h2>Adicionar produto manual</h2><p class="modal-subtitle">Use quando o produto não vier pelo XML.</p>
    <div class="form-grid modal-grid">
      <div class="modal-field"><label>Nome do produto</label><input id="newNome" type="text" placeholder="Ex: Carvão 3kg"></div>
      <div class="modal-field"><label>Código interno fácil</label><input id="newCodigoInterno" type="text"></div>
      <div class="modal-field"><label>Código de barras (opcional)</label><input id="newCodigoBarras" type="text" placeholder="EAN/código de barras"></div>
      <div class="modal-field"><label>Categoria</label><input id="newCategoria" type="text" placeholder="Bebidas, Alimentos, Outros..."></div>
      <div class="modal-field"><label>Preço de entrada</label><input id="newCusto" type="text" inputmode="decimal" placeholder="Ex: 3,20"></div>
      <div class="modal-field"><label>Preço de venda</label><input id="newVenda" type="text" inputmode="decimal" placeholder="Ex: 5,00"></div>
      <div class="modal-field"><label>Quantidade inicial</label><input id="newQtd" type="number" min="0" value="0"></div>
      <div class="modal-field"><label>Estoque mínimo</label><input id="newMinimo" type="number" min="0" value="5"></div>
      <div class="modal-field"><label>Validade</label><input id="newValidade" type="date"></div>
      <div class="modal-field"><label>Foto do produto</label><input id="newFoto" type="file" accept="image/*"><small>Opcional. Se não enviar, o sistema usa uma imagem padrão.</small></div>
    </div>
    <div class="margin-preview"><span>Margem automática</span><strong id="newMargem">0%</strong></div>
    <div class="modal-actions"><button id="cancelProductModal" type="button" class="muted-action">Cancelar</button><button id="saveProductModal" type="button" class="btn-login">Salvar produto</button></div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('closeProductModal').addEventListener('click', fecharModalProduto);
  document.getElementById('cancelProductModal').addEventListener('click', fecharModalProduto);
  document.getElementById('saveProductModal').addEventListener('click', salvarNovoProduto);
  ['newCusto','newVenda'].forEach(id => document.getElementById(id).addEventListener('input', atualizarMargemNovo));
  document.getElementById('newFoto').addEventListener('change', carregarFotoNovoProduto);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) fecharModalProduto(); });
}
function abrirModalProduto(){
  if(isFuncionario) return;
  criarModalProduto(); fotoNovoProduto = '';
  document.getElementById('newCodigoInterno').value = gerarCodigoInterno();
  document.getElementById('newNome').value = ''; document.getElementById('newCodigoBarras').value = ''; document.getElementById('newCategoria').value = 'Outros';
  document.getElementById('newCusto').value = ''; document.getElementById('newVenda').value = ''; document.getElementById('newQtd').value = 0; document.getElementById('newMinimo').value = 5; document.getElementById('newValidade').value = '';
  document.getElementById('newMargem').textContent = '0%'; document.getElementById('productModal').classList.add('show'); setTimeout(()=>document.getElementById('newNome').focus(), 50);
}
function fecharModalProduto(){ const modal = document.getElementById('productModal'); if(modal) modal.classList.remove('show'); }
function atualizarMargemNovo(){ const custo = numeroBR(document.getElementById('newCusto').value); const venda = numeroBR(document.getElementById('newVenda').value); const m = custo > 0 ? ((venda - custo) / custo) * 100 : 0; document.getElementById('newMargem').textContent = `${m.toFixed(1)}%`; }
function carregarFotoNovoProduto(e){
  const file = e.target.files?.[0]; if(!file){ fotoNovoProduto=''; return; }
  const reader = new FileReader(); reader.onload = () => { fotoNovoProduto = String(reader.result || ''); }; reader.readAsDataURL(file);
}
function salvarNovoProduto(){
  if(isFuncionario) return;
  const nome = document.getElementById('newNome').value.trim();
  const codigoInterno = document.getElementById('newCodigoInterno').value.trim() || gerarCodigoInterno();
  const codigo = document.getElementById('newCodigoBarras').value.trim();
  const categoria = document.getElementById('newCategoria').value.trim() || 'Outros';
  const custo = numeroBR(document.getElementById('newCusto').value);
  const venda = numeroBR(document.getElementById('newVenda').value);
  const qtd = Number(document.getElementById('newQtd').value || 0);
  const minimo = Number(document.getElementById('newMinimo').value || 0);
  const validade = document.getElementById('newValidade').value || '2099-01-01';
  if(!nome){ alert('Informe o nome do produto.'); return; }
  if(produtos.some(p => String(p.codigoInterno) === codigoInterno)){ alert('Esse código interno já existe. Use outro código.'); return; }
  if(venda <= 0){ alert('Informe o preço de venda.'); return; }
  const novo = {id:`manual-${Date.now()}-${slug(nome)}`, codigoInterno, nome, categoria, codigo, qtd, minimo, validade, custo, venda, img: fotoNovoProduto || imagemPadraoCategoria(categoria)};
  produtos.unshift(novo);
  salvarProdutos();
  salvarProdutoOnline(novo);
  fecharModalProduto(); render(); alert(`Produto cadastrado com sucesso. Código interno: ${codigoInterno}`);
}

document.querySelectorAll('.stock-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.id === 'btnAddProduct') return;
    document.querySelectorAll('.stock-filter-btn').forEach(b=>{ if(b.id !== 'btnAddProduct') b.classList.remove('active'); });
    btn.classList.add('active'); filtro = btn.dataset.filter; render();
  });
});
btnAddProduct?.addEventListener('click', abrirModalProduto);
search?.addEventListener('input', render);
render();
carregarProdutosOnline();
