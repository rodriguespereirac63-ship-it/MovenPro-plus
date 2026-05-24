import './dashboard.js';
const dados = ['Coca-Cola 600ml — estoque 48','Skol Lata — estoque baixo','Doritos — produto parado','Água Mineral — comprar 18','Fechamento de caixa — conferir diferença'];
document.getElementById('buscaGlobal')?.addEventListener('input', e=>{ const q=e.target.value.toLowerCase(); document.getElementById('resultadoBusca').innerHTML = dados.filter(x=>x.toLowerCase().includes(q)).map(x=>`<p>${x}</p>`).join('') || '<p>Nenhum resultado.</p>'; });
