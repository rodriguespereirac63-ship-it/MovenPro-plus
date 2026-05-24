import './dashboard.js';
import { auth, db } from './firebase.js';
import { carregarColecaoEmpresa } from './data-sync.js';
import { addDoc, collection, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

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

const STORAGE_KEY = 'movenproProdutosEstoque';
const produtosPadrao = [
  {codigoInterno:'1001', nome:'Coca-Cola 600ml', preco:6.50, venda:6.50, estoque:48, qtd:48, categoria:'Bebidas', codigo:'7894900011517', img:'img/products_real/coca600.png'},
  {codigoInterno:'1002', nome:'Cerveja Skol Lata 350ml', preco:3.50, venda:3.50, estoque:36, qtd:36, categoria:'Bebidas', codigo:'7891149107419', img:'img/products_real/skol350.png'},
  {codigoInterno:'1003', nome:'Cerveja Brahma Lata 350ml', preco:3.50, venda:3.50, estoque:30, qtd:30, categoria:'Bebidas', codigo:'7891991010851', img:'img/products_real/brahma350.png'},
  {codigoInterno:'1004', nome:'Água Mineral 500ml', preco:1.50, venda:1.50, estoque:35, qtd:35, categoria:'Bebidas', codigo:'7896336800116', img:'img/products_real/agua500.png'},
  {codigoInterno:'1005', nome:'Energético Red Bull 250ml', preco:10.00, venda:10.00, estoque:20, qtd:20, categoria:'Bebidas', codigo:'9002490100070', img:'img/products_real/redbull250.png'},
  {codigoInterno:'2001', nome:'Cigarro Marlboro', preco:16.00, venda:16.00, estoque:18, qtd:18, categoria:'Tabacaria', codigo:'7890000001001', img:'img/products_real/marlboro.png'},
  {codigoInterno:'2002', nome:'Cigarro Derby', preco:14.00, venda:14.00, estoque:16, qtd:16, categoria:'Tabacaria', codigo:'7890000001002', img:'img/products_real/derby.png'},
  {codigoInterno:'3001', nome:'Salg. Frito Doritos 96g', preco:9.50, venda:9.50, estoque:28, qtd:28, categoria:'Alimentos', codigo:'7892840815945', img:'img/products_real/doritos96.png'},
  {codigoInterno:'3002', nome:'Chocolate Lacta 90g', preco:6.50, venda:6.50, estoque:50, qtd:50, categoria:'Doces', codigo:'7891000248799', img:'img/products_real/lacta.png'},
  {codigoInterno:'4001', nome:'Gelo 5kg', preco:7.00, venda:7.00, estoque:28, qtd:28, categoria:'Outros', codigo:'7890000009001', img:'img/products_real/gelo5kg.png'},
  {codigoInterno:'1006', nome:'Heineken Lata 350ml', preco:6.00, venda:6.00, estoque:30, qtd:30, categoria:'Bebidas', codigo:'7896045504703', img:'img/products_real/heineken350.png'},
  {codigoInterno:'1007', nome:'Schweppes Citrus 350ml', preco:4.50, venda:4.50, estoque:18, qtd:18, categoria:'Bebidas', codigo:'7894900030396', img:'img/products_real/schweppes350.png'},
  {codigoInterno:'3003', nome:'Trident Unidade', preco:2.50, venda:2.50, estoque:42, qtd:42, categoria:'Doces', codigo:'7895800200000', img:'img/products_real/trident.png'},
  {codigoInterno:'3004', nome:'Amendoim Santa Helena 50g', preco:3.00, venda:3.00, estoque:40, qtd:40, categoria:'Alimentos', codigo:'7896336000073', img:'img/products_real/amendoim50.png'},
  {codigoInterno:'4002', nome:'Isqueiro BIC Unidade', preco:4.00, venda:4.00, estoque:25, qtd:25, categoria:'Utilidades', codigo:'7890000011001', img:'img/products_real/isqueiro.png'}
];

function carregarProdutos(){
  try{
    const salvos = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if(Array.isArray(salvos) && salvos.length){
      return salvos.map((p,idx)=>({
        codigoInterno: p.codigoInterno || String(1001 + idx),
        nome: p.nome,
        preco: Number(p.venda ?? p.preco ?? 0),
        venda: Number(p.venda ?? p.preco ?? 0),
        estoque: Number(p.qtd ?? p.estoque ?? 0),
        qtd: Number(p.qtd ?? p.estoque ?? 0),
        categoria: p.categoria || 'Outros',
        codigo: p.codigo || '',
        img: p.img || 'img/products/coca.svg'
      }));
    }
  }catch(e){}
  return produtosPadrao;
}

let produtos = carregarProdutos();
let categoriaAtual = 'Todos';
const carrinho = [];
const grid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const subtotalEl = document.getElementById('subtotal');
const totalEl = document.getElementById('total');
const busca = document.querySelector('.products-area .search');

function brl(v){ return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function filtrarProdutos(){
  const termo = String(busca?.value || '').toLowerCase().trim();
  return produtos.filter(p => {
    const catOk = categoriaAtual === 'Todos' || String(p.categoria || '').toLowerCase().includes(categoriaAtual.toLowerCase());
    const textoOk = !termo || [p.nome,p.codigoInterno,p.codigo,p.categoria].some(v => String(v || '').toLowerCase().includes(termo));
    return catOk && textoOk;
  });
}
function renderProdutos(){
  if(!grid) return;
  const lista = filtrarProdutos();
  grid.innerHTML = lista.map((p,i)=>`<article class="product" data-i="${produtos.indexOf(p)}"><div class="pic"><img src="${p.img}" alt="${p.nome}" onerror="this.src='img/products/coca.svg'"></div><h4>${p.nome}</h4><b>${brl(p.preco)}</b><small>Cód. ${p.codigoInterno} • Estoque: ${p.estoque} un</small></article>`).join('') || '<article class="panel"><h3>Nenhum produto encontrado</h3></article>';
  grid.querySelectorAll('.product').forEach(el=>el.addEventListener('click',()=>addProduto(Number(el.dataset.i))));
}
function quantidadeNoCarrinho(produto){
  return carrinho
    .filter(x => x.codigoInterno === produto.codigoInterno && x.nome === produto.nome)
    .reduce((s,x)=>s + Number(x.qtd || 0), 0);
}

function addProduto(i){
  const p = produtos[i];
  if(!p) return;

  const estoqueAtual = Number(p.estoque ?? p.qtd ?? 0);
  const jaNoCarrinho = quantidadeNoCarrinho(p);

  if(estoqueAtual <= 0){
    alert('Produto sem estoque disponível.');
    return;
  }

  if(jaNoCarrinho + 1 > estoqueAtual){
    alert(`Estoque insuficiente para ${p.nome}. Disponível: ${estoqueAtual} un.`);
    return;
  }

  const item = carrinho.find(x=>x.codigoInterno===p.codigoInterno && x.nome===p.nome);
  if(item) item.qtd += 1; else carrinho.push({...p,qtd:1});
  renderCarrinho();
}
function tentarAdicionarPorCodigo(){
  const termo = String(busca?.value || '').trim();
  if(!termo) return;
  const achado = produtos.find(p => String(p.codigoInterno) === termo || String(p.codigo) === termo);
  if(achado){ addProduto(produtos.indexOf(achado)); busca.value=''; renderProdutos(); }
}
function removeItem(i){ carrinho.splice(i,1); renderCarrinho(); }
function renderCarrinho(){
  if(!cartItems) return;
  cartItems.innerHTML = carrinho.map((p,i)=>`<div class="cart-row"><strong>${p.nome}</strong><span>${p.qtd}</span><b>${brl(p.preco*p.qtd)}</b><button data-i="${i}">×</button></div>`).join('');
  cartItems.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>removeItem(Number(btn.dataset.i))));
  const total = carrinho.reduce((s,p)=>s+p.preco*p.qtd,0);
  subtotalEl.textContent = brl(total);
  totalEl.textContent = brl(total);
}

document.querySelectorAll('.chips button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chips button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    categoriaAtual = btn.textContent.trim();
    renderProdutos();
  });
});
busca?.addEventListener('input', renderProdutos);
busca?.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') tentarAdicionarPorCodigo(); });
renderProdutos();
renderCarrinho();
carregarProdutosOnline();


/* ===== MovenPro V14 Pagamento com escolha + gateways configuráveis ===== */
function totalCarrinho(){ return carrinho.reduce((s,p)=>s+(Number(p.preco||0)*Number(p.qtd||0)),0); }
function getConfigPagamento(){
  try{
    return JSON.parse(localStorage.getItem('movenproConfigPagamento') || 'null') || {gateway:'manual', conta:'', ambiente:'teste'};
  }catch(e){
    return {gateway:'manual', conta:'', ambiente:'teste'};
  }
}
function nomeGateway(){
  const g = getConfigPagamento().gateway || 'manual';
  const nomes = {manual:'Manual / Maquininha', mercado_pago:'Mercado Pago', getnet:'Getnet', pagbank:'PagBank', stone:'Stone'};
  return nomes[g] || 'Manual / Maquininha';
}
function taxaPagamento(forma, detalhe=''){
  const cfg = getConfigPagamento();
  const taxas = cfg.taxas || {};
  if(forma === 'PIX') return Number(taxas.pix ?? 0);
  if(forma === 'Dinheiro') return 0;
  if(forma === 'Cartão'){
    if(String(detalhe).includes('Débito')) return Number(taxas.debito ? 1.49);
    return Number(taxas.credito ? 3.49);
  }
  return 0;
}
function getUsuarioAtual(){
  try{
    return JSON.parse(localStorage.getItem('movenproUser') || '{}') || {};
  }catch(e){
    return {};
  }
}

function gerarVendaId(){
  const data = new Date();
  const stamp = data.toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
  const rand = Math.random().toString(36).slice(2,8).toUpperCase();
  return `VEN-${stamp}-${rand}`;
}

function salvarProdutosEstoque(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
}

async function carregarProdutosOnline(){
  const online = await carregarColecaoEmpresa('produtos', STORAGE_KEY, produtosPadrao);
  if(Array.isArray(online) && online.length){
    produtos = online.map((p,idx)=>({
      codigoInterno: p.codigoInterno || String(1001 + idx),
      nome: p.nome,
      preco: Number(p.venda ?? p.preco ?? 0),
      venda: Number(p.venda ?? p.preco ?? 0),
      estoque: Number(p.qtd ?? p.estoque ?? 0),
      qtd: Number(p.qtd ?? p.estoque ?? 0),
      categoria: p.categoria || 'Outros',
      codigo: p.codigo || '',
      img: p.img || 'img/products/coca.svg'
    }));
    salvarProdutosEstoque();
    renderProdutos();
  }
}

function carregarArrayLocal(chave){
  try{
    const arr = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function salvarArrayLocal(chave, arr){
  localStorage.setItem(chave, JSON.stringify(arr));
}

const CAIXA_ATUAL_KEY = 'movenproCaixaAtual';

function getEmpresaIdAtual(){
  const usuario = getUsuarioAtual();
  return usuario.empresaId || 'moven001';
}

function gerarCaixaId(){
  const data = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
  return `CX-${data}`;
}

function getCaixaAtual(){
  try{
    const caixa = JSON.parse(localStorage.getItem(CAIXA_ATUAL_KEY) || 'null');
    if(caixa && caixa.status === 'aberto' && caixa.empresaId === getEmpresaIdAtual()) return caixa;
  }catch(e){}
  return null;
}

function salvarCaixaAtual(caixa){
  localStorage.setItem(CAIXA_ATUAL_KEY, JSON.stringify(caixa));
  atualizarStatusCaixaTela();
}

function caixaEstaAberto(){
  return !!getCaixaAtual();
}

async function salvarCaixaFirestore(caixa){
  try{
    if(!navigator.onLine || !auth?.currentUser) return false;
    await setDoc(doc(db, 'caixas', caixa.id), {
      ...caixa,
      uid: auth.currentUser.uid,
      atualizadoEmServidor: serverTimestamp()
    }, { merge: true });
    await setDoc(doc(db, 'empresas', caixa.empresaId, 'caixas', caixa.id), {
      ...caixa,
      uid: auth.currentUser.uid,
      atualizadoEmServidor: serverTimestamp()
    }, { merge: true });
    return true;
  }catch(error){
    console.warn('Caixa salvo localmente, mas não sincronizou no Firestore:', error);
    return false;
  }
}

async function registrarMovimentoCaixa(tipo, valor, obs=''){
  const caixa = getCaixaAtual();
  if(!caixa){
    alert('Abra o caixa antes de registrar movimentos.');
    return null;
  }
  const movimento = {
    id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    caixaId: caixa.id,
    empresaId: caixa.empresaId,
    tipo,
    valor: Number(valor || 0),
    obs,
    data: new Date().toISOString(),
    usuario: getUsuarioAtual().email || getUsuarioAtual().nome || 'Caixa'
  };
  const movimentos = carregarArrayLocal('movenproCaixaMovimentos');
  movimentos.unshift(movimento);
  salvarArrayLocal('movenproCaixaMovimentos', movimentos.slice(0, 1000));

  if(tipo === 'SANGRIA') caixa.sangrias = Number(caixa.sangrias || 0) + movimento.valor;
  if(tipo === 'REFORCO') caixa.reforcos = Number(caixa.reforcos || 0) + movimento.valor;
  caixa.atualizadoEm = new Date().toISOString();
  salvarCaixaAtual(caixa);
  await salvarCaixaFirestore(caixa);

  try{
    if(navigator.onLine && auth?.currentUser){
      await addDoc(collection(db, 'caixaMovimentos'), {...movimento, uid:auth.currentUser.uid, criadoEmServidor:serverTimestamp()});
      await addDoc(collection(db, 'empresas', movimento.empresaId, 'caixaMovimentos'), {...movimento, uid:auth.currentUser.uid, criadoEmServidor:serverTimestamp()});
    }
  }catch(e){ console.warn('Movimento de caixa pendente de sincronização.', e); }

  return movimento;
}

function atualizarCaixaAbertoComVenda(venda){
  const caixa = getCaixaAtual();
  if(!caixa) return;
  caixa.totalVendas = Number(caixa.totalVendas || 0) + Number(venda.bruto || 0);
  caixa.totalLiquido = Number(caixa.totalLiquido || 0) + Number(venda.liquido || 0);
  caixa.qtdVendas = Number(caixa.qtdVendas || 0) + 1;
  caixa.porForma = caixa.porForma || {};
  caixa.porForma[venda.forma] = Number(caixa.porForma[venda.forma] || 0) + Number(venda.bruto || 0);
  caixa.atualizadoEm = new Date().toISOString();
  salvarCaixaAtual(caixa);
  salvarCaixaFirestore(caixa);
}

function atualizarStatusCaixaTela(){
  const status = document.querySelector('.open-status');
  if(!status) return;
  const caixa = getCaixaAtual();
  if(caixa){
    status.textContent = '● Aberto';
    status.style.color = '';
  }else{
    status.textContent = '● Caixa fechado';
    status.style.color = '#dc2626';
  }
}

setTimeout(atualizarStatusCaixaTela, 100);

function validarVendaAntesDeFinalizar(){
  if(!Array.isArray(carrinho) || carrinho.length === 0){
    return {ok:false, msg:'Adicione produtos antes de finalizar.'};
  }

  if(!caixaEstaAberto()){
    return {ok:false, msg:'Abra o caixa antes de finalizar a venda.'};
  }

  const total = totalCarrinho();
  if(total <= 0){
    return {ok:false, msg:'Venda sem valor. Verifique os itens do carrinho.'};
  }

  for(const item of carrinho){
    const produto = produtos.find(p => p.codigoInterno === item.codigoInterno && p.nome === item.nome);
    if(!produto){
      return {ok:false, msg:`Produto não encontrado no estoque: ${item.nome}`};
    }

    const estoqueAtual = Number(produto.estoque ?? produto.qtd ?? 0);
    const qtdVenda = Number(item.qtd || 0);

    if(qtdVenda <= 0){
      return {ok:false, msg:`Quantidade inválida no item ${item.nome}.`};
    }

    if(qtdVenda > estoqueAtual){
      return {ok:false, msg:`Estoque insuficiente para ${item.nome}. Disponível: ${estoqueAtual} un. No carrinho: ${qtdVenda} un.`};
    }
  }

  return {ok:true};
}

function baixarEstoqueDaVenda(venda){
  venda.itensDetalhados.forEach(item => {
    const produto = produtos.find(p => p.codigoInterno === item.codigoInterno && p.nome === item.nome);
    if(!produto) return;
    const novoEstoque = Math.max(0, Number(produto.estoque ?? produto.qtd ?? 0) - Number(item.qtd || 0));
    produto.estoque = novoEstoque;
    produto.qtd = novoEstoque;
    produto.atualizadoEm = new Date().toISOString();
  });
  salvarProdutosEstoque();
  renderProdutos();
}

function registrarHistoricoLocal(venda){
  const historico = carregarArrayLocal('movenproHistoricoVendas');
  historico.unshift({
    id: venda.id,
    data: venda.data,
    tipo: 'VENDA_FINALIZADA',
    total: venda.bruto,
    forma: venda.forma,
    itens: venda.itensDetalhados.length,
    usuario: venda.usuarioNome,
    empresaId: venda.empresaId
  });
  salvarArrayLocal('movenproHistoricoVendas', historico.slice(0, 500));

  const movimentos = carregarArrayLocal('movenproMovimentacoesEstoque');
  venda.itensDetalhados.forEach(item => {
    movimentos.unshift({
      id: `${venda.id}-${item.codigoInterno}`,
      vendaId: venda.id,
      data: venda.data,
      tipo: 'SAIDA_VENDA',
      codigoInterno: item.codigoInterno,
      produto: item.nome,
      qtd: item.qtd,
      valorUnitario: item.preco,
      valorTotal: item.total,
      empresaId: venda.empresaId
    });
  });
  salvarArrayLocal('movenproMovimentacoesEstoque', movimentos.slice(0, 1000));

  const financeiro = carregarArrayLocal('movenproFinanceiroLancamentos');
  financeiro.unshift({
    id: `FIN-${venda.id}`,
    vendaId: venda.id,
    data: venda.data,
    tipo: 'ENTRADA',
    categoria: 'Venda PDV',
    descricao: `Venda ${venda.id} - ${venda.forma}${venda.detalhe ? ' / '+venda.detalhe : ''}`,
    bruto: venda.bruto,
    taxaPercentual: venda.taxa,
    liquido: venda.liquido,
    forma: venda.forma,
    gateway: venda.gateway,
    empresaId: venda.empresaId
  });
  salvarArrayLocal('movenproFinanceiroLancamentos', financeiro.slice(0, 1000));

  const caixa = carregarArrayLocal('movenproCaixaMovimentos');
  caixa.unshift({
    id: `CX-${venda.id}`,
    vendaId: venda.id,
    data: venda.data,
    tipo: 'VENDA',
    forma: venda.forma,
    valor: venda.bruto,
    liquido: venda.liquido,
    empresaId: venda.empresaId
  });
  salvarArrayLocal('movenproCaixaMovimentos', caixa.slice(0, 1000));
}

async function tentarSalvarVendaFirebase(venda){
  try{
    if(!navigator.onLine) return false;
    if(!auth?.currentUser) return false;

    const payload = {
      ...venda,
      uid: auth.currentUser.uid,
      criadoEmServidor: serverTimestamp()
    };

    await setDoc(doc(db, 'vendas', venda.id), payload, { merge: true });
    await setDoc(doc(db, 'empresas', venda.empresaId, 'vendas', venda.id), payload, { merge: true });

    const financeiroPayload = {
      id: `FIN-${venda.id}`,
      vendaId: venda.id,
      empresaId: venda.empresaId,
      tipo: 'ENTRADA',
      categoria: 'Venda PDV',
      descricao: `Venda ${venda.id}`,
      bruto: venda.bruto,
      liquido: venda.liquido,
      forma: venda.forma,
      gateway: venda.gateway,
      caixaId: venda.caixaId,
      uid: auth.currentUser.uid,
      criadoEmServidor: serverTimestamp()
    };

    await setDoc(doc(db, 'financeiro', financeiroPayload.id), financeiroPayload, { merge: true });
    await setDoc(doc(db, 'empresas', venda.empresaId, 'financeiro', financeiroPayload.id), financeiroPayload, { merge: true });

    const caixaPayload = {
      id: `CXMOV-${venda.id}`,
      vendaId: venda.id,
      caixaId: venda.caixaId,
      empresaId: venda.empresaId,
      tipo: 'VENDA',
      forma: venda.forma,
      valor: venda.bruto,
      liquido: venda.liquido,
      uid: auth.currentUser.uid,
      criadoEmServidor: serverTimestamp()
    };

    await setDoc(doc(db, 'caixaMovimentos', caixaPayload.id), caixaPayload, { merge: true });
    await setDoc(doc(db, 'empresas', venda.empresaId, 'caixaMovimentos', caixaPayload.id), caixaPayload, { merge: true });

    for(const item of venda.itensDetalhados){
      const produtoAtualizado = produtos.find(p => p.codigoInterno === item.codigoInterno && p.nome === item.nome);
      if(produtoAtualizado){
        const produtoId = String(produtoAtualizado.codigoInterno || item.codigoInterno);
        const produtoPayload = {
          ...produtoAtualizado,
          empresaId: venda.empresaId,
          atualizadoEm: new Date().toISOString(),
          atualizadoEmServidor: serverTimestamp()
        };
        await setDoc(doc(db, 'produtos', produtoId), produtoPayload, { merge: true });
        await setDoc(doc(db, 'empresas', venda.empresaId, 'produtos', produtoId), produtoPayload, { merge: true });
      }
    }

    return true;
  }catch(error){
    console.warn('Venda salva localmente, mas ainda não sincronizou no Firebase:', error);
    return false;
  }
}

async function registrarVenda(forma, detalhe='', gateway='manual'){
  const validacao = validarVendaAntesDeFinalizar();
  if(!validacao.ok){
    alert(validacao.msg);
    return;
  }

  const total = totalCarrinho();
  const usuario = getUsuarioAtual();
  const taxa = taxaPagamento(forma, detalhe);
  const liquido = total - (total * taxa / 100);
  const statusPagamento = gateway === 'manual' ? 'confirmado manualmente' : 'aguardando integração';
  const vendaId = gerarVendaId();
  const data = new Date().toISOString();

  const venda = {
    id: vendaId,
    data,
    caixaId: getCaixaAtual()?.id || '',
    empresaId: usuario.empresaId || 'moven001',
    usuarioUid: usuario.uid || auth?.currentUser?.uid || '',
    usuarioNome: usuario.nome || usuario.email || 'Caixa',
    forma,
    detalhe,
    gateway,
    statusPagamento,
    statusVenda: 'finalizada',
    bruto: total,
    taxa,
    liquido,
    itens: carrinho.reduce((s,p)=>s+Number(p.qtd||0),0),
    itensDetalhados: carrinho.map(item => ({
      codigoInterno: item.codigoInterno || '',
      codigo: item.codigo || '',
      nome: item.nome,
      categoria: item.categoria || 'Outros',
      qtd: Number(item.qtd || 0),
      preco: Number(item.preco || item.venda || 0),
      total: Number(item.preco || item.venda || 0) * Number(item.qtd || 0)
    })),
    observacao:document.querySelector('.cart-panel textarea')?.value || ''
  };

  // Ordem segura: 1) salvar venda local, 2) baixar estoque, 3) registrar financeiro/caixa/histórico, 4) tentar Firebase.
  const vendas = carregarArrayLocal('movenproVendas');
  vendas.push(venda);
  salvarArrayLocal('movenproVendas', vendas);

  baixarEstoqueDaVenda(venda);
  registrarHistoricoLocal(venda);
  atualizarCaixaAbertoComVenda(venda);

  const sincronizou = await tentarSalvarVendaFirebase(venda);
  venda.sincronizadoFirebase = sincronizou;
  venda.statusSincronizacao = sincronizou ? 'sincronizado' : 'pendente';
  salvarArrayLocal('movenproVendas', vendas.map(v => v.id === venda.id ? venda : v));

  alert(`Venda finalizada com sucesso!\nCódigo: ${venda.id}\nPagamento: ${forma}${detalhe ? ' - '+detalhe : ''}\nTotal: ${brl(total)}\nLíquido estimado: ${brl(liquido)}\nFirebase: ${sincronizou ? 'sincronizado' : 'pendente para sincronizar'}`);

  carrinho.splice(0,carrinho.length);
  const obs = document.querySelector('.cart-panel textarea'); if(obs) obs.value = '';
  renderCarrinho();
}
function abrirModalPagamento(){
  const total = totalCarrinho();
  if(total <= 0){ alert('Adicione produtos antes de finalizar.'); return; }
  let modal = document.getElementById('pagamentoModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id='pagamentoModal';
    modal.className='modal-backdrop';
    modal.innerHTML = `<div class="price-modal product-modal payment-modal">
      <button class="modal-close" id="closePagamentoModal" type="button">×</button>
      <h2>Escolher forma de pagamento</h2>
      <p class="modal-subtitle">Selecione como o cliente deseja pagar esta venda.</p>
      <div class="payment-total"><span>Total da venda</span><strong id="pagamentoTotal">R$ 0,00</strong><small>Gateway configurado: <b id="pagamentoGateway">Manual / Maquininha</b></small></div>
      <div class="payment-choice-grid">
        <button type="button" data-forma="Dinheiro" data-detalhe="À vista"><span>💵</span><b>Dinheiro</b><small>Confirmação manual no caixa</small></button>
        <button type="button" data-forma="PIX" data-detalhe="PIX integrado"><span>📲</span><b>PIX</b><small>Preparado para Mercado Pago/Getnet</small></button>
        <button type="button" data-forma="Cartão" data-detalhe="Débito"><span>💳</span><b>Débito</b><small>Cartão débito / maquininha</small></button>
        <button type="button" data-forma="Cartão" data-detalhe="Crédito 1x"><span>💳</span><b>Crédito 1x</b><small>Crédito à vista</small></button>
        <button type="button" data-forma="Cartão" data-detalhe="Crédito parcelado"><span>💳</span><b>Crédito parcelado</b><small>Informe parcelas depois</small></button>
        <button type="button" data-forma="Manual" data-detalhe="Pagamento externo"><span>🧾</span><b>Manual</b><small>Venda recebida fora da integração</small></button>
      </div>
      <div class="payment-note">As APIs reais ficam preparadas para Firebase Functions, sem expor token no navegador.</div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('closePagamentoModal').addEventListener('click',()=>modal.classList.remove('show'));
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('show'); });
    modal.querySelectorAll('.payment-choice-grid button').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const cfg = getConfigPagamento();
        const gateway = cfg.gateway || 'manual';
        let detalhe = btn.dataset.detalhe || '';
        if(detalhe === 'Crédito parcelado'){
          const parcelas = prompt('Quantidade de parcelas:', '2');
          if(parcelas === null) return;
          detalhe = `Crédito parcelado ${parcelas}x`;
        }
        await registrarVenda(btn.dataset.forma, detalhe, gateway);
        modal.classList.remove('show');
      });
    });
  }
  document.getElementById('pagamentoTotal').textContent = brl(total);
  document.getElementById('pagamentoGateway').textContent = nomeGateway();
  modal.classList.add('show');
}
document.getElementById('btnFinalizarPagamento')?.addEventListener('click', abrirModalPagamento);
document.querySelectorAll('.pay-grid button').forEach(btn=>{
  btn.addEventListener('click', abrirModalPagamento);
});
document.getElementById('btnNovaVenda')?.addEventListener('click',()=>{ carrinho.splice(0,carrinho.length); renderCarrinho(); busca?.focus(); });
document.getElementById('btnCancelarVenda')?.addEventListener('click',()=>{ if(confirm('Cancelar a venda atual?')){ carrinho.splice(0,carrinho.length); renderCarrinho(); }});
document.getElementById('btnDesconto')?.addEventListener('click',()=>alert('Desconto controlado: função preparada para limitar por perfil.'));
document.getElementById('btnTelaCheia')?.addEventListener('click',()=>document.documentElement.requestFullscreen?.());
function resumoVendas(){
  const vendas = JSON.parse(localStorage.getItem('movenproVendas') || '[]');
  const hoje = new Date().toISOString().slice(0,10);
  const lista = vendas.filter(v=>String(v.data).slice(0,10) === hoje);
  const soma = f => lista.filter(v=>v.forma===f).reduce((s,v)=>s+Number(v.bruto||0),0);
  const total = lista.reduce((s,v)=>s+Number(v.bruto||0),0);
  return {lista,total,dinheiro:soma('Dinheiro'),pix:soma('PIX'),cartao:soma('Cartão'),ticket: lista.length ? total/lista.length : 0};
}
function abrirPainelCaixa(){
  let modal = document.getElementById('caixaModal');
  if(!modal){
    modal = document.createElement('div'); modal.id='caixaModal'; modal.className='modal-backdrop';
    modal.innerHTML = `<div class="price-modal product-modal"><button class="modal-close" id="closeCaixaModal" type="button">×</button><h2>Caixa</h2><p class="modal-subtitle">Abertura, fechamento, sangria e reforço.</p><div id="caixaConteudo"></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('closeCaixaModal').addEventListener('click',()=>modal.classList.remove('show'));
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('show'); });
  }

  const caixa = getCaixaAtual();
  const r = resumoVendas();

  if(!caixa){
    document.getElementById('caixaConteudo').innerHTML = `<article class="panel"><h3>Caixa fechado</h3><p>Para vender, abra o caixa primeiro.</p><label>Valor inicial / troco<input id="valorAberturaCaixa" placeholder="0,00"></label><button id="confirmAbrirCaixa" class="btn-primary" type="button">Abrir caixa</button></article>`;
    document.getElementById('confirmAbrirCaixa').addEventListener('click', async ()=>{
      const valorInicial = Number(String(document.getElementById('valorAberturaCaixa').value || '0').replace(',','.'));
      const usuario = getUsuarioAtual();
      const novoCaixa = {
        id: gerarCaixaId(),
        empresaId: usuario.empresaId || 'moven001',
        status: 'aberto',
        abertoEm: new Date().toISOString(),
        abertoPor: usuario.email || usuario.nome || 'Caixa',
        valorInicial: isNaN(valorInicial) ? 0 : valorInicial,
        totalVendas: 0,
        totalLiquido: 0,
        qtdVendas: 0,
        sangrias: 0,
        reforcos: 0,
        porForma: {}
      };
      salvarCaixaAtual(novoCaixa);
      await salvarCaixaFirestore(novoCaixa);
      alert('Caixa aberto com sucesso.');
      abrirPainelCaixa();
    });
    modal.classList.add('show');
    return;
  }

  document.getElementById('caixaConteudo').innerHTML = `<section class="metric-grid"><article class="metric-card"><span>💵</span><p>Dinheiro</p><h2>${brl(r.dinheiro)}</h2></article><article class="metric-card"><span>📲</span><p>PIX</p><h2>${brl(r.pix)}</h2></article><article class="metric-card"><span>💳</span><p>Cartão</p><h2>${brl(r.cartao)}</h2></article><article class="metric-card"><span>🧾</span><p>Total</p><h2>${brl(r.total)}</h2><small>${r.lista.length} vendas • ticket ${brl(r.ticket)}</small></article></section><div class="dashboard-grid"><article class="panel"><h3>Fechar Caixa</h3><p>Caixa: <b>${caixa.id}</b></p><p>Total calculado: <b>${brl(r.total)}</b></p><p>Sangrias: <b>${brl(caixa.sangrias || 0)}</b> • Reforços: <b>${brl(caixa.reforcos || 0)}</b></p><label>Dinheiro contado<input id="dinheiroContado" placeholder="0,00"></label><label>Observação<input id="obsFechamento" placeholder="Observação"></label><button id="confirmFecharCaixa" class="btn-primary" type="button">Confirmar fechamento</button></article><article class="panel"><h3>Sangria / Reforço</h3><button id="btnSangria" class="stock-filter-btn" type="button">Registrar sangria</button><button id="btnReforco" class="stock-filter-btn" type="button">Registrar reforço</button><p>Use para conferir dinheiro que entrou ou saiu do caixa.</p></article></div>`;

  document.getElementById('confirmFecharCaixa').addEventListener('click', async ()=>{
    const contado = Number(String(document.getElementById('dinheiroContado').value).replace(',','.') || 0);
    const esperadoDinheiro = Number(r.dinheiro || 0) + Number(caixa.valorInicial || 0) + Number(caixa.reforcos || 0) - Number(caixa.sangrias || 0);
    const dif = contado - esperadoDinheiro;
    const fechamento = {...caixa, status:'fechado', fechadoEm:new Date().toISOString(), total:r.total, dinheiro:r.dinheiro, pix:r.pix, cartao:r.cartao, contado, esperadoDinheiro, diferenca:dif, obs:document.getElementById('obsFechamento').value};
    const fechamentos = carregarArrayLocal('movenproFechamentos');
    fechamentos.unshift(fechamento);
    salvarArrayLocal('movenproFechamentos', fechamentos.slice(0,500));
    localStorage.removeItem(CAIXA_ATUAL_KEY);
    await salvarCaixaFirestore(fechamento);
    atualizarStatusCaixaTela();
    alert(`Caixa fechado. Diferença em dinheiro: ${brl(dif)}`);
    modal.classList.remove('show');
  });

  document.getElementById('btnSangria').addEventListener('click',async ()=>{
    const valor = prompt('Valor da sangria:', '0,00');
    if(valor === null) return;
    const obs = prompt('Observação da sangria:', '') || '';
    await registrarMovimentoCaixa('SANGRIA', Number(String(valor).replace(',','.')), obs);
    alert('Sangria registrada.');
    abrirPainelCaixa();
  });

  document.getElementById('btnReforco').addEventListener('click',async ()=>{
    const valor = prompt('Valor do reforço:', '0,00');
    if(valor === null) return;
    const obs = prompt('Observação do reforço:', '') || '';
    await registrarMovimentoCaixa('REFORCO', Number(String(valor).replace(',','.')), obs);
    alert('Reforço registrado.');
    abrirPainelCaixa();
  });

  modal.classList.add('show');
}
document.getElementById('btnCaixa')?.addEventListener('click',abrirPainelCaixa);
if(location.hash === '#caixa') setTimeout(abrirPainelCaixa, 300);
document.addEventListener('keydown',(e)=>{
  if(e.key === 'F2'){ e.preventDefault(); busca?.focus(); }
  if(e.key === 'F10'){ e.preventDefault(); abrirModalPagamento(); }
});
