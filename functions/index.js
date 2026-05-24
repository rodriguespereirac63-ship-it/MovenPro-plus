const functions = require("firebase-functions/v1");
const admin = require('firebase-admin');

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'movenpromais';

if (!admin.apps.length) {
  admin.initializeApp();
}

const COLECOES_EMPRESA = [
  'produtos',
  'estoque',
  'vendas',
  'mesas',
  'pedidosRestaurante',
  'financeiro',
  'caixas',
  'caixaMovimentos',
  'configuracoes',
  'impressoras',
  'fiscal',
  'backups'
];

async function lerColecaoEmpresa(db, empresaId, colecao) {
  const mapa = new Map();

  try {
    const subSnap = await db.collection('empresas').doc(empresaId).collection(colecao).get();
    subSnap.docs.forEach((doc) => mapa.set(doc.id, { id: doc.id, origem: 'empresas-subcolecao', ...doc.data() }));
  } catch (error) {
    console.warn(`Falha lendo empresas/${empresaId}/${colecao}:`, error.message || error);
  }

  try {
    const raizSnap = await db.collection(colecao).where('empresaId', '==', empresaId).get();
    raizSnap.docs.forEach((doc) => {
      if (!mapa.has(doc.id)) mapa.set(doc.id, { id: doc.id, origem: 'colecao-raiz', ...doc.data() });
    });
  } catch (error) {
    console.warn(`Falha lendo coleção raiz ${colecao}:`, error.message || error);
  }

  return Array.from(mapa.values());
}

async function listarEmpresas(db) {
  const ids = new Set();

  try {
    const empresasSnap = await db.collection('empresas').get();
    empresasSnap.docs.forEach((doc) => {
      if (doc.id) ids.add(doc.id);
    });
  } catch (error) {
    console.warn('Falha listando empresas:', error.message || error);
  }

  for (const colecao of COLECOES_EMPRESA) {
    try {
      const snap = await db.collection(colecao).limit(500).get();
      snap.docs.forEach((doc) => {
        const empresaId = doc.data() && doc.data().empresaId;
        if (empresaId) ids.add(empresaId);
      });
    } catch (error) {
      console.warn(`Falha buscando empresaId em ${colecao}:`, error.message || error);
    }
  }

  return ids.size ? Array.from(ids) : ['moven001'];
}

async function executarBackupAutomatico() {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const empresas = await listarEmpresas(db);
  const agora = new Date();
  const stamp = agora.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  for (const empresaId of empresas) {
    const dados = {};

    for (const colecao of COLECOES_EMPRESA) {
      dados[colecao] = await lerColecaoEmpresa(db, empresaId, colecao);
    }

    const backup = {
      sistema: 'MovenPro+',
      tipo: 'backup-automatico-storage',
      versaoBackup: '4.2-gen1-estavel',
      empresaId,
      criadoEm: agora.toISOString(),
      colecoes: COLECOES_EMPRESA,
      resumo: Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
      dados
    };

    const caminho = `backups/${empresaId}/automatico/backup-${stamp}.json`;
    await bucket.file(caminho).save(JSON.stringify(backup, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-store',
        metadata: { empresaId, tipo: 'backup-automatico-storage' }
      }
    });

    await db.collection('empresas').doc(empresaId).collection('backups').doc(`automatico-${stamp}`).set({
      empresaId,
      tipo: 'backup-automatico-storage',
      caminhoStorage: caminho,
      criadoEm: agora.toISOString(),
      criadoEmServidor: admin.firestore.FieldValue.serverTimestamp(),
      resumo: backup.resumo
    }, { merge: true });
  }

  console.log(`Backup automático concluído para ${empresas.length} empresa(s).`);
  return { ok: true, empresas: empresas.length, criadoEm: agora.toISOString() };
}

// Mantido em 1ª geração e com os nomes antigos para não acionar criação Cloud Run Gen2.
exports.backupAutomaticoDiario = functions
  .region('us-east1')
  .runWith({ memory: '512MB', timeoutSeconds: 540 })
  .pubsub.schedule('every day 03:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => executarBackupAutomatico());

exports.healthCheckBackup = functions
  .region('us-east1')
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .https.onRequest((req, res) => {
    res.status(200).json({
      ok: true,
      service: 'MovenPro+ Backup',
      generation: 'gen1-estavel',
      timestamp: new Date().toISOString()
    });
  });

// Endpoint manual opcional para testar o backup sem esperar o agendamento.
exports.executarBackupManual = functions
  .region('us-east1')
  .runWith({ memory: '512MB', timeoutSeconds: 540 })
  .https.onRequest(async (req, res) => {
    try {
      const resultado = await executarBackupAutomatico();
      res.status(200).json(resultado);
    } catch (error) {
      console.error('Falha no backup manual:', error);
      res.status(500).json({ ok: false, erro: error.message || String(error) });
    }
  });
