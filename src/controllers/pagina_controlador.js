const exibirInicio = (req, res) => {
  res.render('layouts/main', {
    titulo: 'Ponto Ágil - Gestão de Ponto Eletrônico e RH',
    pagina: 'inicio',
    conteudoParcial: 'pages/index',
    estiloPagina: null,
    exibirWhatsapp: true,
  });
};

const exibirPrivacidade = (req, res) => {
  res.render('layouts/main', {
    titulo: 'Política de Privacidade - Ponto Ágil',
    pagina: 'privacidade',
    conteudoParcial: 'pages/privacidade',
    estiloPagina: 'privacidade',
    exibirWhatsapp: false,
  });
};

module.exports = {
  exibirInicio,
  exibirPrivacidade,
};
