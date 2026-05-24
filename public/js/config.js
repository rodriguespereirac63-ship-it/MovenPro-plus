import { auth, db, storage } from './firebase.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { ref, uploadString } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

// Configurações MovenPro - botões funcionando sem alterar CSS, imagens ou logo.
// Este arquivo só liga ações aos botões existentes da tela Configurações.

const STORAGE_KEYS = {
  empresa: 'movenpro_config_empresa',
  pdv: 'movenpro_config_pdv',
  usuarios: 'movenpro_config_usuarios',
  seguranca: 'movenpro_config_seguranca'
};

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function toast(msg) {
  const old = document.getElementById('moven-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'moven-toast';
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', right: '24px', bottom: '24px', zIndex: '9999',
    background: '#0f172a', color: '#fff', padding: '14px 18px', borderRadius: '14px',
    boxShadow: '0 16px 35px rgba(0,0,0,.18)', fontWeight: '800'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function openPanel(title, html) {
  const old = document.getElementById('moven-config-dialog');
  if (old) old.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'moven-config-dialog';
  Object.assign(dialog.style, {
    border: '0', borderRadius: '24px', padding: '0', width: 'min(760px, calc(100vw - 32px))',
    boxShadow: '0 24px 80px rgba(15,23,42,.25)', overflow: 'hidden'
  });
  dialog.innerHTML = `
    <div style="padding:24px;background:#fff;color:#0f172a">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px">
        <h2 style="margin:0;font-size:28px">${title}</h2>
        <button type="button" data-close-dialog style="border:0;background:#f1f5f9;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer">Fechar</button>
      </div>
      ${html}
    </div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  qs('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
  dialog.showModal();
}

function getEmpresaFormData() {
  const labels = qsa('.config-form label');
  const data = {};
  labels.forEach(label => {
    const name = label.childNodes[0]?.textContent?.trim() || 'campo';
    const input = qs('input', label);
    if (input) data[name] = input.value || input.placeholder || '';
  });
  return data;
}

function salvarEmpresa() {
  localStorage.setItem(STORAGE_KEYS.empresa, JSON.stringify(getEmpresaFormData()));
  toast('Dados da empresa salvos com sucesso.');
}

function abrirUsuarios() {
  const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.usuarios) || '[]');
  const lista = usuarios.length ? usuarios.map(u => `<tr><td>${u.nome}</td><td>${u.email}</td><td>${u.perfil}</td><td>${u.ativo ? 'Ativo' : 'Bloqueado'}</td></tr>`).join('') : '<tr><td colspan="4">Nenhum usuário extra cadastrado localmente.</td></tr>';
  openPanel('Usuários e permissões', `
    <p style="margin-top:0;color:#64748b">Gerencie usuários sem alterar o visual da tela principal.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <input id="novoNome" placeholder="Nome" style="padding:14px;border:1px solid #e2e8f0;border-radius:14px">
      <input id="novoEmail" placeholder="email@empresa.com" style="padding:14px;border:1px solid #e2e8f0;border-radius:14px">
      <select id="novoPerfil" style="padding:14px;border:1px solid #e2e8f0;border-radius:14px"><option value="admin">Admin</option><option value="funcionario">Caixa / Funcionário</option></select>
      <select id="novoAtivo" style="padding:14px;border:1px solid #e2e8f0;border-radius:14px"><option value="true">Ativo</option><option value="false">Bloqueado</option></select>
    </div>
    <button type="button" id="salvarUsuarioLocal" style="width:100%;border:0;border-radius:16px;padding:14px;background:#eab308;font-weight:900;cursor:pointer">Adicionar usuário</button>
    <div style="overflow:auto;margin-top:18px"><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Nome</th><th align="left">E-mail</th><th align="left">Perfil</th><th align="left">Status</th></tr></thead><tbody>${lista}</tbody></table></div>
    <p style="color:#64748b;font-size:13px;margin-bottom:0">Para login real, crie também o usuário no Firebase Authentication e mantenha o perfil no Firestore.</p>
  `);
  qs('#salvarUsuarioLocal')?.addEventListener('click', () => {
    const novo = {
      nome: qs('#novoNome')?.value || 'Novo usuário',
      email: qs('#novoEmail')?.value || 'sem-email',
      perfil: qs('#novoPerfil')?.value || 'funcionario',
      ativo: qs('#novoAtivo')?.value === 'true'
    };
    const atual = JSON.parse(localStorage.getItem(STORAGE_KEYS.usuarios) || '[]');
    atual.push(novo);
    localStorage.setItem(STORAGE_KEYS.usuarios, JSON.stringify(atual));
    toast('Usuário salvo localmente.');
    qs('#moven-config-dialog')?.close();
  });
}

function salvarPDV() {
  const data = {
    impressoraPadrao: 'configurável',
    somAoVender: true,
    vendaRapida: true,
    atualizadoEm: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.pdv, JSON.stringify(data));
  toast('Configurações do PDV salvas com sucesso.');
}



const BACKUP_HISTORY_KEY = 'movenpro_backup_historico';
const BACKUP_MANAGED_KEYS = [
  'movenproUser',
  'movenproProdutos',
  'movenproProdutosEstoque',
  'movenproPlusMesas',
  'movenproPlusPedidos',
  'movenproVendas',
  'movenproHistoricoVendas',
  'movenproFinanceiroLancamentos',
  'movenproXmlEntradas',
  'movenproCaixaAtual',
  'movenproCaixaMovimentos',
  'movenproFechamentos',
  'movenpro_contas_fixas',
  'movenproConfigPagamento',
  'movenproPrintersConfig',
  'movenproMonitorNfeConfig',
  'movenproFiscalEmpresa',
  'movenproFiscalNfce',
  'movenproProdutosFiscais',
  'movenpro_config_empresa',
  'movenpro_config_pdv',
  'movenpro_config_usuarios',
  'movenpro_config_seguranca'
];

function getUsuarioAtualConfig(){
  try { return JSON.parse(localStorage.getItem('movenproUser') || '{}') || {}; }
  catch(e){ return {}; }
}

function empresaIdAtualBackup(){
  const usuario = getUsuarioAtualConfig();
  return usuario.empresaId || usuario.empresa || 'movenpro-local';
}

function lerValorStorage(chave){
  const valor = localStorage.getItem(chave);
  if(valor === null) return undefined;
  try { return JSON.parse(valor); }
  catch(e){ return valor; }
}

function contarItens(valor){
  if(Array.isArray(valor)) return valor.length;
  if(valor && typeof valor === 'object') return Object.keys(valor).length;
  if(valor === undefined || valor === null || valor === '') return 0;
  return 1;
}

function coletarBackupLocal(){
  const dados = {};
  BACKUP_MANAGED_KEYS.forEach(chave => {
    const valor = lerValorStorage(chave);
    if(valor !== undefined) dados[chave] = valor;
  });

  const resumo = {
    produtos: contarItens(dados.movenproProdutosEstoque || dados.movenproProdutos),
    mesas: contarItens(dados.movenproPlusMesas),
    pedidos: contarItens(dados.movenproPlusPedidos),
    vendas: contarItens(dados.movenproVendas || dados.movenproHistoricoVendas),
    financeiro: contarItens(dados.movenproFinanceiroLancamentos),
    contasFixas: contarItens(dados.movenpro_contas_fixas),
    configuracoes: Object.keys(dados).filter(k => k.includes('config') || k.includes('Fiscal') || k.includes('Printers')).length
  };

  return {
    sistema: 'MovenPro+',
    tipo: 'backup-manual-json',
    versaoBackup: '2.0',
    criadoEm: new Date().toISOString(),
    empresaId: empresaIdAtualBackup(),
    usuario: getUsuarioAtualConfig().email || getUsuarioAtualConfig().nome || 'Admin',
    origem: location.hostname || 'local',
    resumo,
    chaves: BACKUP_MANAGED_KEYS,
    dados
  };
}

function baixarArquivo(nome, conteudo, tipo='application/json'){
  const blob = new Blob([conteudo], {type: tipo});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function salvarHistoricoBackup(item){
  const historico = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
  historico.unshift(item);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(historico.slice(0, 30)));
  atualizarResumoBackup();
}

function atualizarResumoBackup(){
  const el = document.getElementById('backupResumo');
  if(!el) return;
  const historico = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
  if(!historico.length){
    el.textContent = 'Nenhum backup gerado nesta máquina.';
    return;
  }
  const ultimo = historico[0];
  el.textContent = `Último backup: ${ultimo.dataPt} • ${ultimo.empresaId} • ${ultimo.nomeArquivo}`;
}

async function registrarBackupNoFirebase(backup, nomeArquivo, conteudoJson){
  if(!navigator.onLine || !auth?.currentUser) return {ok:false, storage:false, firestore:false};

  const caminhoStorage = `backups/${backup.empresaId}/manual/${nomeArquivo}`;
  let storageOk = false;
  let firestoreOk = false;

  try{
    await uploadString(ref(storage, caminhoStorage), conteudoJson, 'raw', {
      contentType: 'application/json',
      customMetadata: {
        empresaId: backup.empresaId,
        tipo: backup.tipo,
        origem: backup.origem || 'web'
      }
    });
    storageOk = true;
  }catch(error){
    console.warn('Backup manual baixado, mas não foi salvo no Storage:', error);
  }

  try{
    await addDoc(collection(db, 'backups'), {
      empresaId: backup.empresaId,
      criadoEm: backup.criadoEm,
      usuario: backup.usuario,
      nomeArquivo,
      caminhoStorage,
      tipo: backup.tipo,
      resumo: backup.resumo,
      chaves: backup.chaves,
      uid: auth.currentUser.uid,
      criadoEmServidor: serverTimestamp()
    });
    firestoreOk = true;
  }catch(error){
    console.warn('Backup salvo/baixado, mas não registrou histórico no Firestore:', error);
  }

  return {ok: storageOk || firestoreOk, storage: storageOk, firestore: firestoreOk, caminhoStorage};
}

async function fazerBackupManual(){
  const backup = coletarBackupLocal();
  const dataArquivo = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
  const nome = `movenpro-backup-${backup.empresaId}-${dataArquivo}.json`;
  const conteudo = JSON.stringify(backup, null, 2);
  baixarArquivo(nome, conteudo);

  let online = {ok:false, storage:false, firestore:false};
  try{ online = await registrarBackupNoFirebase(backup, nome, conteudo); }
  catch(error){ console.warn('Backup baixado, mas não registrou histórico online:', error); }

  salvarHistoricoBackup({
    nomeArquivo: nome,
    empresaId: backup.empresaId,
    criadoEm: backup.criadoEm,
    dataPt: new Date(backup.criadoEm).toLocaleString('pt-BR'),
    resumo: backup.resumo,
    online: online.ok,
    storage: online.storage,
    firestore: online.firestore,
    caminhoStorage: online.caminhoStorage || ''
  });

  if(online.storage && online.firestore) toast('Backup baixado e salvo no Firebase Storage.');
  else if(online.storage) toast('Backup baixado e salvo no Storage.');
  else if(online.firestore) toast('Backup baixado e registrado no Firebase.');
  else toast('Backup baixado com sucesso. Histórico online não registrado.');
}

function validarBackup(backup){
  if(!backup || typeof backup !== 'object') return 'Arquivo inválido.';
  if(!backup.dados || typeof backup.dados !== 'object') return 'Arquivo sem dados para restaurar.';
  if(!String(backup.sistema || '').startsWith('MovenPro')) return 'Este arquivo não parece ser backup do MovenPro.';
  return '';
}

function restaurarBackupManual(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if(!file) return;
    try{
      const backup = JSON.parse(await file.text());
      const erro = validarBackup(backup);
      if(erro){ alert(erro); return; }
      const empresaAtual = empresaIdAtualBackup();
      const empresaBackup = backup.empresaId || 'sem-empresa';
      const avisoEmpresa = empresaAtual !== empresaBackup
        ? `\n\nAtenção: empresa atual (${empresaAtual}) é diferente da empresa do backup (${empresaBackup}).`
        : '';
      if(!confirm(`Restaurar este backup? Os dados locais atuais serão substituídos pelas chaves do arquivo.${avisoEmpresa}`)) return;

      Object.entries(backup.dados).forEach(([chave, valor]) => {
        localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor));
      });
      salvarHistoricoBackup({
        nomeArquivo: file.name,
        empresaId: empresaBackup,
        criadoEm: new Date().toISOString(),
        dataPt: new Date().toLocaleString('pt-BR'),
        resumo: backup.resumo || {},
        online: false,
        restaurado: true
      });
      toast('Backup restaurado. Recarregue o sistema para atualizar as telas.');
    }catch(error){
      console.error(error);
      alert('Não foi possível restaurar o backup. Verifique se o arquivo é JSON válido.');
    }
  });
  input.click();
}

function abrirHistoricoBackup(){
  const historico = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
  const linhas = historico.length ? historico.map(item => `
    <tr>
      <td>${item.dataPt || '-'}</td>
      <td>${item.empresaId || '-'}</td>
      <td>${item.nomeArquivo || '-'}</td>
      <td>${item.restaurado ? 'Restaurado' : 'Gerado'}${item.storage ? ' + Storage' : ''}${item.firestore ? ' + Firestore' : (item.online ? ' + Firebase' : '')}</td>
    </tr>`).join('') : '<tr><td colspan="4">Nenhum histórico local nesta máquina.</td></tr>';
  openPanel('Histórico de backups', `
    <div style="overflow:auto;max-height:420px">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th align="left">Data</th><th align="left">Empresa</th><th align="left">Arquivo</th><th align="left">Status</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p style="color:#64748b;font-size:13px;margin-bottom:0">O histórico fica salvo neste navegador. O arquivo .json baixado é o backup principal.</p>
  `);
}


// V23 - Configuração de impressoras de rede ESC/POS
const PRINTERS_KEY = 'movenproPrintersConfig';
function carregarImpressoras(){
  try{
    const data = JSON.parse(localStorage.getItem(PRINTERS_KEY) || '{}');
    if(document.getElementById('printerCozinhaAtiva')) document.getElementById('printerCozinhaAtiva').value = data.cozinhaAtiva || 'sim';
    if(document.getElementById('printerCozinhaIp')) document.getElementById('printerCozinhaIp').value = data.cozinhaIp || '';
    if(document.getElementById('printerCozinhaPort')) document.getElementById('printerCozinhaPort').value = data.cozinhaPort || '9100';
    if(document.getElementById('printerBarAtiva')) document.getElementById('printerBarAtiva').value = data.barAtiva || 'sim';
    if(document.getElementById('printerBarIp')) document.getElementById('printerBarIp').value = data.barIp || '';
    if(document.getElementById('printerBarPort')) document.getElementById('printerBarPort').value = data.barPort || '9100';
  }catch(e){ console.warn('Configuração de impressoras inválida', e); }
}
function salvarImpressoras(){
  const data = {
    cozinhaAtiva: document.getElementById('printerCozinhaAtiva')?.value || 'sim',
    cozinhaIp: document.getElementById('printerCozinhaIp')?.value || '',
    cozinhaPort: document.getElementById('printerCozinhaPort')?.value || '9100',
    barAtiva: document.getElementById('printerBarAtiva')?.value || 'sim',
    barIp: document.getElementById('printerBarIp')?.value || '',
    barPort: document.getElementById('printerBarPort')?.value || '9100',
    atualizadoEm: new Date().toISOString()
  };
  localStorage.setItem(PRINTERS_KEY, JSON.stringify(data));
  toast('Configurações de impressora salvas.');
}
function testarImpressora(setor){
  const data = JSON.parse(localStorage.getItem(PRINTERS_KEY) || '{}');
  const ip = setor === 'bar' ? data.barIp : data.cozinhaIp;
  const porta = setor === 'bar' ? data.barPort : data.cozinhaPort;
  if(!ip){ alert('Informe o IP da impressora antes do teste.'); return; }
  toast(`Teste preparado para ${setor === 'bar' ? 'Bar' : 'Cozinha'} em ${ip}:${porta}.`);
}
document.getElementById('savePrintersBtn')?.addEventListener('click', salvarImpressoras);
document.getElementById('testCozinhaBtn')?.addEventListener('click', ()=>testarImpressora('cozinha'));
document.getElementById('testBarBtn')?.addEventListener('click', ()=>testarImpressora('bar'));
carregarImpressoras();

document.getElementById('backupGerarBtn')?.addEventListener('click', fazerBackupManual);
document.getElementById('backupRestaurarBtn')?.addEventListener('click', restaurarBackupManual);
document.getElementById('backupHistoricoBtn')?.addEventListener('click', abrirHistoricoBackup);
atualizarResumoBackup();
