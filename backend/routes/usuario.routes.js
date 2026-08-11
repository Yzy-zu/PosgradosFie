const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');
const validarRol    = require('../middlewares/validarRol');

const {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    cambiarPassword
} = require('../controllers/usuarioController');

// PROTEGIDAS: requieren token. GET / solo para ADMIN; GET /:id para cualquier autenticado.
router.get('/',    verificarToken, validarRol('ADMIN'), obtenerUsuarios);
router.get('/:id', verificarToken,                     obtenerUsuario);

// PROTEGIDAS: Estas sí requieren que el frontend mande el token válido
router.post('/', verificarToken, crearUsuario);
router.put('/:id', verificarToken, actualizarUsuario);
router.delete('/:id', verificarToken, eliminarUsuario);
router.put('/:id/password', verificarToken, cambiarPassword);

module.exports = router;