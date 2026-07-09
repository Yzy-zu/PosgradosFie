const express = require('express');
const router = express.Router();

const {
    obtenerDocentes,
    obtenerDocente,
    crearDocente,
    actualizarDocente,
    eliminarDocente
} = require('../controllers/docenteController');

// Obtener todos los docentes
router.get('/', obtenerDocentes);

// Obtener un docente por ID
router.get('/:id', obtenerDocente);

// Crear un docente
router.post('/', crearDocente);

// Actualizar un docente
router.put('/:id', actualizarDocente);

// Eliminar un docente
router.delete('/:id', eliminarDocente);

module.exports = router;