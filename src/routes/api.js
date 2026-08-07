const express = require('express');
const PlanoControlador = require('../controllers/plano_controlador');

const router = express.Router();

router.get('/planos', PlanoControlador.listarPublicosJson);

module.exports = router;
