const express = require('express');
const router = express.Router();

const {

    obtenerConvocatorias,
    obtenerConvocatoria,
    crearConvocatoria,
    actualizarConvocatorias,
    eliminarConvocatorias

} = require('../controllers/convocatoriasController');

router.get('/', obtenerConvocatorias);

router.get('/:id', obtenerConvocatoria);

router.post('/', crearConvocatoria);

router.put('/:id', actualizarConvocatorias);

router.delete('/:id', eliminarConvocatorias);

module.exports = router;