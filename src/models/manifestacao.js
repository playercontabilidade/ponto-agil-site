const api = require('../config/api');

const tiposManifestacao = api.tiposManifestacao;
const tipoManifestacaoPadrao = api.tipoManifestacaoPadrao;

function normalizarTipoManifestacao(valor) {
  const tipo = String(valor ?? '')
    .trim()
    .toUpperCase();
  if (tiposManifestacao.includes(tipo)) return tipo;
  return tipoManifestacaoPadrao;
}

function obterRotuloTipo(tipo) {
  return api.rotulosTipoManifestacao[tipo] || tipo;
}

module.exports = {
  tiposManifestacao,
  tipoManifestacaoPadrao,
  normalizarTipoManifestacao,
  obterRotuloTipo,
};
