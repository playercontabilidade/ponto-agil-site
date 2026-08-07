const configuracaoApi = require('../config/api');
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
      apiBaseUrl: configuracaoApi.baseUrl,
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
    apiBaseUrl: configuracaoApi.baseUrl,
  });
};

const exibirContratacao = (req, res) => {
  res.render('pages/contratacao', {
    apiBaseUrl: configuracaoApi.baseUrl,
  });
};

module.exports = {
  exibirInicio,
  exibirPrivacidade,
  exibirContratacao,
};
