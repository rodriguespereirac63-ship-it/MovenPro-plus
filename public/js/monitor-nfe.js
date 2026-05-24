import './dashboard.js';

const STORAGE_KEY = 'movenproMonitorNfeConfig';
const notasMock = [
  { fornecedor: 'Coca-Cola FEMSA', numero: '12354', valor: 350.00, status: 'Aguardando aprovação' },
  { fornecedor: 'Distribuidora Sul', numero: '84521', valor: 1240.00, status: 'Nova' },
  { fornecedor: 'Atacadão Bebidas', numero: '77890', valor: 1650.00, status: 'Importada' }
];

const modo = document.getElementById('modoEntradaNfe');
const intervalo = document.getElementById('intervaloBuscaNfe');
const ambiente = document.getElementById('ambienteMonitorNfe');
const statusMonitor = document.getElementById('statusMonitorNfe');
const badge = document.getElementById('modoAtualBadge');
const explicacao = document.getElementById('explicacaoModo');
const lista = document.getElementById('listaNotasNfe');
const form = document.getElementById('formMonitorNfe');

function carregarConfig(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function salvarConfig(){
  const config = {
    modo: modo.value,
    intervalo: intervalo.value,
    ambiente: ambiente.value,
    status: statusMonitor.value,
    atualizarEstoque: document.getElementById('acaoEstoque').checked,
    criarFinanceiro: document.getElementById('acaoFinanceiro').checked,
    atualizarCusto: document.getElementById('acaoCusto').checked,
    vincularFornecedor: document.getElementById('acaoFornecedor').checked,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  atualizarTela();
  alert('Configuração do Monitor NF-e salva.');
}

function aplicarConfig(){
  const c = carregarConfig();
  if(c.modo) modo.value = c.modo;
  if(c.intervalo) intervalo.value = c.intervalo;
  if(c.ambiente) ambiente.value = c.ambiente;
  if(c.status) statusMonitor.value = c.status;
  if(typeof c.atualizarEstoque === 'boolean') document.getElementById('acaoEstoque').checked = c.atualizarEstoque;
  if(typeof c.criarFinanceiro === 'boolean') document.getElementById('acaoFinanceiro').checked = c.criarFinanceiro;
  if(typeof c.atualizarCusto === 'boolean') document.getElementById('acaoCusto').checked = c.atualizarCusto;
  if(typeof c.vincularFornecedor === 'boolean') document.getElementById('acaoFornecedor').checked = c.vincularFornecedor;
}

function atualizarTela(){
  const textos = {
    manual: ['Modo: Manual XML', 'O cliente importa o XML manualmente. O sistema lê a nota, mostra os itens e só atualiza estoque/financeiro depois da confirmação.'],
    autorizacao: ['Modo: Autorização', 'O sistema encontra notas automaticamente, mas pede aprovação antes de lançar produtos no estoque e contas no financeiro.'],
    automatico: ['Modo: Automático', 'O sistema consulta notas, baixa XML, lança estoque e cria contas a pagar sem intervenção. Use somente depois de homologar com segurança.']
  };
  const escolhido = textos[modo.value] || textos.autorizacao;
  badge.textContent = escolhido[0];
  explicacao.innerHTML = `<div><strong>${escolhido[0]}</strong><span>${escolhido[1]}</span></div><div><strong>Backend necessário</strong><span>Firebase Functions + certificado A1 + consulta DF-e/SEFAZ.</span></div>`;
}

function renderNotas(){
  lista.innerHTML = notasMock.map(n => {
    const acao = n.status === 'Importada' ? '<span class="green">Concluída</span>' : '<button class="small-action" type="button">Autorizar entrada</button>';
    return `<tr><td>${n.fornecedor}</td><td>${n.numero}</td><td>R$ ${n.valor.toFixed(2).replace('.', ',')}</td><td>${n.status}</td><td>${acao}</td></tr>`;
  }).join('');
}

form?.addEventListener('submit', (e)=>{ e.preventDefault(); salvarConfig(); });
modo?.addEventListener('change', atualizarTela);

aplicarConfig();
atualizarTela();
renderNotas();
