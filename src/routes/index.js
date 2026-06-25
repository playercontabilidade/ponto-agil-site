function montarRotas(app) {
  app.use('/api', require('./api'));
  app.use('/', require('./web'));
}

module.exports = montarRotas;
