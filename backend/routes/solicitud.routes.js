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
    cancelarSolicitud
} = require('../controllers/solicitudController');

// ==========================================
// Rutas de Solicitudes
// ==========================================

// Crear una solicitud: Solo un ASPIRANTE puede iniciar su trámite, pasando por la validación de datos
router.post(
    '/crear',
    verificarToken,
    validarRol('ASPIRANTE'),
    validarSolicitud,
    crearSolicitud
);

// Obtener la solicitud activa de un aspirante por su ID
router.get(
    '/activa/:idAspi',
    verificarToken,
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO', 'ASPIRANTE'),
    getSolicitudActiva
);

// Cancelar una solicitud: El ASPIRANTE puede desistir de su trámite, o un ADMIN/COORDINADOR puede cancelarla por reglamento
router.put(
    '/cancelar/:id',
    verificarToken,
    validarRol('ADMIN', 'COORDINADOR', 'ASPIRANTE'),
    cancelarSolicitud
);

module.exports = router;