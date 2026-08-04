const express = require('express');
const router = express.Router();

// Middlewares de protección
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

// Controladores
const {
    obtenerDocentes,
    obtenerDocente,
    crearDocente,
    actualizarDocente,
    eliminarDocente
} = require('../controllers/docenteController');

// ==========================================
// Rutas Protegidas de Docentes
// ==========================================

// Obtener todos los docentes (Admin, Coordinador y Secretario pueden consultar la lista)
router.get(
    '/', 
    auth, 
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO'), 
    obtenerDocentes
);

// Obtener un docente por su idUsuario (:id = idUsua en tabla docente)
router.get(
    '/:id',
    auth,
    validarRol('ADMIN', 'COORDINADOR', 'SECRETARIO', 'DOCENTE'),
    obtenerDocente
);

// Crear un docente (Solo el Admin o el Coordinador pueden dar de alta profesores)
router.post(
    '/', 
    auth, 
    validarRol('ADMIN', 'COORDINADOR'), 
    crearDocente
);

// Actualizar un docente por su idUsuario (:id = idUsua en tabla docente)
router.put(
    '/:id',
    auth,
    validarRol('ADMIN', 'COORDINADOR', 'DOCENTE'),
    actualizarDocente
);

// Eliminar un docente por su idUsuario (:id = idUsua en tabla docente)
router.delete(
    '/:id',
    auth,
    validarRol('ADMIN'),
    eliminarDocente
);

module.exports = router;