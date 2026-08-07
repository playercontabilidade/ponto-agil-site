const express = require('express');
const ManifestacaoControlador = require('../controllers/manifestacao_controlador');

const router = express.Router();

router.get('/', ManifestacaoControlador.exibirFormulario);
router.get('/index.html', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, `/ouvidoria${query}`);
});

module.exports = router;
