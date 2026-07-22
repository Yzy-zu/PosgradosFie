const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');

const {
    subirDocumento,
    obtenerDocumentos,
    obtenerDocumento,
    actualizarDocumento,
    eliminarDocumento,
    evaluarDocumento
} = require('../controllers/documentoController');

router.post('/', upload.single('archivo'), subirDocumento);

router.get('/', obtenerDocumentos);

router.get('/:id', obtenerDocumento);

router.put('/evaluar/:id', evaluarDocumento);

router.put('/:id', actualizarDocumento);

router.delete('/:id', eliminarDocumento);

module.exports = router;