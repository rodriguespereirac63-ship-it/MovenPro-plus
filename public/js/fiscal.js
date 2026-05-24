const KEY_EMPRESA = 'movenproFiscalEmpresa';
const KEY_NFCE = 'movenproFiscalNfce';
const KEY_PRODUTOS = 'movenproProdutosFiscais';

const $ = (id) => document.getElementById(id);
const getJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } };
const setJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const empresaPadrao = { razaoSocial:'', nomeFantasia:'', cnpj:'', ie:'', regimeTributario:'simples', crt:'1', cep:'', endereco:'', cidade:'', uf:'SC' };
const nfcePadrao = { modeloFiscal:'65', ambienteSefaz:'homologacao', serieNfce:'1', proximoNumero:'1', idCsc:'', csc:'', tipoEmissao:'normal', statusFiscal:'rascunho', certificadoNome:'', certificadoValidade:'', certificadoSenha:'', backendFiscalUrl:'' };

function setValue(id, value){ if($(id)) $(id).value = value ?? ''; }
function fillForm(data){ Object.entries(data).forEach(([k,v])=>setValue(k,v)); }
function readForm(ids){ return ids.reduce((acc,id)=>{ acc[id] = ($(id)?.value || '').trim(); return acc; }, {}); }

function checklist(el, items){
  if(!el) return;
  el.innerHTML = items.map(([txt, ok]) => `<div class="check-item ${ok ? 'ok' : 'wait'}"><span>${ok ? '✅' : '⏳'}</span><b>${txt}</b></div>`).join('');
}

function atualizarResumo(){
  const empresa = getJson(KEY_EMPRESA, empresaPadrao);
  const nfce = getJson(KEY_NFCE, nfcePadrao);
  $('fiscalStatus').textContent = `Fiscal: ${nfce.statusFiscal === 'ativo' ? 'Ativo' : nfce.statusFiscal === 'teste' ? 'Homologação' : 'Rascunho'}`;
  $('cardModeloFiscal').textContent = nfce.modeloFiscal === '55' ? 'Modelo 55' : 'Modelo 65';
  $('cardCertificado').textContent = nfce.certificadoNome ? 'Cadastrado' : 'Não enviado';
  $('cardAmbiente').textContent = nfce.ambienteSefaz === 'producao' ? 'Produção' : 'Homologação';
  $('cardXml').textContent = nfce.backendFiscalUrl ? 'Backend URL' : 'Preparado';

  checklist($('checkEmpresa'), [
    ['CNPJ preenchido', !!empresa.cnpj],
    ['Inscrição Estadual preenchida', !!empresa.ie],
    ['Regime tributário definido', !!empresa.regimeTributario],
    ['Endereço completo', !!(empresa.endereco && empresa.cidade && empresa.uf)]
  ]);
  checklist($('checkNfce'), [
    ['Ambiente SEFAZ definido', !!nfce.ambienteSefaz],
    ['Série e numeração', !!(nfce.serieNfce && nfce.proximoNumero)],
    ['CSC / ID CSC', !!(nfce.idCsc && nfce.csc)],
    ['Certificado A1 identificado', !!nfce.certificadoNome],
    ['Backend fiscal configurado', !!nfce.backendFiscalUrl]
  ]);
}

function carregar(){
  fillForm(getJson(KEY_EMPRESA, empresaPadrao));
  fillForm(getJson(KEY_NFCE, nfcePadrao));
  renderProdutos();
  atualizarResumo();
}

$('formFiscalEmpresa')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = readForm(Object.keys(empresaPadrao));
  setJson(KEY_EMPRESA, data);
  atualizarResumo();
  alert('Cadastro fiscal da empresa salvo.');
});

$('formFiscalNfce')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = readForm(Object.keys(nfcePadrao));
  setJson(KEY_NFCE, data);
  atualizarResumo();
  alert('Configuração NFC-e / SEFAZ salva.');
});

$('formProdutoFiscal')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const produto = readForm(['produtoFiscalNome','produtoNcm','produtoCfop','produtoCst','produtoCest','produtoUnidade']);
  if(!produto.produtoFiscalNome){ alert('Informe o nome do produto.'); return; }
  const lista = getJson(KEY_PRODUTOS, []);
  lista.unshift({...produto, criadoEm:new Date().toISOString()});
  setJson(KEY_PRODUTOS, lista.slice(0, 50));
  e.target.reset();
  renderProdutos();
});

function renderProdutos(){
  const lista = getJson(KEY_PRODUTOS, []);
  const tbody = $('listaProdutosFiscais');
  if(!tbody) return;
  if(!lista.length){
    tbody.innerHTML = '<tr><td colspan="5">Nenhum produto fiscal cadastrado ainda.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => `<tr><td>${p.produtoFiscalNome || '-'}</td><td>${p.produtoNcm || '-'}</td><td>${p.produtoCfop || '-'}</td><td>${p.produtoCst || '-'}</td><td>${p.produtoUnidade || '-'}</td></tr>`).join('');
}

document.querySelectorAll('[data-fiscal-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-fiscal-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.fiscalTab;
    document.querySelectorAll('[data-tab-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.tabPanel !== tab));
  });
});

$('btnSimularXml')?.addEventListener('click', ()=>{
  alert('Pacote XML simulado. Na integração real, esta ação vai baixar XML + DANFE + resumo fiscal mensal.');
});

carregar();
