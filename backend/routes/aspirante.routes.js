const express = require('express');
const router = express.Router();

const {
    registrarAspirante
} = require('../controllers/aspiranteController');

router.post('/registro', registrarAspirante);

module.exports = router;