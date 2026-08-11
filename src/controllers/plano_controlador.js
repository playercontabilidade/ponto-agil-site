const planoServico = require('../services/plano_servico');

async function listarPublicosJson(req, res, next) {
  try {
    const planos = await planoServico.listarPublicos();
    res.json(planos);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listarPublicosJson,
};
