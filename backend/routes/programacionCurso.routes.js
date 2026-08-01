const express = require('express');
const router = express.Router();
const programacionCursoController = require('../controllers/programacionCursoController');
const auth = require('../middlewares/auth');

// Obtener programación de curso propedéutico para una solicitud
router.get('/solicitud/:idSolicitud', programacionCursoController.getProgramacion);

// Programar curso propedéutico (requiere autenticación)
router.post('/:idSolicitud', auth, programacionCursoController.programarCurso);

// Capturar resultado del curso propedéutico (requiere autenticación)
router.post('/capturar/:idSolicitud', auth, programacionCursoController.capturarResultado);

module.exports = router;
