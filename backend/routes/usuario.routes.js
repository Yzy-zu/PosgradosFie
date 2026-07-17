const express = require('express');
const router = express.Router();

const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
} = require('../controllers/usuarioController');

// ==========================================
// Rutas Protegidas de Usuarios
// ==========================================
router.get(
    '/',
    verificarToken,
    validarRol('ADMIN', 'COORDINADOR'),
    obtenerUsuarios
);

router.get(
    '/:id',
    verificarToken,
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO', 'DOCENTE', 'ASPIRANTE'),
    obtenerUsuario
);

router.post(
    '/',
    verificarToken,
    validarRol('ADMIN'),
    crearUsuario
);


router.put(
    '/:id',
    verificarToken,
    validarRol('ADMIN'),
    actualizarUsuario
);


router.delete(
    '/:id',
    verificarToken,
    validarRol('ADMIN'),
    eliminarUsuario
);

module.exports = router;