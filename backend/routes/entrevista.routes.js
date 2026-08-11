const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');
const { getEntrevistaPorSolicitud, programarEntrevista } = require('../controllers/entrevistaController');

// Aspirante consulta su entrevista
router.get('/solicitud/:idSolicitud', verificarToken, getEntrevistaPorSolicitud);

// Coordinador / docente programa o actualiza la entrevista
router.post('/:idSolicitud', verificarToken, validarRol('COORDINADOR', 'DOCENTE', 'ADMIN'), programarEntrevista);

module.exports = router;

