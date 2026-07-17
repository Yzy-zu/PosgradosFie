const express = require('express');
const router = express.Router();

// Middlewares de protección
const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Controladores
const {
    registrarAspirante,
    obtenerAspirantes,
    obtenerAspirantePorId
} = require('../controllers/aspiranteController');

// ==========================================
// Rutas de Aspirantes
// ==========================================

// Registro público: Cualquier persona externa puede crear su cuenta de aspirante
router.post('/registro', registrarAspirante);

// Obtener todos los aspirantes (Solo el Admin y el Coordinador gestionan la lista completa)
router.get(
    '/',
    verificarToken,
    validarRol('ADMIN', 'COORDINADOR'),
    obtenerAspirantes
);

router.get(
    '/:id',
    verificarToken,
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO', 'ASPIRANTE'),
    obtenerAspirantePorId
);

module.exports = router;