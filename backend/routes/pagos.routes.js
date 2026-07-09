const express = require('express');

const router = express.Router();

const {

    obtenerPagos,
    obtenerPago,
    crearPago,
    actualizarPago,
    eliminarPago

} = require('../controllers/pagosController');

router.get('/', obtenerPagos);

router.get('/:id', obtenerPago);

router.post('/', crearPago);

router.put('/:id', actualizarPago);

router.delete('/:id', eliminarPago);

module.exports = router;