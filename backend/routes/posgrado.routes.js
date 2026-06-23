const express = require('express');
const router = express.Router();

const posgradoController = require('../controllers/posgradoController');

router.get('/', posgradoController.obtenerPosgrados);

module.exports = router;