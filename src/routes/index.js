function montarRotas(app) {
  app.use('/api', require('./api'));
  app.use('/ouvidoria', require('./ouvidoria'));
  app.use('/', require('./web'));
}

module.exports = montarRotas;
