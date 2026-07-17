const db = require('../database/db');

// Obtener todo el catálogo maestro de requisitos
exports.obtenerCatalogo = (req, res) => {
    const sql = 'SELECT * FROM catalogo_requisitos ORDER BY id ASC';
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error('Error al obtener catalogo de requisitos:', err);
            return res.status(500).json({ success: false, mensaje: 'Error interno de DB' });
        }
        res.json(resultados);
    });
};
