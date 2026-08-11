const express = require('express');
const router = express.Router();
const programacionCursoController = require('../controllers/programacionCursoController');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Obtener programación de curso propedéutico para una solicitud
router.get('/solicitud/:idSolicitud', programacionCursoController.getProgramacion);

// Programar curso propedéutico (Coordinador / Docente / Admin)
router.post('/:idSolicitud',          auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), programacionCursoController.programarCurso);

// Capturar resultado del curso propedéutico (Coordinador / Docente / Admin)
router.post('/capturar/:idSolicitud', auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), programacionCursoController.capturarResultado);

module.exports = router;

