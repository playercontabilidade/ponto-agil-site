const parceiroModel = require('../models/parceiro');

function obterDaRequisicao(req) {
  return parceiroModel.obterDaQuery(req.query);
}

module.exports = {
  obterDaRequisicao,
};
