const express = require('express');
const router = express.Router();

const {
    registrarAspirante,
    obtenerAspirantes,
    obtenerAspirantePorId,
    obtenerExpediente,
    obtenerTodosLosExpedientes
} = require('../controllers/aspiranteController');

router.post('/registro', registrarAspirante);
router.get('/', obtenerAspirantes);
router.get('/expedientes/todos', obtenerTodosLosExpedientes);
router.get('/:id', obtenerAspirantePorId);
router.get('/:id/expediente', obtenerExpediente);

module.exports = router;