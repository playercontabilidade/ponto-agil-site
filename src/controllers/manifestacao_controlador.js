const manifestacaoModel = require('../models/manifestacao');
const manifestacaoServico = require('../services/manifestacao_servico');

function exibirFormulario(req, res) {
  const tipoManifestacao = manifestacaoModel.normalizarTipoManifestacao(
    req.query.tipoManifestacao,
  );

  res.render('layouts/ouvidoria', {
    titulo: `Ouvidoria - ${manifestacaoModel.obterRotuloTipo(tipoManifestacao)}`,
    conteudoParcial: 'pages/ouvidoria',
    configOuvidoria: manifestacaoServico.montarConfigCliente(),
    tipoManifestacao,
  });
}

module.exports = {
  exibirFormulario,
};
