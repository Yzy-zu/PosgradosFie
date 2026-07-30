const express = require('express');
const router = express.Router();
const coordinadorController = require('../controllers/coordinadorController');

// ==========================================
// 1. Métricas y Estadísticas del Dashboard
// ==========================================
// GET /api/coordinador/metricas
router.get('/metricas', coordinadorController.getMetricas);

// ==========================================
// 2. Aspirantes, Expedientes y Dictámenes
// ==========================================
// GET /api/coordinador/aspirantes
router.get('/aspirantes', coordinadorController.getAspirantes);

// GET /api/coordinador/aspirante/:id/expediente
router.get('/aspirante/:id/expediente', coordinadorController.getExpediente);

// PUT /api/coordinador/solicitud/:id/dictamen
router.put('/solicitud/:id/dictamen', coordinadorController.actualizarDictamen);

// ==========================================
// 3. Catálogos y Entrevistas
// ==========================================
// GET /api/coordinador/docentes
router.get('/docentes', coordinadorController.getDocentes);

// GET /api/coordinador/entrevistas
router.get('/entrevistas', coordinadorController.getEntrevistas);

// POST /api/coordinador/solicitud/:id/entrevista
router.post('/solicitud/:id/entrevista', coordinadorController.guardarEntrevista);

module.exports = router;