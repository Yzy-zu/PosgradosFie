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
    getEtapasWorkflow,
    getAccionesSolicitud,
    getSolicitudesPorModalidad,
    getSolicitudesPorModalidadCodigo,
    getSolicitudesActivas,
    getMapaProceso,
    actualizarEstadoSolicitud
} = require('../controllers/solicitudController');

router.post('/crear',        verificarToken, validarRol('ASPIRANTE'),                          crearSolicitud);
router.get('/activa/:idAspi', verificarToken,                                                    getSolicitudActiva);
router.get('/mapa/:idAspi',   verificarToken,                                                    getMapaProceso);
router.put('/cancelar/:id',  verificarToken, validarRol('ASPIRANTE', 'COORDINADOR', 'ADMIN'),    cancelarSolicitud);
router.put('/estado/:id',    verificarToken, validarRol('COORDINADOR', 'ADMIN'),                 actualizarEstadoSolicitud);
router.put('/modalidad/:id', verificarToken, validarRol('COORDINADOR', 'ADMIN'),                 actualizarModalidad);
router.put('/enviar/:id',    verificarToken, validarRol('ASPIRANTE'),                            enviarExpediente);

// Nuevos Endpoints Workflow
router.get('/ingreso/modalidades', getModalidadesIngreso);
router.get('/workflow/:idModalidad/etapas', getEtapasWorkflow);
router.get('/acciones/:id', getAccionesSolicitud);
router.get('/modalidad/:idModalidad', getSolicitudesPorModalidad);
router.get('/modalidad/codigo/:codigo', getSolicitudesPorModalidadCodigo);
router.get('/activas', getSolicitudesActivas);

module.exports = router;