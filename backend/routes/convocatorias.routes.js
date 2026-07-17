const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    obtenerConvocatorias,
    obtenerConvocatoria,
    crearConvocatorias,
    actualizarConvocatorias,
    eliminarConvocatorias
} = require('../controllers/convocatoriasController');

// Todos los usuarios autenticados pueden ver las convocatorias
router.get(
    '/',
    auth,
    obtenerConvocatorias
);

// Todos los usuarios autenticados pueden ver una convocatoria
router.get(
    '/:id',
    auth,
    obtenerConvocatoria
);

// Solo el ADMIN puede crear convocatorias
router.post(
    '/',
    auth,
    validarRol('ADMIN'),
    crearConvocatorias
);

// Solo el ADMIN puede actualizar convocatorias
router.put(
    '/:id',
    auth,
    validarRol('ADMIN'),
    actualizarConvocatorias
);

// Solo el ADMIN puede eliminar convocatorias
router.delete(
    '/:id',
    auth,
    validarRol('ADMIN'),
    eliminarConvocatorias
);

module.exports = router;