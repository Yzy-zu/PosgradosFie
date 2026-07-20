const express = require('express');
const router = express.Router();

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