const express = require('express');
const router = express.Router();
const { obtenerCatalogo } = require('../controllers/requisitosController');

router.get('/', obtenerCatalogo);

module.exports = router;
