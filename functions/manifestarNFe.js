// Futuro: manifestação do destinatário da NF-e
exports.manifestarNFe = async function manifestarNFe(req, res) {
  res.json({ status: 'preparado', mensagem: 'Manifestação NF-e pronta para backend fiscal futuro.' });
};
