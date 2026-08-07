const api = require('../config/api');
const planoModel = require('../models/plano');
const integracaoApiServico = require('./integracao_api_servico');

async function listarPublicos() {
  const payload = await integracaoApiServico.getJson(api.endpoints.planoPublico);
  return planoModel.normalizarLista(payload);
}

function montarPrecificacao(planos) {
  return planoModel.montarPrecificacao(planos);
}

module.exports = {
  listarPublicos,
  montarPrecificacao,
};
