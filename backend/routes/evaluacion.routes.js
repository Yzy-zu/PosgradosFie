const express = require('express');
const router = express.Router();

const {

    obtenerEvaluaciones,
    obtenerEvaluacion,
    crearEvaluacion,
    actualizarEvaluacion,
    eliminarEvaluacion

} = require('../controllers/evaluacionController');

router.get('/', obtenerEvaluaciones);

router.get('/:id', obtenerEvaluacion);

router.post('/', crearEvaluacion);

router.put('/:id', actualizarEvaluacion);

router.delete('/:id', eliminarEvaluacion);

module.exports = router;