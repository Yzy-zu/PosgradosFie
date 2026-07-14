const express = require('express');
const router = express.Router();

const {

    obtenerConvocatorias,
    obtenerConvocatorias,
    crearConvocatorias,
    actualizarConvocatorias,
    eliminarConvocatorias

} = require('../controllers/convocatoriasController');

router.get('/', obtenerConvocatorias);

router.get('/:id', obtenerConvocatorias);

router.post('/', crearConvocatorias);

router.put('/:id', actualizarConvocatorias);

router.delete('/:id', eliminarConvocatorias);

module.exports = router;