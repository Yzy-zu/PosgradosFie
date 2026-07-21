const express = require('express');
const router = express.Router();

const {
    registrarAspirante,
    obtenerAspirantes,
    obtenerAspirantePorId,
    obtenerExpediente
} = require('../controllers/aspiranteController');

router.post('/registro', registrarAspirante);
router.get('/', obtenerAspirantes);
router.get('/:id', obtenerAspirantePorId);
router.get('/:id/expediente', obtenerExpediente);

module.exports = router;