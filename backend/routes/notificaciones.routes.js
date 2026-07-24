const express = require('express');
const router = express.Router();

const {
    obtenerNotificaciones,
    obtenerNotificacion,
    crearNotificacion,
    actualizarNotificacion,
    eliminarNotificacion
} = require('../controllers/notificacionesController');

const verificarToken = require('../middlewares/auth');

router.get('/', obtenerNotificaciones);

router.get('/:id', obtenerNotificacion);

router.post('/', verificarToken, crearNotificacion);

router.put('/:id', verificarToken, actualizarNotificacion);

router.delete('/:id', verificarToken, eliminarNotificacion);

module.exports = router;