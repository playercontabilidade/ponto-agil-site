function montarRotas(app) {
  app.use('/', require('./web'));
}

module.exports = montarRotas;
