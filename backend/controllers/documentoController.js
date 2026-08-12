const db = require('../database/db');
const WorkflowService = require('../services/workflowService');
const emit = require('../utils/socketEmit');
const { ETAPAS } = require('../constants');

// Obtener todos los documentos para el explorador
const getExploradorDocumentos = async (req, res) => {
    try {
        const query = `
            SELECT 
                COALESCE(p.nombre, 'Sin Programa') AS programa,
                s.id AS idSolicitud,
                a.id AS aspiranteId,
                CONCAT(a.nombre, ' ', a.primerApellido, IFNULL(CONCAT(' ', a.segundoApellido), '')) AS aspiranteNombreCompleto,
                sd.id AS idDocumento,
                cr.nombre AS requisitoNombre,
                sd.rutaArchivo,
                sd.estadoValidacion,
                sd.intentos
            FROM solicitud_documentos sd
            JOIN solicitud s ON sd.idSolicitud = s.id
            JOIN aspirante a ON s.idAspi = a.id
            JOIN convocatorias c ON s.idConvocatoria = c.id
            LEFT JOIN posgrado p ON c.posgrado_id = p.id
            JOIN catalogo_requisitos cr ON sd.idRequisito = cr.id
            WHERE sd.id IN (
                SELECT MAX(id) 
                FROM solicitud_documentos 
                GROUP BY idSolicitud, idRequisito
            )
            ORDER BY p.nombre, a.primerApellido, a.nombre, cr.nombre;
        `;
        const [documentos] = await db.query(query);
        return res.json({ success: true, documentos });
    } catch (error) {
        console.error('Error en getExploradorDocumentos:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener documentos para el explorador.' });
    }
};

// Subir documento
const subirDocumento = async (req, res) => {
    try {
        const { idSoli, idRequisito, tipoDoc } = req.body;

        if (!idSoli || (!idRequisito && !tipoDoc)) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios para guardar el documento.' });
        }

        if (!req.file) {
            return res.status(400).json({ mensaje: 'Debe seleccionar un archivo.' });
        }

        // Verificar que exista la solicitud, su estado y etapa actual
        const [solicitud] = await db.query(
            'SELECT id, idAspi, estado, idEtapaActual FROM solicitud WHERE id = ?', [idSoli]
        );
        if (solicitud.length === 0) {
            return res.status(404).json({ mensaje: 'La solicitud no existe.' });
        }

        // C-03: verificar que la solicitud pertenece al aspirante autenticado
        const [aspirante] = await db.query('SELECT id FROM aspirante WHERE idUsuario = ?', [req.usuario.id]);
        if (aspirante.length === 0 || solicitud[0].idAspi !== aspirante[0].id) {
            return res.status(403).json({ mensaje: 'Acceso denegado: esta solicitud no te pertenece.' });
        }

        // C-10: solo se pueden subir documentos en la etapa de Documentación
        if (solicitud[0].idEtapaActual !== ETAPAS.DOCUMENTACION) {
            return res.status(403).json({ mensaje: 'Acceso denegado: la subida de documentos solo está habilitada en la etapa de Documentación.' });
        }

        // Validación de Seguridad: Sólo se pueden subir archivos si la solicitud está PENDIENTE
        if (solicitud[0].estado !== 'PENDIENTE') {
            return res.status(403).json({ mensaje: 'Acceso Denegado: La solicitud está en revisión o ya fue procesada, no puedes alterar sus documentos.' });
        }

        if (idRequisito) {
            // Flujo nuevo: tabla solicitud_documentos
            const [resultado] = await db.query(
                `INSERT INTO solicitud_documentos (idSolicitud, idRequisito, rutaArchivo, estadoValidacion)
                 VALUES (?, ?, ?, 'PENDIENTE')`,
                [idSoli, idRequisito, req.file.filename]
            );
            // Notificar a ADMIN y DOCENTE (aspirante subió un documento)
            emit.aAdminYDocente(req);
            return res.status(201).json({ mensaje: 'Documento registrado correctamente.', idDocumento: resultado.insertId });
        } else {
            // Flujo viejo (compatibilidad): tabla documento
            const [resultado] = await db.query(
                'INSERT INTO documento (idSoli, tipoDoc, rutaArchivo) VALUES (?, ?, ?)',
                [idSoli, tipoDoc, req.file.filename]
            );
            return res.status(201).json({ mensaje: 'Documento registrado correctamente.', idDocumento: resultado.insertId });
        }
    } catch (error) {
        console.error('Error en subirDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};




// Evaluar documento (flujo nuevo: solicitud_documentos)
const evaluarDocumento = async (req, res) => {
    try {
        const { id } = req.params; // ID de solicitud_documentos
        const { estadoValidacion, comentarios } = req.body; // PENDIENTE, APROBADO, RECHAZADO

        if (!['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(estadoValidacion)) {
            return res.status(400).json({ mensaje: 'Estado de validación inválido.' });
        }

        // Obtener el ID de la solicitud
        const [doc] = await db.query('SELECT idSolicitud FROM solicitud_documentos WHERE id = ?', [id]);
        if (doc.length === 0) {
            return res.status(404).json({ mensaje: 'Documento no encontrado.' });
        }
        const idSolicitud = doc[0].idSolicitud;

        // Actualizar el documento
        await db.query(
            'UPDATE solicitud_documentos SET estadoValidacion = ?, comentarios = ? WHERE id = ?',
            [estadoValidacion, comentarios || null, id]
        );

        // Lógica delegada al WorkflowService para evaluar transición
        const nuevoEstadoSolicitud = await WorkflowService.evaluarTransicionDocumentacion(idSolicitud);

        // Notificar al aspirante específico + ADMIN (docente evaluó un documento)
        const [solInfo] = await db.query(
            'SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?',
            [idSolicitud]
        );
        if (solInfo.length > 0) {
            emit.aAspiranteEspecifico(req, solInfo[0].idUsuario);
        } else {
            emit.aAdmin(req);
        }
        return res.json({ success: true, mensaje: 'Documento evaluado correctamente.', nuevoEstadoSolicitud });
    } catch (error) {
        console.error('Error en evaluarDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al evaluar documento.' });
    }
};

// Reemplazar / Re-subir documento rechazado (Máximo 3 intentos)
const reemplazarDocumento = async (req, res) => {
    try {
        const { id } = req.params; // ID de solicitud_documentos

        if (!req.file) {
            return res.status(400).json({ mensaje: 'Debe seleccionar un archivo para reemplazo.' });
        }

        const [doc] = await db.query('SELECT * FROM solicitud_documentos WHERE id = ?', [id]);
        if (doc.length === 0) {
            return res.status(404).json({ mensaje: 'Documento no encontrado.' });
        }
        const documentData = doc[0];

        // C-03: verificar que la solicitud del documento pertenece al aspirante autenticado
        const [aspirante] = await db.query('SELECT id FROM aspirante WHERE idUsuario = ?', [req.usuario.id]);
        if (aspirante.length === 0) {
            return res.status(403).json({ mensaje: 'Acceso denegado: no se encontró perfil de aspirante.' });
        }
        const [solicitud] = await db.query('SELECT idAspi, idEtapaActual, estado FROM solicitud WHERE id = ?', [documentData.idSolicitud]);
        if (solicitud.length === 0 || solicitud[0].idAspi !== aspirante[0].id) {
            return res.status(403).json({ mensaje: 'Acceso denegado: este documento no te pertenece.' });
        }

        const ETAPAS = require('../constants').ETAPAS;
        if (solicitud[0].idEtapaActual !== ETAPAS.DOCUMENTACION) {
            return res.status(400).json({ mensaje: 'La solicitud no se encuentra en la etapa de documentación.' });
        }
        if (solicitud[0].estado !== 'PENDIENTE' && solicitud[0].estado !== 'EN_REVISION' && solicitud[0].estado !== 'RECHAZADO') {
            return res.status(400).json({ mensaje: `La solicitud debe estar activa (Pendiente, En Revisión o Rechazada) para reemplazar documentos. Estado actual: ${solicitud[0].estado}` });
        }

        if (documentData.estadoValidacion !== 'RECHAZADO') {
            return res.status(400).json({ mensaje: 'Sólo se pueden volver a subir documentos que hayan sido rechazados.' });
        }

        // Obtener el número máximo de intentos actual para esta combinación de idSolicitud e idRequisito
        const [intentosQuery] = await db.query(
            'SELECT MAX(intentos) as maxIntentos FROM solicitud_documentos WHERE idSolicitud = ? AND idRequisito = ?',
            [documentData.idSolicitud, documentData.idRequisito]
        );

        const ultimoIntento = (intentosQuery[0] && intentosQuery[0].maxIntentos) 
            ? intentosQuery[0].maxIntentos 
            : (documentData.intentos || 1);

        if (ultimoIntento >= 3) {
            return res.status(403).json({ mensaje: 'Has alcanzado el límite máximo de 3 intentos para este documento.' });
        }

        const nuevosIntentos = ultimoIntento + 1;

        // Insertar NUEVA FILA para registrar el nuevo intento conservando el historial anterior
        const [resultado] = await db.query(
            `INSERT INTO solicitud_documentos (idSolicitud, idRequisito, rutaArchivo, estadoValidacion, comentarios, intentos)
             VALUES (?, ?, ?, 'PENDIENTE', NULL, ?)`,
            [documentData.idSolicitud, documentData.idRequisito, req.file.filename, nuevosIntentos]
        );

        // Recalcular estado de la solicitud basándose únicamente en los ÚLTIMOS intentos de cada requisito
        await WorkflowService.evaluarTransicionDocumentacion(documentData.idSolicitud);

        // Notificar a ADMIN y DOCENTE (aspirante reemplazó un documento)
        emit.aAdminYDocente(req);

        return res.json({ 
            success: true, 
            mensaje: `Intento ${nuevosIntentos} de 3 registrado con éxito.`,
            idDocumento: resultado.insertId,
            intentos: nuevosIntentos 
        });

    } catch (error) {
        console.error('Error en reemplazarDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno al re-subir documento.' });
    }
};

module.exports = {
    subirDocumento,
    evaluarDocumento,
    reemplazarDocumento,
    getExploradorDocumentos
};