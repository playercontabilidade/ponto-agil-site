const config = require('../config/config');

function tratadorErro(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err.status || 500;
  const mensagem =
    config.ambiente === 'development'
      ? err.message || 'Erro interno do servidor'
      : 'Erro interno do servidor';

  res.status(status).send(mensagem);
}

module.exports = tratadorErro;
