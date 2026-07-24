const db = require('../database/db');

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

// Obtener todas las opciones de posgrado (líneas de investigación)
const obtenerOpcionesPosgrado = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM opcion_posgrado WHERE activo = 1');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerOpcionesPosgrado:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener opciones de posgrado' });
    }
};

module.exports = {
    obtenerPosgrados,
    obtenerOpcionesPosgrado
};