const express = require('express');
const router = express.Router();

// Middlewares de protección y validación
const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');
const validarSolicitud = require('../middlewares/validarSolicitud');

// Controladores
const {
    crearSolicitud,
    getSolicitudActiva,
    cancelarSolicitud,
    getModalidades,
    actualizarModalidad,
    actualizarEstacion,
    enviarExpediente
} = require('../controllers/solicitudController');

router.post('/crear', crearSolicitud);
router.get('/activa/:idAspi', getSolicitudActiva);
router.put('/cancelar/:id', cancelarSolicitud);
router.get('/modalidades', getModalidades);
router.put('/modalidad/:id', actualizarModalidad);
router.put('/estacion/:id', actualizarEstacion);
router.put('/enviar/:id', enviarExpediente);

module.exports = router;