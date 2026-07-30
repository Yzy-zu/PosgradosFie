const express = require('express');
const router = express.Router();
const { getProgramacionExamenPorSolicitud } = require('../controllers/programacionExamenController');

router.get('/solicitud/:idSolicitud', getProgramacionExamenPorSolicitud);

module.exports = router;
