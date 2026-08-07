const sistemaArquivos = require('fs');
const path = require('path');
const express = require('express');
const config = require('../src/config/config');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');

if (!sistemaArquivos.existsSync(DIST)) {
  console.error('Pasta dist/ não encontrada. Execute npm run build antes.');
  process.exit(1);
}

const aplicacao = express();

aplicacao.use(express.static(DIST));

aplicacao.get('/privacidade', (req, res) => {
  res.sendFile(path.join(DIST, 'privacidade', 'index.html'));
});

aplicacao.get('/ouvidoria', (req, res) => {
  res.sendFile(path.join(DIST, 'ouvidoria', 'index.html'));
});

aplicacao.get('/contratacao', (req, res) => {
  res.sendFile(path.join(DIST, 'contratacao', 'index.html'));
});

aplicacao.listen(config.porta, () => {
  console.log(`Preview estático em http://localhost:${config.porta}`);
});
