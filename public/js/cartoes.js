const STORAGE_KEY = 'movenproConfigPagamento';
const nomes = {
  manual:'Manual / Maquininha',
  mercado_pago:'Mercado Pago',
  getnet:'Getnet',
  pagbank:'PagBank',
  stone:'Stone'
};
const padrao = {
  gateway:'manual', ambiente:'teste', conta:'', loja:'', chavePix:'', webhook:'',
  taxas:{pix:0, debito:1.49, credito:3.49}, diasRepasse:1,
  publicKey:'', clientId:'', accessToken:'', status:'rascunho'
};
function brPercent(v){ return `${Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}%`; }
function carregar(){
  try{ return {...padrao, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {})}; }
  catch(e){ return padrao; }
}
function salvar(cfg){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
function preencher(){
  const cfg = carregar();
  document.getElementById('gatewayPagamento').value = cfg.gateway || 'manual';
  document.getElementById('ambientePagamento').value = cfg.ambiente || 'teste';
  document.getElementById('contaRecebimento').value = cfg.conta || '';
  document.getElementById('lojaGateway').value = cfg.loja || '';
  document.getElementById('chavePix').value = cfg.chavePix || '';
  document.getElementById('webhookUrl').value = cfg.webhook || '';
  document.getElementById('taxaPix').value = cfg.taxas?.pix ?? 0;
  document.getElementById('taxaDebito').value = cfg.taxas?.debito ?? 1.49;
  document.getElementById('taxaCredito').value = cfg.taxas?.credito ?? 3.49;
  document.getElementById('diasRepasse').value = cfg.diasRepasse ?? 1;
  document.getElementById('publicKey').value = cfg.publicKey || '';
  document.getElementById('clientId').value = cfg.clientId || '';
  document.getElementById('accessToken').value = cfg.accessToken || '';
  document.getElementById('statusIntegracao').value = cfg.status || 'rascunho';
  atualizarResumo(cfg);
}
function atualizarResumo(cfg){
  const nome = nomes[cfg.gateway] || 'Manual / Maquininha';
  document.getElementById('gatewayStatus').textContent = `Gateway: ${nome}`;
  document.getElementById('cardGateway').textContent = nome;
  document.getElementById('cardTaxaDebito').textContent = brPercent(cfg.taxas?.debito ?? 1.49);
  document.getElementById('cardTaxaCredito').textContent = brPercent(cfg.taxas?.credito ?? 3.49);
  document.getElementById('cardConta').textContent = cfg.conta || 'Não definida';
  const itens = [
    ['Cadastro do gateway', cfg.gateway !== 'manual'],
    ['Conta de recebimento', !!cfg.conta],
    ['Chave PIX', !!cfg.chavePix],
    ['Webhook preparado', !!cfg.webhook],
    ['Chaves técnicas preenchidas', !!(cfg.publicKey || cfg.clientId)],
    ['Backend/Firebase Functions', false]
  ];
  document.getElementById('gatewayChecklist').innerHTML = itens.map(([txt,ok])=>`<div class="check-item ${ok?'ok':'wait'}"><span>${ok?'✅':'⏳'}</span><b>${txt}</b></div>`).join('');
}
document.getElementById('paymentConfigForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const cfg = {
    gateway:document.getElementById('gatewayPagamento').value,
    ambiente:document.getElementById('ambientePagamento').value,
    conta:document.getElementById('contaRecebimento').value.trim(),
    loja:document.getElementById('lojaGateway').value.trim(),
    chavePix:document.getElementById('chavePix').value.trim(),
    webhook:document.getElementById('webhookUrl').value.trim(),
    taxas:{
      pix:Number(document.getElementById('taxaPix').value || 0),
      debito:Number(document.getElementById('taxaDebito').value || 0),
      credito:Number(document.getElementById('taxaCredito').value || 0)
    },
    diasRepasse:Number(document.getElementById('diasRepasse').value || 1),
    publicKey:document.getElementById('publicKey').value.trim(),
    clientId:document.getElementById('clientId').value.trim(),
    accessToken:document.getElementById('accessToken').value.trim(),
    status:document.getElementById('statusIntegracao').value,
    atualizadoEm:new Date().toISOString()
  };
  salvar(cfg);
  atualizarResumo(cfg);
  alert('Configuração de cartões e conta salva com sucesso.');
});
document.getElementById('btnLimparGateway')?.addEventListener('click', ()=>{
  if(confirm('Limpar a configuração de pagamento?')){ salvar(padrao); preencher(); }
});
preencher();
