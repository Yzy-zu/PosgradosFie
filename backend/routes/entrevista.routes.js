const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const { getEntrevistaPorSolicitud, programarEntrevista } = require('../controllers/entrevistaController');

// Aspirante consulta su entrevista
router.get('/solicitud/:idSolicitud', verificarToken, getEntrevistaPorSolicitud);

// Coordinador / docente programa o actualiza la entrevista
router.post('/:idSolicitud', verificarToken, programarEntrevista);

module.exports = router;
