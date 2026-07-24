const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');

const {
    subirDocumento,
    obtenerDocumentos,
    obtenerDocumento,
    actualizarDocumento,
    eliminarDocumento,
    evaluarDocumento,
    reemplazarDocumento
} = require('../controllers/documentoController');

router.post('/', upload.single('archivo'), subirDocumento);

router.put('/reemplazar/:id', upload.single('archivo'), reemplazarDocumento);

router.get('/', obtenerDocumentos);

router.get('/:id', obtenerDocumento);

router.put('/evaluar/:id', evaluarDocumento);

router.put('/:id', actualizarDocumento);

router.delete('/:id', eliminarDocumento);

module.exports = router;