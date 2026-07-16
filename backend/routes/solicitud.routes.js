const express = require('express');
const router = express.Router();

const {
    crearSolicitud,
    getSolicitudActiva,
    cancelarSolicitud
} = require('../controllers/solicitudController');

router.post('/crear', crearSolicitud);
router.get('/activa/:idAspi', getSolicitudActiva);
router.put('/cancelar/:id', cancelarSolicitud);

module.exports = router;