const express = require('express');
const router = express.Router();

const {
    crearSolicitud
} = require('../controllers/solicitudController');

router.post('/crear', crearSolicitud);

module.exports = router;