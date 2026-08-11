const express = require('express');
const router = express.Router();
const coordinadorController = require('../controllers/coordinadorController');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// ==========================================
// Seguridad: todas las rutas de este módulo
// requieren un token JWT válido.
// ==========================================
router.use(auth);

// ==========================================
// 1. Métricas y Estadísticas del Dashboard
// ==========================================
// GET /api/coordinador/metricas
router.get('/metricas', validarRol('COORDINADOR', 'ADMIN'), coordinadorController.getMetricas);

// ==========================================
// 2. Aspirantes, Expedientes y Dictámenes
// ==========================================
// GET /api/coordinador/aspirantes
router.get('/aspirantes', validarRol('COORDINADOR', 'ADMIN', 'SECRETARIO', 'DOCENTE'), coordinadorController.getAspirantes);

// GET /api/coordinador/aspirante/:id/expediente
router.get('/aspirante/:id/expediente', validarRol('COORDINADOR', 'ADMIN', 'SECRETARIO', 'DOCENTE'), coordinadorController.getExpediente);

// PUT /api/coordinador/solicitud/:id/dictamen
router.put('/solicitud/:id/dictamen', validarRol('COORDINADOR', 'ADMIN'), coordinadorController.actualizarDictamen);

// ==========================================
// NUEVAS RUTAS DE DICTÁMENES
// ==========================================

// GET /api/coordinador/dictamenes
router.get('/dictamenes', validarRol('COORDINADOR', 'ADMIN'), coordinadorController.getDictamenes);

// POST /api/coordinador/dictamen/:id
router.post('/dictamen/:id', validarRol('COORDINADOR', 'ADMIN'), coordinadorController.emitirDictamen);

// ==========================================
// 3. Catálogos y Entrevistas
// ==========================================
// GET /api/coordinador/docentes
router.get('/docentes', validarRol('COORDINADOR', 'ADMIN', 'SECRETARIO'), coordinadorController.getDocentes);

// GET /api/coordinador/entrevistas
router.get('/entrevistas', validarRol('COORDINADOR', 'ADMIN', 'DOCENTE'), coordinadorController.getEntrevistas);

// POST /api/coordinador/solicitud/:id/entrevista
router.post('/solicitud/:id/entrevista', validarRol('COORDINADOR', 'ADMIN'), coordinadorController.guardarEntrevista);

module.exports = router;