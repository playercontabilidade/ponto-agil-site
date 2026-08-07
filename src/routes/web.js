const express = require('express');
const PaginaControlador = require('../controllers/pagina_controlador');

const router = express.Router();

router.get('/', PaginaControlador.exibirInicio);
router.get('/privacidade', PaginaControlador.exibirPrivacidade);
router.get('/privacidade.html', (req, res) => res.redirect(301, '/privacidade'));

module.exports = router;
