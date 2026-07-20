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

module.exports = {
    obtenerPosgrados
};