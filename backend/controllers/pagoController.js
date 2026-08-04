const db = require('../database/db');
const WorkflowService = require('../services/workflowService');
const { ETAPAS } = require('../constants');

/**
 * Obtiene el estado del pago de una solicitud.
 * Responde aunque no exista registro aún (estado PENDIENTE implícito).
 */
const getPago = async (req, res) => {
    try {
        const { idSolicitud } = req.params;

        const [rows] = await db.query(
            'SELECT id, idSolicitud, monto, referencia, comprobante, estado, observaciones, creadoEn, actualizadoEn FROM pago_solicitud WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (rows.length === 0) {
            return res.json({ existe: false, estado: 'PENDIENTE' });
        }

        return res.json({ existe: true, ...rows[0] });
    } catch (error) {
        console.error('Error en getPago:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener el pago.' });
    }
};

/**
 * El aspirante sube su comprobante de pago.
 * Crea o actualiza el registro de pago (un solo comprobante por solicitud).
 * El archivo llega via multer en req.file.
 */
const subirComprobante = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { comentarios, referencia } = req.body;
        const textoComentarios = comentarios || referencia || null;

        if (!req.file) {
            return res.status(400).json({ success: false, mensaje: 'Debes adjuntar el comprobante de pago.' });
        }

        // Verificar que la solicitud exista y esté en la etapa de Pago
        const [solicitudes] = await db.query(
            'SELECT id, idEtapaActual FROM solicitud WHERE id = ?',
            [idSolicitud]
        );

        if (solicitudes.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada.' });
        }

        if (solicitudes[0].idEtapaActual !== ETAPAS.PAGO) {
            return res.status(409).json({ success: false, mensaje: 'La solicitud no se encuentra en la etapa de Pago.' });
        }

        const rutaArchivo = req.file.filename;

        // Upsert: si ya hay un registro previo (pago rechazado y reintento), lo actualiza
        const [existing] = await db.query(
            'SELECT id FROM pago_solicitud WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE pago_solicitud
                 SET comprobante = ?, monto = NULL, referencia = ?, estado = 'PENDIENTE', observaciones = NULL
                 WHERE idSolicitud = ?`,
                [rutaArchivo, textoComentarios, idSolicitud]
            );
        } else {
            await db.query(
                'INSERT INTO pago_solicitud (idSolicitud, monto, referencia, comprobante, estado) VALUES (?, NULL, ?, ?, ?)',
                [idSolicitud, textoComentarios, rutaArchivo, 'PENDIENTE']
            );
        }

        // Bug 1 & 2: marcar EN_REVISION para que el coordinador vea que hay comprobante esperando revisión.
        // Esto cubre tanto el primer upload como la re-subida después de un rechazo.
        await db.query("UPDATE solicitud SET estado = 'EN_REVISION' WHERE id = ?", [idSolicitud]);

        req.app.get('io').emit('actualizacionGlobal');

        return res.json({ success: true, mensaje: 'Comprobante subido correctamente. En espera de verificación.' });
    } catch (error) {
        console.error('Error en subirComprobante:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al subir el comprobante.' });
    }
};

/**
 * El coordinador o secretario aprueba o rechaza el comprobante de pago.
 * Si se aprueba, avanza la solicitud a la siguiente etapa del workflow.
 */
const verificarPago = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const decision = req.body.decision || req.body.estado;
        const { observaciones } = req.body; // decision: 'APROBADO' | 'RECHAZADO'

        if (!decision || !['APROBADO', 'RECHAZADO'].includes(decision)) {
            return res.status(400).json({ success: false, mensaje: "La decisión debe ser 'APROBADO' o 'RECHAZADO'." });
        }

        if (decision === 'RECHAZADO' && !observaciones) {
            return res.status(400).json({ success: false, mensaje: 'Debes indicar el motivo del rechazo en observaciones.' });
        }

        // Verificar que exista el comprobante
        const [rows] = await db.query(
            'SELECT id FROM pago_solicitud WHERE idSolicitud = ? AND estado = ?',
            [idSolicitud, 'PENDIENTE']
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'No hay un comprobante pendiente de verificación para esta solicitud.' });
        }

        await db.query(
            'UPDATE pago_solicitud SET estado = ?, observaciones = ? WHERE idSolicitud = ?',
            [decision, observaciones || null, idSolicitud]
        );

        if (decision === 'APROBADO') {
            // Avanzar el workflow a la siguiente etapa (Programación para Examen, Curso para Curso)
            await WorkflowService.avanzarEtapa(idSolicitud);
            await db.query("UPDATE solicitud SET estado = 'PENDIENTE' WHERE id = ?", [idSolicitud]);
        } else {
            // Pago rechazado: el aspirante debe volver a subir
            await db.query("UPDATE solicitud SET estado = 'RECHAZADO' WHERE id = ?", [idSolicitud]);
        }

        req.app.get('io').emit('actualizacionGlobal');

        return res.json({
            success: true,
            mensaje: decision === 'APROBADO'
                ? 'Pago aprobado. La solicitud ha avanzado a la siguiente etapa.'
                : 'Pago rechazado. El aspirante deberá subir un nuevo comprobante.'
        });
    } catch (error) {
        console.error('Error en verificarPago:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al verificar el pago.' });
    }
};

module.exports = { getPago, subirComprobante, verificarPago };
