import './dashboard.js';
import { carregarColecaoEmpresa, salvarDocumentoEmpresa } from './data-sync.js';

const input = document.getElementById('xmlInput');
const btn = document.getElementById('btnLerXml');
const out = document.getElementById('xmlResultado');

function texto(tag, xml){ return xml.querySelector(tag)?.textContent || '-'; }

btn?.addEventListener('click', async ()=>{
  const file = input?.files?.[0];
  if(!file){ alert('Escolha um arquivo XML primeiro.'); return; }

  const raw = await file.text();
  const xml = new DOMParser().parseFromString(raw, 'text/xml');

  const fornecedor = xml.querySelector('emit xNome')?.textContent || 'Fornecedor não identificado';
  const cnpj = xml.querySelector('emit CNPJ')?.textContent || '-';
  const numero = xml.querySelector('ide nNF')?.textContent || '-';
  const total = xml.querySelector('ICMSTot vNF')?.textContent || '0';

  const itens = [...xml.querySelectorAll('det')].slice(0,8).map(det=>({
    nome: det.querySelector('xProd')?.textContent || 'Produto',
    qtd: det.querySelector('qCom')?.textContent || '0',
    valor: det.querySelector('vUnCom')?.textContent || '0'
  }));

  out.innerHTML = `
    <div class="xml-card">
      <h4>Nota encontrada</h4>
      <p>Fornecedor: <b>${fornecedor}</b></p>
      <p>CNPJ: <b>${cnpj}</b> • NF-e: <b>${numero}</b> • Total: <b>R$ ${Number(total).toFixed(2).replace('.',',')}</b></p>
      <div class="finance-list">
        ${itens.map(i=>`<div><span>${i.nome}</span><strong>${Number(i.qtd).toFixed(2).replace('.',',')} un</strong><small>R$ ${Number(i.valor).toFixed(2).replace('.',',')}</small></div>`).join('') || '<p>Nenhum item encontrado.</p>'}
      </div>
      <button id="btnConfirmarEntradaXml" class="btn-primary" type="button">Confirmar entrada no estoque</button>
    </div>`;

  window.__movenproXmlEntrada = {fornecedor, cnpj, numero, total:Number(total || 0), itens, data:new Date().toISOString()};
});

function money(v){
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

let chartFluxoInstance = null;
let chartPagamentosInstance = null;

function initCharts(){
  if(typeof Chart === 'undefined') return;

  const fluxo = document.getElementById('chartFluxo');
  if(fluxo){
    chartFluxoInstance = new Chart(fluxo, {
      type: 'line',
      data: {
        labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
        datasets: [
          { label: 'Entradas', data: [4200,5200,4800,6100,7200,9400,6800], tension:.35 },
          { label: 'Saídas', data: [1600,2100,1800,2600,3100,3900,2200], tension:.35 },
          { label: 'Saldo', data: [2600,3100,3000,3500,4100,5500,4600], tension:.35 }
        ]
      },
      options: {
        responsive:true,
        plugins:{ legend:{ position:'bottom' } },
        scales:{ y:{ ticks:{ callback:(v)=> money(v).replace(',00','') } } }
      }
    });
  }

  const pagamentos = document.getElementById('chartPagamentos');
  if(pagamentos){
    chartPagamentosInstance = new Chart(pagamentos, {
      type: 'doughnut',
      data: {
        labels: ['Pix','Débito','Crédito','Dinheiro'],
        datasets: [{ data: [42,24,21,13] }]
      },
      options: {
        responsive:true,
        plugins:{ legend:{ position:'bottom' } }
      }
    });
  }
}

initCharts();


/* Contas Fixas integradas ao Financeiro */
const CONTAS_FIXAS_KEY = 'movenpro_contas_fixas';
const contasExemplo = [
  {descricao:'Aluguel', categoria:'Aluguel', valor:1900, dia:10, status:'Pendente'},
  {descricao:'Energia elétrica', categoria:'Luz', valor:820, dia:18, status:'Pendente'},
  {descricao:'Água', categoria:'Água', valor:210, dia:12, status:'Pendente'},
  {descricao:'Internet', categoria:'Internet', valor:149.90, dia:8, status:'Pago'},
  {descricao:'Contador', categoria:'Contador', valor:650, dia:5, status:'Pago'},
  {descricao:'Sistema/tecnologia', categoria:'Sistema', valor:260, dia:15, status:'Pendente'},
  {descricao:'Folha/diárias', categoria:'Funcionários', valor:2300, dia:30, status:'Pendente'}
];

function carregarContasFixas(){
  const raw = localStorage.getItem(CONTAS_FIXAS_KEY);
  if(!raw){ localStorage.setItem(CONTAS_FIXAS_KEY, JSON.stringify(contasExemplo)); return contasExemplo; }
  try { return JSON.parse(raw); } catch { return contasExemplo; }
}
function salvarContasFixas(contas){ localStorage.setItem(CONTAS_FIXAS_KEY, JSON.stringify(contas)); }
function renderContasFixas(){
  const lista = document.getElementById('listaContasFixas');
  const totalEl = document.getElementById('totalContasFixas');
  if(!lista) return;
  const contas = carregarContasFixas();
  const total = contas.reduce((s,c)=>s+Number(c.valor||0),0);
  if(totalEl) totalEl.textContent = money(total);
  lista.innerHTML = contas.map((c,idx)=>`
    <div>
      <span>${c.descricao}</span>
      <strong class="${c.status === 'Pago' ? 'green' : 'red'}">${money(c.valor)}</strong>
      <small>${c.categoria} • vence dia ${c.dia} • ${c.status}
        <button class="link-action" data-pagar-conta="${idx}" type="button">${c.status === 'Pago' ? 'marcar pendente' : 'marcar pago'}</button>
        <button class="link-action danger" data-remover-conta="${idx}" type="button">remover</button>
      </small>
    </div>
  `).join('');

  document.querySelectorAll('[data-pagar-conta]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = carregarContasFixas();
      const i = Number(btn.dataset.pagarConta);
      arr[i].status = arr[i].status === 'Pago' ? 'Pendente' : 'Pago';
      salvarContasFixas(arr); renderContasFixas();
    });
  });
  document.querySelectorAll('[data-remover-conta]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = carregarContasFixas();
      arr.splice(Number(btn.dataset.removerConta),1);
      salvarContasFixas(arr); renderContasFixas();
    });
  });
}

document.getElementById('formContaFixa')?.addEventListener('submit', e=>{
  e.preventDefault();
  const contas = carregarContasFixas();
  contas.push({
    descricao: document.getElementById('contaDescricao').value,
    categoria: document.getElementById('contaCategoria').value,
    valor: Number(document.getElementById('contaValor').value || 0),
    dia: Number(document.getElementById('contaDia').value || 1),
    status:'Pendente'
  });
  salvarContasFixas(contas);
  e.target.reset();
  renderContasFixas();
});

document.getElementById('btnResetContas')?.addEventListener('click', ()=>{
  salvarContasFixas(contasExemplo);
  renderContasFixas();
});

renderContasFixas();


/* ===== Correção: botões do Financeiro funcionando sem alterar layout ===== */
const FIN_LANCAMENTOS_KEY = 'movenproFinanceiroLancamentos';
const XML_ENTRADAS_KEY = 'movenproXmlEntradas';
const PRODUTOS_KEY = 'movenproProdutosEstoque';

function carregarArray(chave){
  try{
    const arr = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function salvarArray(chave, arr){
  localStorage.setItem(chave, JSON.stringify(arr));
}

function toastFinanceiro(msg){
  let box = document.getElementById('financeToast');
  if(!box){
    box = document.createElement('div');
    box.id = 'financeToast';
    box.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:9999;background:#101827;color:#fff;padding:14px 18px;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.22);font-weight:700;max-width:320px';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  clearTimeout(window.__financeToastTimer);
  window.__financeToastTimer = setTimeout(()=> box.remove(), 3200);
}

const dadosPeriodoFinanceiro = {
  'Hoje': {entrada:18642.50, saida:7185.40, saldo:11457.10, margem:'38,7%', vendas:[4200,5200,4800,6100,7200,9400,6800], saidas:[1600,2100,1800,2600,3100,3900,2200], pagamentos:[42,24,21,13]},
  '7 dias': {entrada:73480.90, saida:28420.30, saldo:45060.60, margem:'36,4%', vendas:[8200,9100,7800,11200,12600,15400,9200], saidas:[3200,3900,2800,4100,5200,6100,3100], pagamentos:[39,25,24,12]},
  '30 dias': {entrada:286940.75, saida:119320.15, saldo:167620.60, margem:'34,9%', vendas:[58000,62400,54900,67100,44540,0,0], saidas:[24200,26000,22900,28100,18120,0,0], pagamentos:[41,22,25,12]},
  '90 dias': {entrada:842100.00, saida:361450.80, saldo:480649.20, margem:'33,8%', vendas:[182000,194500,176200,202900,86500,0,0], saidas:[78500,81200,74600,89300,37850,0,0], pagamentos:[40,23,26,11]}
};

function atualizarCardsFinanceiros(periodo){
  const real = resumoFinanceiroReal(periodo);
  const dados = real || dadosPeriodoFinanceiro[periodo] || dadosPeriodoFinanceiro['Hoje'];
  const entrada = document.getElementById('mEntrada');
  const saida = document.getElementById('mSaida');
  const saldo = document.getElementById('mSaldo');
  if(entrada) entrada.textContent = money(dados.entrada);
  if(saida) saida.textContent = money(dados.saida);
  if(saldo) saldo.textContent = money(dados.saldo);
  const margemCard = [...document.querySelectorAll('.finance-card')].find(c => c.textContent.includes('Margem estimada'));
  const margemEl = margemCard?.querySelector('h2');
  if(margemEl) margemEl.textContent = dados.margem;
}

function diasPeriodoFinanceiro(periodo){
  if(periodo === 'Hoje') return 1;
  const numero = Number(String(periodo || '').match(/\d+/)?.[0] || 1);
  return numero || 1;
}

function resumoFinanceiroReal(periodo){
  const dias = diasPeriodoFinanceiro(periodo);
  const inicio = new Date();
  inicio.setHours(0,0,0,0);
  inicio.setDate(inicio.getDate() - (dias - 1));

  const lancamentos = carregarArray(FIN_LANCAMENTOS_KEY);
  const vendas = carregarArray('movenproVendas');
  const entradasVenda = vendas.map(v => ({
    data: v.data,
    tipo: 'ENTRADA',
    bruto: Number(v.bruto || v.total || 0),
    liquido: Number(v.liquido || v.bruto || v.total || 0),
    forma: v.forma || 'Venda'
  }));

  const lista = [...lancamentos, ...entradasVenda].filter(item => {
    const data = new Date(item.data || item.criadoEm || Date.now());
    return data >= inicio;
  });

  if(!lista.length) return null;

  const entrada = lista.filter(i => i.tipo !== 'SAIDA').reduce((s,i)=>s + Number(i.liquido || i.bruto || i.valor || 0),0);
  const saida = lista.filter(i => i.tipo === 'SAIDA').reduce((s,i)=>s + Number(i.liquido || i.bruto || i.valor || 0),0);
  const saldo = entrada - saida;
  const margem = entrada > 0 ? `${((saldo / entrada) * 100).toFixed(1).replace('.',',')}%` : '0,0%';

  return {
    entrada,
    saida,
    saldo,
    margem,
    vendas: [entrada],
    saidas: [saida],
    pagamentos: [0,0,0,0]
  };
}

function configurarFiltrosPeriodo(){
  const botoes = document.querySelectorAll('.finance-filterbar button');
  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      botoes.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const periodo = btn.textContent.trim();
      atualizarCardsFinanceiros(periodo);
      atualizarGraficosPeriodo(periodo);
      toastFinanceiro(`Filtro aplicado: ${periodo}`);
    });
  });

  const loja = document.querySelector('.finance-filterbar select');
  loja?.addEventListener('change', () => toastFinanceiro(`Loja selecionada: ${loja.value}`));
}

function atualizarGraficosPeriodo(periodo){
  const dados = dadosPeriodoFinanceiro[periodo] || dadosPeriodoFinanceiro['Hoje'];
  if(chartFluxoInstance){
    chartFluxoInstance.data.datasets[0].data = dados.vendas;
    chartFluxoInstance.data.datasets[1].data = dados.saidas;
    chartFluxoInstance.data.datasets[2].data = dados.vendas.map((v,i)=> v - dados.saidas[i]);
    chartFluxoInstance.update();
  }
  if(chartPagamentosInstance){
    chartPagamentosInstance.data.datasets[0].data = dados.pagamentos;
    chartPagamentosInstance.update();
  }
}

function configurarBotaoNovaConta(){
  const btnNova = [...document.querySelectorAll('.finance-panel .mini-btn')].find(btn => btn.textContent.trim().includes('+ Nova'));
  btnNova?.addEventListener('click', () => {
    document.getElementById('contasFixas')?.scrollIntoView({behavior:'smooth', block:'start'});
    setTimeout(()=> document.getElementById('contaDescricao')?.focus(), 450);
    toastFinanceiro('Preencha a nova conta fixa no formulário.');
  });
}

function confirmarEntradaXml(){
  const entrada = window.__movenproXmlEntrada;
  if(!entrada){
    alert('Leia um XML antes de confirmar a entrada.');
    return;
  }

  const entradas = carregarArray(XML_ENTRADAS_KEY);
  const idEntrada = `XML-${Date.now()}`;
  entradas.unshift({...entrada, id:idEntrada, status:'confirmada'});
  salvarArray(XML_ENTRADAS_KEY, entradas.slice(0, 300));
  salvarEntradaXmlOnline(entrada, idEntrada);

  const financeiro = carregarArray(FIN_LANCAMENTOS_KEY);
  financeiro.unshift({
    id:`FIN-${idEntrada}`,
    data:new Date().toISOString(),
    tipo:'SAIDA',
    categoria:'Compra XML',
    descricao:`Entrada XML NF-e ${entrada.numero} - ${entrada.fornecedor}`,
    bruto:Number(entrada.total || 0),
    liquido:Number(entrada.total || 0),
    forma:'Compra / fornecedor',
    empresaId: JSON.parse(localStorage.getItem('movenproUser') || '{}').empresaId || 'moven001'
  });
  salvarArray(FIN_LANCAMENTOS_KEY, financeiro.slice(0, 1000));

  try{
    const produtos = JSON.parse(localStorage.getItem(PRODUTOS_KEY) || '[]');
    if(Array.isArray(produtos) && produtos.length){
      entrada.itens.forEach(item => {
        const nome = String(item.nome || '').trim().toLowerCase();
        const p = produtos.find(prod => String(prod.nome || '').trim().toLowerCase() === nome);
        if(p){
          const qtdEntrada = Number(String(item.qtd).replace(',','.')) || 0;
          const estoqueAtual = Number(p.qtd ?? p.estoque ?? 0);
          p.qtd = estoqueAtual + qtdEntrada;
          p.estoque = estoqueAtual + qtdEntrada;
          p.custo = Number(String(item.valor).replace(',','.')) || Number(p.custo || 0);
          p.atualizadoEm = new Date().toISOString();
        }
      });
      localStorage.setItem(PRODUTOS_KEY, JSON.stringify(produtos));
    }
  }catch(e){
    console.warn('Não foi possível atualizar estoque pelo XML:', e);
  }

  toastFinanceiro('Entrada XML confirmada. Financeiro atualizado e estoque ajustado quando encontrou produto igual.');
}

async function carregarFinanceiroOnline(){
  const lancamentos = await carregarColecaoEmpresa('financeiro', FIN_LANCAMENTOS_KEY, []);
  if(Array.isArray(lancamentos) && lancamentos.length){
    salvarArray(FIN_LANCAMENTOS_KEY, lancamentos);
    atualizarCardsFinanceiros('Hoje');
  }
}

async function salvarEntradaXmlOnline(entrada, idEntrada){
  try{
    if(!navigator.onLine) return;
    await salvarDocumentoEmpresa('xmlEntradas', idEntrada, {...entrada, id:idEntrada, status:'confirmada'});
  }catch(error){
    console.warn('Entrada XML salva localmente, mas não sincronizou no Firestore:', error);
  }
}

document.addEventListener('click', (e)=>{
  if(e.target?.id === 'btnConfirmarEntradaXml') confirmarEntradaXml();
});

configurarFiltrosPeriodo();
configurarBotaoNovaConta();
atualizarCardsFinanceiros('Hoje');
carregarFinanceiroOnline();
