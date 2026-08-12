const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    obtenerConvocatorias,
    obtenerConvocatoria,
    crearConvocatorias,
    actualizarConvocatorias,
    eliminarConvocatorias,
    obtenerRequisitosConvocatoria
} = require('../controllers/convocatoriasController');


// ==============================================
// CONSULTAR CONVOCATORIAS
// ==============================================

// Todos los usuarios autenticados pueden consultar
router.get(
    '/',
    auth,
    obtenerConvocatorias
);

// Consultar una convocatoria
router.get(
    '/:id',
    auth,
    obtenerConvocatoria
);

// Consultar requisitos
router.get(
    '/:id/requisitos',
    auth,
    obtenerRequisitosConvocatoria
);


// ==============================================
// CREAR CONVOCATORIA
// ==============================================

router.post(
    '/',
    auth,
    validarRol('ADMIN', 'COORDINADOR'),
    crearConvocatorias
);


// ==============================================
// ACTUALIZAR CONVOCATORIA
// ==============================================

router.put(
    '/:id',
    auth,
    validarRol('ADMIN', 'COORDINADOR'),
    actualizarConvocatorias
);


// ==============================================

// ==============================================

router.delete(
    '/:id',
    auth,
    validarRol('ADMIN', 'COORDINADOR'),
    eliminarConvocatorias
);

module.exports = router;