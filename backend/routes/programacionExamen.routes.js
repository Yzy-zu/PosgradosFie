const express = require('express');
const router = express.Router();
const programacionExamenController = require('../controllers/programacionExamenController');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Obtener programación de examen para una solicitud
router.get('/solicitud/:idSolicitud', programacionExamenController.getProgramacion);

// Programar examen (requiere rol de Docente, Coordinador o Admin)
router.post('/:idSolicitud',          auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), programacionExamenController.programarExamen);

// Confirmar aplicación del examen
router.post('/confirmar/:idSolicitud', auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), programacionExamenController.confirmarExamen);

// Capturar resultado del examen
router.post('/capturar/:idSolicitud', auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), programacionExamenController.capturarResultado);

module.exports = router;

