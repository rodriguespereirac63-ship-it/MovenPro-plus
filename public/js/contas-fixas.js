import './dashboard.js';

const STORAGE_KEY = 'movenpro_contas_fixas';
const exemplo = [
  {descricao:'Aluguel', categoria:'Aluguel', valor:1900, dia:10, status:'Pendente'},
  {descricao:'Energia elétrica', categoria:'Luz', valor:820, dia:18, status:'Pendente'},
  {descricao:'Água', categoria:'Água', valor:210, dia:12, status:'Pendente'},
  {descricao:'Internet', categoria:'Internet', valor:149.90, dia:8, status:'Pago'},
  {descricao:'Contador', categoria:'Contador', valor:650, dia:5, status:'Pago'},
  {descricao:'Sistema/tecnologia', categoria:'Sistema', valor:260, dia:15, status:'Pendente'},
  {descricao:'Folha/diárias', categoria:'Funcionários', valor:2300, dia:30, status:'Pendente'}
];

function brl(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){ localStorage.setItem(STORAGE_KEY, JSON.stringify(exemplo)); return exemplo; }
  try { return JSON.parse(raw); } catch { return exemplo; }
}
function save(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

function render(){
  const lista = document.getElementById('listaContasFixas');
  const totalEl = document.getElementById('totalFixo');
  const impactoEl = document.getElementById('impactoMarkup');
  const contas = load();
  const total = contas.reduce((s,c)=>s+Number(c.valor||0),0);
  if(totalEl) totalEl.textContent = brl(total);
  if(impactoEl) impactoEl.textContent = ((total / 74000) * 100).toFixed(1).replace('.',',') + '%';

  if(lista){
    lista.innerHTML = contas.map((c,idx)=>`
      <div>
        <span>${c.descricao}</span>
        <strong class="${c.status === 'Pago' ? 'green' : 'red'}">${brl(c.valor)}</strong>
        <small>${c.categoria} • vence dia ${c.dia} • ${c.status}
          <button class="link-action" data-pagar="${idx}" type="button">${c.status === 'Pago' ? 'marcar pendente' : 'marcar pago'}</button>
          <button class="link-action danger" data-remover="${idx}" type="button">remover</button>
        </small>
      </div>
    `).join('');
  }

  document.querySelectorAll('[data-pagar]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = load();
      const i = Number(btn.dataset.pagar);
      arr[i].status = arr[i].status === 'Pago' ? 'Pendente' : 'Pago';
      save(arr); render();
    });
  });
  document.querySelectorAll('[data-remover]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const arr = load();
      arr.splice(Number(btn.dataset.remover),1);
      save(arr); render();
    });
  });
}

document.getElementById('formContaFixa')?.addEventListener('submit', e=>{
  e.preventDefault();
  const arr = load();
  arr.push({
    descricao: document.getElementById('contaDescricao').value,
    categoria: document.getElementById('contaCategoria').value,
    valor: Number(document.getElementById('contaValor').value || 0),
    dia: Number(document.getElementById('contaDia').value || 1),
    status:'Pendente'
  });
  save(arr);
  e.target.reset();
  render();
});

document.getElementById('btnResetContas')?.addEventListener('click', ()=>{
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exemplo));
  render();
});

render();
