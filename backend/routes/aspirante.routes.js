const express = require('express');
const router = express.Router();

const {
    registrarAspirante,
    obtenerAspirantes,
    obtenerAspirantePorId
} = require('../controllers/aspiranteController');

router.post('/registro', registrarAspirante);
router.get('/', obtenerAspirantes);
router.get('/:id', obtenerAspirantePorId);

module.exports = router;