const db = require('../database/db');
const WorkflowService = require('../services/workflowService');

/**
 * GET /api/entrevista/solicitud/:idSolicitud
 * Devuelve los datos de la entrevista programada para una solicitud.
 * Usado por el aspirante para ver su cita de entrevista.
 */
const getEntrevistaPorSolicitud = async (req, res) => {
    try {
        const { idSolicitud } = req.params;

        const [rows] = await db.query(
            `SELECT e.id, DATE_FORMAT(e.fecha, '%Y-%m-%d') AS fecha, e.hora, e.lugar, e.enlace, e.estatus,
                    CONCAT(d.nombre, ' ', d.primerApellido, ' ', IFNULL(d.segundoApellido,'')) AS docenteNombre
             FROM entrevistas e
             LEFT JOIN docente d ON d.id = e.idDocente
             WHERE e.idSolicitud = ?
             LIMIT 1`,
            [idSolicitud]
        );

        if (rows.length === 0) {
            return res.json({ existe: false, mensaje: 'Aún no hay entrevista programada para esta solicitud.' });
        }

        return res.json({ existe: true, ...rows[0] });
    } catch (error) {
        console.error('Error en getEntrevistaPorSolicitud:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar la entrevista.' });
    }
};

/**
 * POST /api/entrevista/:idSolicitud
 * El coordinador/docente programa o actualiza una entrevista.
 * Si es la primera vez, avanza la etapa de la solicitud.
 */
const programarEntrevista = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { fecha, hora, lugar, enlace, idDocente } = req.body;

        if (!fecha || !hora) {
            return res.status(400).json({ success: false, mensaje: 'Fecha y hora son obligatorias.' });
        }

        // Verificar si ya existe entrevista
        const [existente] = await db.query(
            'SELECT id FROM entrevistas WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (existente.length > 0) {
            // Actualizar sin avanzar etapa
            await db.query(
                `UPDATE entrevistas
                    SET fecha = ?, hora = ?, lugar = ?, enlace = ?, idDocente = ?, estatus = 'PROGRAMADA'
                  WHERE idSolicitud = ?`,
                [fecha, hora, lugar || null, enlace || null, idDocente || null, idSolicitud]
            );
            return res.json({ success: true, mensaje: 'Entrevista actualizada correctamente.' });
        } else {
            // Primera vez: insertar y avanzar etapa
            await db.query(
                `INSERT INTO entrevistas (idSolicitud, idDocente, fecha, hora, lugar, enlace, estatus)
                 VALUES (?, ?, ?, ?, ?, ?, 'PROGRAMADA')`,
                [idSolicitud, idDocente || null, fecha, hora, lugar || null, enlace || null]
            );

            // Avanzar etapa en el workflow
            await WorkflowService.avanzarEtapa(parseInt(idSolicitud));

            return res.json({ success: true, mensaje: 'Entrevista programada y etapa avanzada correctamente.' });
        }
    } catch (error) {
        console.error('Error en programarEntrevista:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al programar la entrevista.' });
    }
};

module.exports = {
    getEntrevistaPorSolicitud,
    programarEntrevista
};
