const express = require('express');
const router = express.Router();

const posgradoController = require('../controllers/posgradoController');

router.get(
    '/',
    posgradoController.obtenerPosgrados
);

router.get(
    '/opciones',
    posgradoController.obtenerOpcionesPosgrado
);

module.exports = router;