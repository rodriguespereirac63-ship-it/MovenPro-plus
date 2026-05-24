import './dashboard.js';

const STORAGE_CONTAS = 'movenpro_contas_fixas';
const STORAGE_MARKUP = 'movenpro_markup_ultimo';

function brl(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function contasFixasTotal(){
  try{
    const contas = JSON.parse(localStorage.getItem(STORAGE_CONTAS) || '[]');
    const total = contas.reduce((s,c)=>s+Number(c.valor||0),0);
    return total || 6290;
  }catch{ return 6290; }
}

function calcular(){
  const produto = document.getElementById('produtoNome')?.value || 'Produto';
  const custo = Number(document.getElementById('custoProduto')?.value || 0);
  const unidades = Math.max(1, Number(document.getElementById('unidadesMes')?.value || 1));
  const imposto = Number(document.getElementById('imposto')?.value || 0) / 100;
  const taxa = Number(document.getElementById('taxaCartao')?.value || 0) / 100;
  const perdas = Number(document.getElementById('perdas')?.value || 0) / 100;
  const margem = Number(document.getElementById('margem')?.value || 0) / 100;
  const fixoTotal = contasFixasTotal();
  const fixoUnitario = fixoTotal / unidades;

  const custoBase = custo + fixoUnitario;
  const divisor = 1 - (imposto + taxa + perdas + margem);
  const preco = divisor > 0 ? custoBase / divisor : custoBase * 2;
  const lucro = preco - custo - fixoUnitario - (preco*imposto) - (preco*taxa) - (preco*perdas);

  const resultado = {produto,custo,fixoTotal,fixoUnitario,preco,lucro,imposto,taxa,perdas,margem};
  localStorage.setItem(STORAGE_MARKUP, JSON.stringify(resultado));

  document.getElementById('resCusto').textContent = brl(custo);
  document.getElementById('resFixo').textContent = brl(fixoUnitario);
  document.getElementById('resPreco').textContent = brl(preco);
  document.getElementById('resLucro').textContent = brl(lucro);

  const out = document.getElementById('markupResultado');
  if(out){
    out.innerHTML = `
      <div class="markup-box">
        <h2>${produto}</h2>
        <div class="markup-grid">
          <div><span>Custo produto</span><strong>${brl(custo)}</strong></div>
          <div><span>Contas fixas/mês</span><strong>${brl(fixoTotal)}</strong></div>
          <div><span>Custo fixo por unidade</span><strong>${brl(fixoUnitario)}</strong></div>
          <div><span>Impostos</span><strong>${(imposto*100).toFixed(2)}%</strong></div>
          <div><span>Taxa recebimento</span><strong>${(taxa*100).toFixed(2)}%</strong></div>
          <div><span>Perdas</span><strong>${(perdas*100).toFixed(2)}%</strong></div>
          <div><span>Margem desejada</span><strong>${(margem*100).toFixed(2)}%</strong></div>
          <div><span>Preço sugerido</span><strong class="green">${brl(preco)}</strong></div>
        </div>
        <p class="info-box">Esse valor considera o rateio das contas fixas cadastradas no Financeiro. Na versão online, o botão “Aplicar no estoque” pode atualizar o preço de venda do produto no banco de dados.</p>
      </div>
    `;
  }
}

document.getElementById('formMarkup')?.addEventListener('submit', e=>{
  e.preventDefault();
  calcular();
});

document.getElementById('btnAplicarPreco')?.addEventListener('click', ()=>{
  const ultimo = JSON.parse(localStorage.getItem(STORAGE_MARKUP) || '{}');
  alert(`Preço sugerido salvo para o estoque:\n${ultimo.produto || 'Produto'} → ${brl(ultimo.preco || 0)}`);
});

calcular();
