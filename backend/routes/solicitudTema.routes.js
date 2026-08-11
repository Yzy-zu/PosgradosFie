const express = require('express');
const router = express.Router();
const solicitudTemaController = require('../controllers/solicitudTemaController');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Obtener todos los temas de evaluación de una solicitud
router.get('/:idSolicitud', auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), solicitudTemaController.getTemasDeSolicitud);

// Actualizar calificación y docente de un tema específico
router.put('/:idSolicitudTema', auth, validarRol('DOCENTE', 'COORDINADOR', 'ADMIN'), solicitudTemaController.actualizarCalificacionTema);

module.exports = router;
