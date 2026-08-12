const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');
const upload = require('../middlewares/upload');
const { getPago, subirComprobante, verificarPago } = require('../controllers/pagoController');

const handleMulterError = (err, req, res, next) => {
    if (err) return res.status(400).json({ success: false, mensaje: err.message });
    next();
};

// Obtener estado del pago de una solicitud (aspirante, coordinador, secretario, docente, admin)
router.get('/:idSolicitud', auth, validarRol('ASPIRANTE', 'COORDINADOR', 'SECRETARIO', 'DOCENTE', 'ADMIN'), getPago);

// Aspirante sube su comprobante de pago
router.post('/subir/:idSolicitud', auth, validarRol('ASPIRANTE'), upload.single('comprobante'), handleMulterError, subirComprobante);

// Coordinador, Secretario o Docente aprueban o rechazan el comprobante
router.put('/verificar/:idSolicitud', auth, validarRol('COORDINADOR', 'SECRETARIO', 'DOCENTE', 'ADMIN'), verificarPago);

module.exports = router;
