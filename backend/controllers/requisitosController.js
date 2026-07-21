const db = require('../database/db');

// Obtener todo el catálogo maestro de requisitos
const obtenerCatalogo = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM catalogo_requisitos ORDER BY id ASC');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerCatalogo:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno de DB' });
    }
};

module.exports = {
    obtenerCatalogo
};
