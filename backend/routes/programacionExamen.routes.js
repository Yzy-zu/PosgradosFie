const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');

const {
    crearProgramacion,
    obtenerProgramacion,
    actualizarProgramacion,
    cancelarProgramacion
} = require('../controllers/programacionExamenController');

// Todas las rutas requieren autenticación y rol DOCENTE o ADMIN
router.use(auth);
router.use(validarRol('DOCENTE', 'ADMIN'));

// Crear nueva programación
router.post('/', crearProgramacion);

// Obtener programación por ID de solicitud
router.get('/:idSolicitud', obtenerProgramacion);

// Actualizar programación por ID de programación
router.put('/:id', actualizarProgramacion);

// Cancelar/eliminar programación por ID de programación
router.delete('/:id', cancelarProgramacion);

module.exports = router;
