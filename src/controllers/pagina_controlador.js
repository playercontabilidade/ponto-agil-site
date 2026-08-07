const api = require('../config/api');
const planoServico = require('../services/plano_servico');
const parceiroControlador = require('./parceiro_controlador');

async function exibirInicio(req, res, next) {
  try {
    let planos = [];
    let precificacao = null;

    try {
      planos = await planoServico.listarPublicos();
      precificacao = planoServico.montarPrecificacao(planos);
    } catch (erro) {
      console.warn('Planos indisponíveis no servidor:', erro.message);
    }

    res.render('layouts/main', {
      titulo: 'Ponto Ágil - Gestão de Ponto Eletrônico e RH',
      pagina: 'inicio',
      conteudoParcial: 'pages/index',
      estiloPagina: null,
      exibirWhatsapp: true,
      planos,
      precificacao,
      parceiro: parceiroControlador.obterDaRequisicao(req),
      apiBaseUrl: api.baseUrl,
    });
  } catch (erro) {
    next(erro);
  }
}

const exibirPrivacidade = (req, res) => {
  res.render('layouts/main', {
    titulo: 'Política de Privacidade - Ponto Ágil',
    pagina: 'privacidade',
    conteudoParcial: 'pages/privacidade',
    estiloPagina: 'privacidade',
    exibirWhatsapp: false,
    apiBaseUrl: api.baseUrl,
  });
};

module.exports = {
  exibirInicio,
  exibirPrivacidade,
};
