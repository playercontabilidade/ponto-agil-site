const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('../src/config/config');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('Pasta dist/ não encontrada. Execute npm run build antes.');
  process.exit(1);
}

const app = express();

app.use(express.static(DIST));

app.get('/privacidade', (req, res) => {
  res.sendFile(path.join(DIST, 'privacidade', 'index.html'));
});

app.get('/ouvidoria', (req, res) => {
  res.sendFile(path.join(DIST, 'ouvidoria', 'index.html'));
});

app.listen(config.porta, () => {
  console.log(`Preview estático em http://localhost:${config.porta}`);
});
