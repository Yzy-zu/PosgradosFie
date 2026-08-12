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

const handleMulterError = (err, req, res, next) => {
    if (err) return res.status(400).json({ success: false, mensaje: err.message });
    next();
};

router.get('/explorador', auth, validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO'), getExploradorDocumentos);

router.post('/', auth, validarRol('ASPIRANTE'), upload.single('archivo'), handleMulterError, subirDocumento);

router.put('/reemplazar/:id', auth, validarRol('ASPIRANTE'), upload.single('archivo'), handleMulterError, reemplazarDocumento);

router.put('/evaluar/:id', auth, validarRol('ADMIN', 'DOCENTE', 'COORDINADOR'), evaluarDocumento);

module.exports = router;