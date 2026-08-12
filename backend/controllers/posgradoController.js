const db = require('../database/db');
const emit = require('../utils/socketEmit');

// Obtener todos los posgrados
const obtenerPosgrados = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM posgrado');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerPosgrados:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener posgrados' });
    }
};

// Obtener todas las opciones de posgrado activas (usado en vistas públicas/aspirantes)
const obtenerOpcionesPosgrado = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM opcion_posgrado WHERE activo = 1');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerOpcionesPosgrado:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener opciones de posgrado' });
    }
};

// Obtener todas las opciones de posgrado por posgrado_id (incluye inactivas)
const obtenerOpcionesPorPosgradoId = async (req, res) => {
    const { posgrado_id } = req.params;
    try {
        const [resultados] = await db.query('SELECT * FROM opcion_posgrado WHERE posgrado_id = ?', [posgrado_id]);
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerOpcionesPorPosgradoId:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener opciones' });
    }
};


const crearOpcionPosgrado = async (req, res) => {
    const { posgrado_id, nombre, descripcion, activo } = req.body;
    try {
        const estadoActivo = activo !== undefined ? activo : 1;
        const [resultado] = await db.query(
            'INSERT INTO opcion_posgrado (posgrado_id, nombre, descripcion, activo) VALUES (?, ?, ?, ?)',
            [posgrado_id, nombre, descripcion, estadoActivo]
        );
        if (req.app.get('io')) emit.aAdminYAspirantes(req);
        return res.status(201).json({ success: true, id: resultado.insertId, mensaje: 'Especialidad creada correctamente' });
    } catch (error) {
        console.error('Error en crearOpcionPosgrado:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear la especialidad' });
    }
};

// Actualizar una opción de posgrado
const actualizarOpcionPosgrado = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;
    try {
        await db.query(
            'UPDATE opcion_posgrado SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?',
            [nombre, descripcion, activo, id]
        );
        if (req.app.get('io')) emit.aAdminYAspirantes(req);
        return res.json({ success: true, mensaje: 'Especialidad actualizada correctamente' });
    } catch (error) {
        console.error('Error en actualizarOpcionPosgrado:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar la especialidad' });
    }
};

module.exports = {
    obtenerPosgrados,
    obtenerOpcionesPosgrado,
    obtenerOpcionesPorPosgradoId,
    crearOpcionPosgrado,
    actualizarOpcionPosgrado
};