import './dashboard.js';
import { carregarColecaoEmpresa } from './data-sync.js';
const botoes = document.querySelectorAll('[data-periodo]');
const vendas = document.getElementById('relVendas');
const lucro = document.getElementById('relLucro');
const produtos = document.getElementById('relProdutos');
let vendasBase = [];
let financeiroBase = [];

function carregarArrayLocal(chave){
  try{
    const arr = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function filtrarPorPeriodo(arr, dias){
  const inicio = new Date();
  inicio.setHours(0,0,0,0);
  inicio.setDate(inicio.getDate() - (dias - 1));
  return arr.filter(item => new Date(item.data || item.criadoEm || Date.now()) >= inicio);
}

function atualizarRelatorio(dias){
  const vendasPeriodo = filtrarPorPeriodo(vendasBase, dias);
  const financeiroPeriodo = filtrarPorPeriodo(financeiroBase, dias);
  const totalVendas = vendasPeriodo.reduce((s,v)=>s + Number(v.bruto || v.total || 0),0);
  const saidas = financeiroPeriodo.filter(f => f.tipo === 'SAIDA').reduce((s,f)=>s + Number(f.liquido || f.bruto || f.valor || 0),0);
  const totalItens = vendasPeriodo.reduce((s,v)=>s + Number(v.itens || (v.itensDetalhados || []).reduce((a,i)=>a+Number(i.qtd||0),0)),0);
  vendas.textContent = totalVendas.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  lucro.textContent = (totalVendas - saidas).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  produtos.textContent = String(Math.round(totalItens));
}

botoes.forEach(btn=>btn.addEventListener('click',()=>{
  botoes.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  atualizarRelatorio(Number(btn.dataset.periodo || 7));
}));
document.getElementById('btnGerarPdf')?.addEventListener('click',(e)=>{e.preventDefault(); window.print();});

async function iniciarRelatorios(){
  vendasBase = carregarArrayLocal('movenproVendas');
  financeiroBase = carregarArrayLocal('movenproFinanceiroLancamentos');
  try{
    const [vendasOnline, financeiroOnline] = await Promise.all([
      carregarColecaoEmpresa('vendas', 'movenproVendas', vendasBase),
      carregarColecaoEmpresa('financeiro', 'movenproFinanceiroLancamentos', financeiroBase)
    ]);
    vendasBase = vendasOnline;
    financeiroBase = financeiroOnline;
  }catch(error){
    console.warn('Relatórios usando dados locais:', error);
  }
  atualizarRelatorio(Number(document.querySelector('[data-periodo].active')?.dataset.periodo || 7));
}

iniciarRelatorios();
