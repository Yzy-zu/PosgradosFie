const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

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

router.put('/reemplazar/:id', auth, validarRol('ASPIRANTE'), upload.single('archivo'), reemplazarDocumento);

router.get('/', obtenerDocumentos);

router.get('/:id', obtenerDocumento);

router.put('/evaluar/:id', auth, validarRol('ADMIN', 'DOCENTE', 'COORDINADOR'), evaluarDocumento);

router.put('/:id', actualizarDocumento);

router.delete('/:id', eliminarDocumento);

module.exports = router;