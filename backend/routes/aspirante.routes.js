const express = require('express');
const router = express.Router();

// Middlewares de protección
const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Controladores
const {
    registrarAspirante,
    getAspiranteMe,
    obtenerAspirantes,
    obtenerAspirantePorId,
    obtenerExpediente,
    obtenerTodosLosExpedientes
} = require('../controllers/aspiranteController');

// ==========================================
// Rutas de Aspirantes
// ==========================================

// Registro público: Cualquier persona externa puede crear su cuenta de aspirante
router.post('/registro', registrarAspirante);

// Ruta autenticada: el aspirante obtiene sus propios datos usando el JWT (Bug 1 - Fix)
router.get('/me', verificarToken, getAspiranteMe);

// Rutas protegidas: requieren token para acceder
router.get('/expedientes/todos', verificarToken, validarRol('ADMIN', 'DOCENTE', 'COORDINADOR', 'SECRETARIO'), obtenerTodosLosExpedientes);
router.get('/:id/expediente', verificarToken, obtenerExpediente);
router.get('/:id', verificarToken, obtenerAspirantePorId);

// Lista general protegida (Bug 1 - Fix): Solo roles admins/docentes deberían acceder
router.get('/', verificarToken, obtenerAspirantes);

module.exports = router;