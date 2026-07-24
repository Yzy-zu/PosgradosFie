const db = require('../database/db');

// Crear una solicitud
const crearSolicitud = async (req, res) => {
    try {
        const { idAspi, idC } = req.body;

        if (!idAspi || !idC) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
        }

        // Verificar que exista el aspirante
        const [aspirante] = await db.query('SELECT id FROM aspirante WHERE id = ?', [idAspi]);
        if (aspirante.length === 0) {
            return res.status(404).json({ mensaje: 'El aspirante no existe.' });
        }

        // Verificar que exista la convocatoria
        const [convocatoria] = await db.query('SELECT id FROM convocatorias WHERE id = ?', [idC]);
        if (convocatoria.length === 0) {
            return res.status(404).json({ mensaje: 'El posgrado no existe.' });
        }

        // Buscar solicitudes activas del aspirante
        const [solicitudes] = await db.query(
            "SELECT * FROM solicitud WHERE idAspi = ? AND estado != 'CANCELADO'",
            [idAspi]
        );

        if (solicitudes.length > 0) {
            const match = solicitudes.find(s => s.idConvocatoria == idC);

            if (match) {
                return res.status(200).json({
                    mensaje: 'Solicitud recuperada.',
                    idSolicitud: match.id
                });
            } else {
                return res.status(409).json({
                    mensaje: 'Acceso denegado: Ya tienes un proceso de admisión en curso.'
                });
            }
        }

        // Insertar nueva solicitud
        const [resultado] = await db.query(
            'INSERT INTO solicitud (idAspi, idConvocatoria) VALUES (?, ?)',
            [idAspi, idC]
        );

        // Emitir evento global
        req.app.get('io').emit('actualizacionGlobal');

        return res.status(201).json({
            mensaje: 'Solicitud creada correctamente.',
            idSolicitud: resultado.insertId
        });
    } catch (error) {
        console.error('Error en crearSolicitud:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Obtener la solicitud activa de un aspirante
const getSolicitudActiva = async (req, res) => {
    try {
        const { idAspi } = req.params;

        const [resultados] = await db.query(
            `SELECT s.*, c.tipo AS nivel
             FROM solicitud s
             JOIN convocatorias c ON s.idConvocatoria = c.id
             WHERE s.idAspi = ? AND s.estado != 'CANCELADO'
             ORDER BY s.creadoEn DESC LIMIT 1`,
            [idAspi]
        );

        if (resultados.length > 0) {
            return res.status(200).json({ existe: true, ...resultados[0] });
        } else {
            return res.status(200).json({ existe: false });
        }
    } catch (error) {
        console.error('Error en getSolicitudActiva:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Cancelar solicitud
const cancelarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("UPDATE solicitud SET estado = 'CANCELADO' WHERE id = ?", [id]);
        return res.status(200).json({ mensaje: 'Solicitud cancelada exitosamente.' });
    } catch (error) {
        console.error('Error en cancelarSolicitud:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Obtener las modalidades de admisión desde el ENUM de la BD
const getModalidades = async (req, res) => {
    try {
        const [resultado] = await db.query("SHOW COLUMNS FROM solicitud LIKE 'tipoAdmision'");

        if (resultado.length > 0) {
            const enumStr = resultado[0].Type;
            const matches = enumStr.match(/'([^']+)'/g);
            if (matches) {
                const opciones = matches.map(m => m.replace(/'/g, ''));
                return res.status(200).json(opciones);
            }
        }

        return res.status(404).json({ mensaje: 'No se encontraron modalidades.' });
    } catch (error) {
        console.error('Error en getModalidades:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Actualizar la modalidad seleccionada
const actualizarModalidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipoAdmision } = req.body;

        if (!tipoAdmision) {
            return res.status(400).json({ mensaje: 'El tipo de admisión es requerido.' });
        }

        await db.query('UPDATE solicitud SET tipoAdmision = ? WHERE id = ?', [tipoAdmision, id]);
        return res.status(200).json({ mensaje: 'Modalidad actualizada correctamente.' });
    } catch (error) {
        console.error('Error en actualizarModalidad:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Actualizar la estación actual de una solicitud
const actualizarEstacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { estacion_actual } = req.body;

        if (estacion_actual === undefined) {
            return res.status(400).json({ mensaje: 'Falta estacion_actual' });
        }

        await db.query('UPDATE solicitud SET estacion_actual = ? WHERE id = ?', [estacion_actual, id]);
        return res.json({ mensaje: 'Estación actualizada correctamente' });
    } catch (error) {
        console.error('Error en actualizarEstacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Enviar expediente a revisión
const enviarExpediente = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("UPDATE solicitud SET estado = 'EN_REVISION', estacion_actual = 4 WHERE id = ?", [id]);
        return res.status(200).json({ mensaje: 'Expediente enviado a revisión exitosamente.' });
    } catch (error) {
        console.error('Error en enviarExpediente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

module.exports = {
    crearSolicitud,
    getSolicitudActiva,
    cancelarSolicitud,
    getModalidades,
    actualizarModalidad,
    actualizarEstacion,
    enviarExpediente
};
