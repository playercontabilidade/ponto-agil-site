const express = require('express');
const PaginaControlador = require('../controllers/pagina_controlador');

const router = express.Router();

router.get('/', PaginaControlador.exibirInicio);
router.get('/privacidade', PaginaControlador.exibirPrivacidade);
router.get('/privacidade.html', (req, res) => res.redirect(301, '/privacidade'));
router.get('/contratacao', PaginaControlador.exibirContratacao);
router.get('/contratacao/', PaginaControlador.exibirContratacao);
router.get('/contratacao/index.html', (req, res) => res.redirect(301, '/contratacao'));

module.exports = router;
