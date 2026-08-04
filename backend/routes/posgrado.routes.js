const express = require('express');
const router = express.Router();

const posgradoController = require('../controllers/posgradoController');

// Obtener todos los posgrados
router.get(
    '/',
    posgradoController.obtenerPosgrados
);

// Obtener todas las opciones activas (público)
router.get(
    '/opciones',
    posgradoController.obtenerOpcionesPosgrado
);

// Obtener todas las opciones por ID de posgrado (para admin)
router.get(
    '/opciones/todas/:posgrado_id',
    posgradoController.obtenerOpcionesPorPosgradoId
);

// Crear nueva opción de posgrado
router.post(
    '/opciones',
    posgradoController.crearOpcionPosgrado
);

// Actualizar opción de posgrado
router.put(
    '/opciones/:id',
    posgradoController.actualizarOpcionPosgrado
);

module.exports = router;