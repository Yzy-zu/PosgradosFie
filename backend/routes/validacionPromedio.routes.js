const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    getValidacionPromedio,
    guardarValidacionPromedio
} = require('../controllers/validacionPromedioController');

// Rutas protegidas para evaluación de promedio
router.get(
    '/:idSolicitud',
    auth,
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO', 'DOCENTE', 'ASPIRANTE'),
    getValidacionPromedio
);

router.post(
    '/guardar',
    auth,
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO', 'DOCENTE'),
    guardarValidacionPromedio
);

module.exports = router;
