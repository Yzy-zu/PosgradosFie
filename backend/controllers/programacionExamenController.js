const db = require('../database/db');

// Obtener detalles de la programación de examen para una solicitud específica
const getProgramacionExamenPorSolicitud = async (req, res) => {
    try {
        const { idSolicitud } = req.params;

        const [resultados] = await db.query(
            `SELECT pe.id, pe.idSolicitud, pe.fecha, pe.hora, pe.lugar, pe.observaciones, pe.creadoEn
             FROM programacion_examen pe
             WHERE pe.idSolicitud = ?`,
            [idSolicitud]
        );

        if (resultados.length === 0) {
            return res.json({ existe: false, mensaje: 'No hay fecha de examen asignada aún.' });
        }

        return res.json({ existe: true, ...resultados[0] });
    } catch (error) {
        console.error('Error en getProgramacionExamenPorSolicitud:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar datos de programación de examen.' });
    }
};

module.exports = {
    getProgramacionExamenPorSolicitud
};
