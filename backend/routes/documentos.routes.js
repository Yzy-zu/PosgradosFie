const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    subirDocumento,
    evaluarDocumento,
    reemplazarDocumento,
    getExploradorDocumentos
} = require('../controllers/documentoController');

router.get('/explorador', auth, validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO'), getExploradorDocumentos);

router.post('/', upload.single('archivo'), subirDocumento);

router.put('/reemplazar/:id', auth, validarRol('ASPIRANTE'), upload.single('archivo'), reemplazarDocumento);

router.put('/evaluar/:id', auth, validarRol('ADMIN', 'DOCENTE', 'COORDINADOR'), evaluarDocumento);

module.exports = router;