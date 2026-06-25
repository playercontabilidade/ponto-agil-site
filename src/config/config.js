require('dotenv').config();

const config = {
  porta: Number(process.env.PORT) || 3000,
  ambiente: process.env.NODE_ENV || 'development',
  apiBaseUrl:
    process.env.PONTO_AGIL_API ||
    (process.env.NODE_ENV === 'production'
      ? 'https://pontoagil.playercontabilidade.com'
      : 'http://localhost:8080'),
};

module.exports = config;
