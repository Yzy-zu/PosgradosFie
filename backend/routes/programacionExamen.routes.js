const express = require('express');
const router = express.Router();
const programacionExamenController = require('../controllers/programacionExamenController');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Obtener programación de examen para una solicitud
router.get('/solicitud/:idSolicitud', programacionExamenController.getProgramacion);

// Programar examen (requiere rol de Docente, Coordinador o Administrador)
router.post('/:idSolicitud', auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMINISTRADOR', 'ADMIN'), programacionExamenController.programarExamen);

module.exports = router;
