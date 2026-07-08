const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth');

const {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
} = require('../controllers/usuarioController');

// PÚBLICAS: No llevan 'verificarToken' para que la tabla cargue libremente
router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuario);

// PROTEGIDAS: Estas sí requieren que el frontend mande el token válido
router.post('/', verificarToken, crearUsuario);
router.put('/:id', verificarToken, actualizarUsuario);
router.delete('/:id', verificarToken, eliminarUsuario);

module.exports = router;