const express = require('express');
const router = express.Router();

const verificarToken = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    cambiarPassword
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

<<<<<<< HEAD
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
=======
// PROTEGIDAS: Estas sí requieren que el frontend mande el token válido
router.post('/', verificarToken, crearUsuario);
router.put('/:id', verificarToken, actualizarUsuario);
router.delete('/:id', verificarToken, eliminarUsuario);
router.put('/:id/password', verificarToken, cambiarPassword);
>>>>>>> c8499856640f3616eea34a938798895ce1695dde

module.exports = router;