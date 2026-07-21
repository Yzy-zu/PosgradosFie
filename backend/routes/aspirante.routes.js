const express = require('express');
const router = express.Router();

// Middlewares de protección
const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Controladores
const {
    registrarAspirante,
    obtenerAspirantes,
    obtenerAspirantePorId,
    obtenerExpediente
} = require('../controllers/aspiranteController');

// ==========================================
// Rutas de Aspirantes
// ==========================================

// Registro público: Cualquier persona externa puede crear su cuenta de aspirante
router.post('/registro', registrarAspirante);
router.get('/', obtenerAspirantes);
router.get('/:id', obtenerAspirantePorId);
router.get('/:id/expediente', obtenerExpediente);

module.exports = router;