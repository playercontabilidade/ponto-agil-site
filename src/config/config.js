require('dotenv').config();

const config = {
  porta: Number(process.env.PORT) || 3000,
  ambiente: process.env.NODE_ENV || 'development',
  apiBaseUrl:
    process.env.PONTO_AGIL_API || 'https://pontoagil.playercontabilidade.com',
};

module.exports = config;
