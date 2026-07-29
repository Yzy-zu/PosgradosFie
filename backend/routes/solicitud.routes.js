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
    actualizarModalidad,
    enviarExpediente,
    getModalidadesIngreso,
    getEtapasWorkflow
} = require('../controllers/solicitudController');

router.post('/crear', crearSolicitud);
router.get('/activa/:idAspi', getSolicitudActiva);
router.put('/cancelar/:id', cancelarSolicitud);
router.put('/modalidad/:id', actualizarModalidad);
router.put('/enviar/:id', enviarExpediente);

// Nuevos Endpoints Workflow
router.get('/ingreso/modalidades', getModalidadesIngreso);
router.get('/workflow/:idModalidad', getEtapasWorkflow);

module.exports = router;