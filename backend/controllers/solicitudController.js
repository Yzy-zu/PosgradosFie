const db = require('../database/db');
const WorkflowService = require('../services/workflowService');
// Crear una solicitud
const crearSolicitud = async (req, res) => {
    try {
        const { idAspi, idC, idConvocatoriaOpcion } = req.body;

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
            'INSERT INTO solicitud (idAspi, idConvocatoria, idConvocatoriaOpcion) VALUES (?, ?, ?)',
            [idAspi, idC, idConvocatoriaOpcion || null]
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
            `SELECT s.*, c.tipo AS nivel, c.nombre AS convocatoriaTitulo, c.descripcion, 
                    c.fecha_inicio, c.fecha_fin, c.fechaResultados AS fecha_resultados,
                    c.fechaInicioDocumentos, c.fechaFinDocumentos,
                    c.fechaEntrevistaInicio, c.fechaEntrevistaFin,
                    c.inicioExamen, c.finExamen,
                    c.inicioCurso, c.finCurso,
                    c.fechaInicioEscolar, c.modalidad, c.duracion,
                    op.nombre AS opcionElegida,
                    mi.nombre AS modalidadNombre,
                    ep.nombre AS etapaNombre,
                    me.orden AS etapaOrden
             FROM solicitud s
             JOIN convocatorias c ON s.idConvocatoria = c.id
             LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
             LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
             LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
             LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
             LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
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

// Actualizar la modalidad seleccionada
const actualizarModalidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipoAdmision } = req.body; // El frontend ahora envía el idModalidad aquí por retrocompatibilidad temporal de variable
        const idModalidad = parseInt(tipoAdmision);

        if (!idModalidad || isNaN(idModalidad)) {
            return res.status(400).json({ mensaje: 'El ID de la modalidad es requerido.' });
        }

        const [modalidades] = await db.query('SELECT id FROM modalidad_ingreso WHERE id = ?', [idModalidad]);
        
        if (modalidades.length === 0) {
            return res.status(400).json({ mensaje: 'Modalidad no válida.' });
        }

        await WorkflowService.asignarModalidad(id, idModalidad);

        return res.status(200).json({ mensaje: 'Modalidad actualizada correctamente.' });
    } catch (error) {
        console.error('Error en actualizarModalidad:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};


// Enviar expediente a revisión (Bug 2 Fix: validación server-side de documentos obligatorios)
const enviarExpediente = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener la solicitud y su convocatoria asociada
        const [solicitudes] = await db.query('SELECT id, idConvocatoria, estado FROM solicitud WHERE id = ?', [id]);
        if (solicitudes.length === 0) {
            return res.status(404).json({ mensaje: 'La solicitud no existe.' });
        }
        const solicitud = solicitudes[0];

        if (solicitud.estado !== 'PENDIENTE') {
            return res.status(400).json({ mensaje: `La solicitud ya está en estado ${solicitud.estado} y no puede enviarse de nuevo.` });
        }

        // Obtener los requisitos OBLIGATORIOS de la convocatoria
        const [requisitosObligatorios] = await db.query(
            'SELECT id FROM convocatoria_requisitos WHERE convocatoria_id = ? AND obligatorio = 1',
            [solicitud.idConvocatoria]
        );
        if (requisitosObligatorios.length > 0) {
            const idsRequeridos = requisitosObligatorios.map(r => r.id);

            // Obtener qué requisitos YA tienen documento subido para esta solicitud
            const [docsSubidos] = await db.query(
                'SELECT DISTINCT idRequisito FROM solicitud_documentos WHERE idSolicitud = ? AND idRequisito IN (?)',
                [id, idsRequeridos]
            );

            const idsSubidos = new Set(docsSubidos.map(d => d.idRequisito));
            const faltantes = idsRequeridos.filter(reqId => !idsSubidos.has(reqId));
            if (faltantes.length > 0) {
                return res.status(400).json({
                    mensaje: `Faltan ${faltantes.length} documento(s) obligatorio(s) para enviar el expediente.`,
                    requisitasFaltantes: faltantes
                });
            }
        }

        // Todos los documentos obligatorios están presentes — cambiar estado a revisión, SIN avanzar etapa
        // La etapa se avanzará automáticamente cuando el evaluador apruebe todos los documentos
        await db.query("UPDATE solicitud SET estado = 'EN_REVISION' WHERE id = ?", [id]);

        // Emitir evento global de actualización
        req.app.get('io').emit('actualizacionGlobal');

        return res.status(200).json({ mensaje: 'Expediente enviado a revisión exitosamente.' });
    } catch (error) {
        console.error('Error en enviarExpediente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};


// Obtener modalidades (Nuevos Endpoints Fase 1)
const getModalidadesIngreso = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT id, nombre, descripcion FROM modalidad_ingreso WHERE activo = 1 ORDER BY id ASC');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en getModalidadesIngreso:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Obtener workflow
const getEtapasWorkflow = async (req, res) => {
    try {
        const { idModalidad } = req.params;
        const [resultados] = await db.query(
            `SELECT me.orden, me.obligatorio, ep.id AS etapa_id, ep.nombre AS etapa_nombre, ep.descripcion AS etapa_descripcion 
             FROM modalidad_etapa me 
             JOIN etapa_proceso ep ON me.etapa_id = ep.id 
             WHERE me.modalidad_id = ? 
             ORDER BY me.orden ASC`,
            [idModalidad]
        );
        return res.json(resultados);
    } catch (error) {
        console.error('Error en getEtapasWorkflow:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

module.exports = {
    crearSolicitud,
    getSolicitudActiva,
    cancelarSolicitud,
    actualizarModalidad,
    enviarExpediente,
    getModalidadesIngreso,
    getEtapasWorkflow
};

