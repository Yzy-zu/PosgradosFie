const db = require('../database/db');
const WorkflowService = require('./workflowService');
const { REQUISITOS, ETAPAS } = require('../constants');

class ValidacionPromedioService {
    /**
     * Obtiene los datos necesarios para auditar el promedio de una solicitud.
     * Incluye datos del aspirante, promedio capturado, certificado de calificaciones (ID 10),
     * título de licenciatura (ID 9), cédula profesional (ID 11) y dictamen previo.
     */
    static async obtenerDatosPromedio(idSolicitud) {
        // 1. Obtener datos de la solicitud y aspirante
        const [solicitudes] = await db.query(
            `SELECT 
                s.id AS idSolicitud,
                s.idAspi,
                s.estado AS estadoSolicitud,
                s.idModalidad,
                s.idEtapaActual,
                CONCAT(a.nombre, ' ', a.primerApellido, ' ', COALESCE(a.segundoApellido, '')) AS aspiranteNombre,
                a.curp,
                a.licenciatura,
                a.institucionLicenciatura,
                a.promedio AS promedioCapturado,
                u.correo,
                c.nombre AS programa,
                p.tipo AS posgradoTipo,
                op.nombre AS opcionNombre,
                ep.nombre AS etapaNombre
             FROM solicitud s
             JOIN aspirante a ON s.idAspi = a.id
             JOIN usuario u ON a.idUsuario = u.id
             JOIN convocatorias c ON s.idConvocatoria = c.id
             LEFT JOIN posgrado p ON c.posgrado_id = p.id
             LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
             LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
             LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
             WHERE s.id = ? AND s.estado != 'CANCELADO'`,
            [idSolicitud]
        );

        if (solicitudes.length === 0) {
            throw new Error('Solicitud no encontrada.');
        }

        const solicitud = solicitudes[0];

        // 2. Obtener documentos académicos (Certificado ID 10, Título ID 9, Cédula ID 11)
        const [documentos] = await db.query(
            `SELECT sd1.id AS idDocumento, sd1.idRequisito, sd1.rutaArchivo, sd1.estadoValidacion, sd1.comentarios, sd1.intentos, cr.nombre AS requisitoNombre, cr.categoria
             FROM solicitud_documentos sd1
             INNER JOIN (
                 SELECT idRequisito, MAX(intentos) as maxIntentos
                 FROM solicitud_documentos
                 WHERE idSolicitud = ?
                 GROUP BY idRequisito
             ) sd2 ON sd1.idRequisito = sd2.idRequisito AND sd1.intentos = sd2.maxIntentos
             JOIN catalogo_requisitos cr ON sd1.idRequisito = cr.id
             WHERE sd1.idSolicitud = ? AND sd1.idRequisito IN (?, ?, ?)`,
            [idSolicitud, idSolicitud, REQUISITOS.TITULO_LICENCIATURA, REQUISITOS.CERTIFICADO_CALIFICACIONES, REQUISITOS.CEDULA_PROFESIONAL]
        );

        const certificado = documentos.find(d => d.idRequisito === REQUISITOS.CERTIFICADO_CALIFICACIONES) || null;
        const titulo      = documentos.find(d => d.idRequisito === REQUISITOS.TITULO_LICENCIATURA)        || null;
        const cedula      = documentos.find(d => d.idRequisito === REQUISITOS.CEDULA_PROFESIONAL)         || null;

        // 3. Obtener dictamen de evaluación de promedio previo
        const [dictamen] = await db.query(
            `SELECT id, idSolicitud, promedio, promedioValido, egelValido, observaciones, fechaRevision
             FROM validacion_promedio
             WHERE idSolicitud = ?
             ORDER BY id DESC LIMIT 1`,
            [idSolicitud]
        );

        return {
            solicitud,
            documentos: {
                certificado,
                titulo,
                cedula,
                todos: documentos
            },
            dictamen: dictamen.length > 0 ? dictamen[0] : null
        };
    }

    /**
     * Guarda o actualiza el dictamen de validación de promedio e integra la transición de etapa en WorkflowService.
     */
    static async guardarDictamenPromedio({ idSolicitud, promedio, promedioValido, egelValido = null, observaciones = '' }) {
        // Verificar que exista la solicitud
        const [solicitudes] = await db.query(
            'SELECT id, idModalidad, idEtapaActual FROM solicitud WHERE id = ?',
            [idSolicitud]
        );

        if (solicitudes.length === 0) {
            throw new Error('Solicitud no encontrada.');
        }

        const esValido = (promedioValido === 1 || promedioValido === true || promedioValido === '1');
        const esEgelValido = (egelValido === 1 || egelValido === true || egelValido === '1') ? 1 : 0;
        const parsedPromedio = (promedio !== null && promedio !== undefined) ? parseFloat(promedio) : NaN;
        const promedioNum = (!isNaN(parsedPromedio)) ? parsedPromedio : null;

        // Revisar si ya existe registro en validacion_promedio
        const [existente] = await db.query(
            'SELECT id FROM validacion_promedio WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (existente.length > 0) {
            await db.query(
                `UPDATE validacion_promedio 
                 SET promedio = ?, promedioValido = ?, egelValido = ?, observaciones = ?, fechaRevision = NOW()
                 WHERE idSolicitud = ?`,
                [promedioNum, esValido ? 1 : 0, esEgelValido, observaciones, idSolicitud]
            );
        } else {
            await db.query(
                `INSERT INTO validacion_promedio (idSolicitud, promedio, promedioValido, egelValido, observaciones, fechaRevision)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [idSolicitud, promedioNum, esValido ? 1 : 0, esEgelValido, observaciones]
            );
        }

        let avanceWorkflow = null;

        if (esValido) {
            // Solo avanzamos la etapa si la solicitud se encuentra en la etapa de Validación de Promedio (ID 5)
            const idEtapaActual = solicitudes[0].idEtapaActual;
            if (idEtapaActual === ETAPAS.VALIDACION_PROMEDIO) {
                avanceWorkflow = await WorkflowService.avanzarEtapa(idSolicitud);
                if (!avanceWorkflow.completado) {
                    await db.query("UPDATE solicitud SET estado = 'EN_REVISION' WHERE id = ?", [idSolicitud]);
                } else {
                    await db.query("UPDATE solicitud SET estado = 'APROBADO' WHERE id = ?", [idSolicitud]);
                }
            } else {
                avanceWorkflow = {
                    completado: false,
                    mensaje: 'La solicitud ya fue avanzada previamente o no se encuentra en etapa de validación de promedio.'
                };
            }
        } else {
            // Si no es válido, marcar la solicitud con observaciones / rechazo
            await db.query("UPDATE solicitud SET estado = 'RECHAZADO' WHERE id = ?", [idSolicitud]);
        }

        return {
            success: true,
            promedioValido: esValido,
            avanceWorkflow
        };
    }
}

module.exports = ValidacionPromedioService;
