const express = require('express');
const router = express.Router();

const {

    obtenerConvocatorias,
    obtenerConvocatoria,
    crearConvocatorias,
    actualizarConvocatorias,
    eliminarConvocatorias,
    obtenerRequisitosConvocatoria

} = require('../controllers/convocatoriasController');

router.get('/', obtenerConvocatorias);

router.get('/:id', obtenerConvocatoria);

router.get('/:id/requisitos', obtenerRequisitosConvocatoria);

router.post('/', crearConvocatorias);

router.put('/:id', actualizarConvocatorias);

router.delete('/:id', eliminarConvocatorias);

module.exports = router;