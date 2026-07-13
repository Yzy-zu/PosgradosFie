const express = require('express');
const router = express.Router();

const {

    obtenerConvocatorias,
    obtenerConvocatoria,
    crearConvocatoria,
    actualizarConvocatoria,
    eliminarConvocatoria

} = require('../controllers/convocatoriasController');

router.get('/', obtenerConvocatorias);

router.get('/:id', obtenerConvocatoria);

router.post('/', crearConvocatoria);

router.put('/:id', actualizarConvocatoria);

router.delete('/:id', eliminarConvocatoria);

module.exports = router;