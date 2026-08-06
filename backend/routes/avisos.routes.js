const express = require('express');
const router = express.Router();
const avisosController = require('../controllers/avisosController');
const auth = require('../middlewares/auth');

// Endpoint público o protegido por sesión para aspirantes (solo activos)
// Como están en el dashboard de aspirante logueado, auth está bien.
router.get('/activos', avisosController.obtenerAvisosActivos);

module.exports = router;
