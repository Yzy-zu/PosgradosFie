const express = require('express');
const router = express.Router();
const coordinadorController = require('../controllers/coordinadorController');


// 1. Aspirantes y Dictámenes
router.get('/aspirantes', coordinadorController.getAspirantes);
router.put('/solicitud/:id/dictamen', coordinadorController.actualizarDictamen);

// 2. Expedientes
router.get('/aspirante/:id/expediente', coordinadorController.getExpediente);

// 3. Catálogos y Entrevistas
router.get('/docentes', coordinadorController.getDocentes); // <--- AQUÍ
router.get('/entrevistas', coordinadorController.getEntrevistas);
router.post('/solicitud/:id/entrevista', coordinadorController.guardarEntrevista);

module.exports = router;