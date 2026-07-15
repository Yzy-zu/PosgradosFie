const express = require('express');
const router = express.Router();

const {
    obtenerNotificaciones,
    obtenerNotificacion,
    crearNotificacion,
    actualizarNotificacion,
    eliminarNotificacion
} = require('../controllers/notificacionesController');

router.get('/', obtenerNotificaciones);

router.get('/:id', obtenerNotificacion);

router.post('/', crearNotificacion);

router.put('/:id', actualizarNotificacion);

router.delete('/:id', eliminarNotificacion);

module.exports = router;