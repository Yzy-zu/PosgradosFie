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
                    me.orden AS etapaOrden,
                    re.calificacion, re.aprobado AS resultadoAprobado, re.observaciones AS resultadoObservaciones, re.fechaCaptura
             FROM solicitud s
             JOIN convocatorias c ON s.idConvocatoria = c.id
             LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
             LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
             LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
             LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
             LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
             LEFT JOIN resultado_examen re ON s.id = re.idSolicitud
             WHERE s.idAspi = ? AND s.estado != 'CANCELADO'
             ORDER BY s.creadoEn DESC LIMIT 1`,
            [idAspi]
        );

        if (resultados.length > 0) {
            const solicitud = resultados[0];
            let accionesDisponibles = [];
            if (solicitud.idEtapaActual) {
                accionesDisponibles = await WorkflowService.getAccionesDeEtapa(solicitud.idEtapaActual);
            }

            // Buscar documentos subidos para esta solicitud
            const [documentos] = await db.query(
                `SELECT sd.id as idDocumento, sd.idSolicitud, sd.idRequisito, sd.rutaArchivo, sd.estadoValidacion, sd.comentarios, sd.intentos, cr.nombre as requisitoNombre
                 FROM solicitud_documentos sd
                 JOIN catalogo_requisitos cr ON sd.idRequisito = cr.id
                 WHERE sd.idSolicitud = ?
                 ORDER BY sd.intentos ASC`,
                [solicitud.id]
            );

            // Filtrar solo el último intento por requisito
            const mapaDocs = {};
            documentos.forEach(doc => {
                const key = doc.idRequisito;
                if (!mapaDocs[key] || doc.intentos > mapaDocs[key].intentos) {
                    mapaDocs[key] = doc;
                }
            });
            solicitud.documentosSubidos = Object.values(mapaDocs);

            return res.status(200).json({ existe: true, accionesDisponibles, ...solicitud });
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
            'SELECT requisito_id as id FROM convocatoria_requisitos WHERE convocatoria_id = ? AND obligatorio = 1',
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
        const [resultados] = await db.query('SELECT id, codigo, icono, nombre, descripcion FROM modalidad_ingreso WHERE activo = 1 ORDER BY id ASC');
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

// Obtener acciones correspondientes a la etapa actual de una solicitud
const getAccionesSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const acciones = await WorkflowService.getAccionActual(id);
        return res.json(acciones);
    } catch (error) {
        console.error('Error en getAccionesSolicitud:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Obtener solicitudes filtradas por modalidad de ingreso (con filtro opcional por etapa: proximos vs en_examen)
const getSolicitudesPorModalidad = async (req, res) => {
    try {
        const { idModalidad } = req.params;
        const { tipo } = req.query; // 'proximos' (etapa 1) o 'en_examen' (etapa > 1)

        let filtroEtapa = '';
        if (tipo === 'proximos') {
            filtroEtapa = 'AND (me.orden = 1 OR s.idEtapaActual IS NULL)';
        } else if (tipo === 'en_examen') {
            filtroEtapa = 'AND me.orden > 1';
        }

        const query = `
            SELECT 
                s.id AS idSolicitud,
                s.idAspi,
                s.estado AS estadoSolicitud,
                CONCAT(a.nombre, ' ', a.primerApellido, ' ', COALESCE(a.segundoApellido, '')) AS aspiranteNombre,
                u.correo,
                c.nombre AS programa,
                c.posgrado_id,
                p.tipo AS posgradoTipo,
                op.nombre AS opcionNombre,
                mi.id AS idModalidad,
                mi.nombre AS modalidadNombre,
                ep.id AS idEtapaActual,
                ep.nombre AS etapaNombre,
                pe.id AS idProgramacion,
                pe.fecha,
                pe.hora,
                pe.lugar,
                pe.observaciones
            FROM solicitud s
            JOIN aspirante a ON s.idAspi = a.id
            JOIN usuario u ON a.idUsuario = u.id
            JOIN convocatorias c ON s.idConvocatoria = c.id
            LEFT JOIN posgrado p ON c.posgrado_id = p.id
            LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
            LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
            LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
            LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
            LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
            LEFT JOIN programacion_examen pe ON pe.idSolicitud = s.id
            WHERE s.idModalidad = ? AND s.estado != 'CANCELADO' ${filtroEtapa}
            ORDER BY s.creadoEn DESC
        `;
        const [resultados] = await db.query(query, [idModalidad]);
        return res.json(resultados);
    } catch (error) {
        console.error('Error en getSolicitudesPorModalidad:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar la modalidad.' });
    }
};

// Obtener solicitudes filtradas por codigo de modalidad de ingreso
const getSolicitudesPorModalidadCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;
        const { tipo } = req.query; // 'proximos' (etapa 1) o 'en_examen' (etapa > 1)

        let filtroEtapa = '';
        if (tipo === 'proximos') {
            filtroEtapa = 'AND (me.orden = 1 OR s.idEtapaActual IS NULL)';
        } else if (tipo === 'en_examen') {
            filtroEtapa = 'AND me.orden > 1';
        }

        const query = `
            SELECT 
                s.id AS idSolicitud,
                s.idAspi,
                s.estado AS estadoSolicitud,
                CONCAT(a.nombre, ' ', a.primerApellido, ' ', COALESCE(a.segundoApellido, '')) AS aspiranteNombre,
                u.correo,
                c.nombre AS programa,
                c.posgrado_id,
                p.tipo AS posgradoTipo,
                op.nombre AS opcionNombre,
                mi.id AS idModalidad,
                mi.nombre AS modalidadNombre,
                mi.codigo AS modalidadCodigo,
                ep.id AS idEtapaActual,
                ep.nombre AS etapaNombre,
                COALESCE(pe.id, pc.id) AS idProgramacion,
                COALESCE(pe.fecha, pc.fechaInicio) AS fecha,
                pc.fechaFin,
                pe.hora,
                COALESCE(pe.lugar, pc.aula) AS lugar,
                COALESCE(pe.observaciones, pc.observaciones) AS observaciones
            FROM solicitud s
            JOIN aspirante a ON s.idAspi = a.id
            JOIN usuario u ON a.idUsuario = u.id
            JOIN convocatorias c ON s.idConvocatoria = c.id
            LEFT JOIN posgrado p ON c.posgrado_id = p.id
            LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
            LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
            JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
            LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
            LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
            LEFT JOIN programacion_examen pe ON pe.idSolicitud = s.id
            LEFT JOIN programacion_curso pc ON pc.idSolicitud = s.id
            WHERE mi.codigo = ? AND s.estado != 'CANCELADO' ${filtroEtapa}
            ORDER BY s.creadoEn DESC
        `;
        const [resultados] = await db.query(query, [codigo]);

        // Evitamos N+1 tanto en HTTP como en DB almacenando en caché las acciones por etapa
        const accionesPorEtapa = {};
        const solicitudesConAcciones = [];

        for (const sol of resultados) {
            let acciones = [];
            if (sol.idEtapaActual) {
                if (!accionesPorEtapa[sol.idEtapaActual]) {
                    accionesPorEtapa[sol.idEtapaActual] = await WorkflowService.getAccionesDeEtapa(sol.idEtapaActual);
                }
                acciones = accionesPorEtapa[sol.idEtapaActual];
            }
            solicitudesConAcciones.push({
                ...sol,
                accionesDisponibles: acciones
            });
        }

        return res.json(solicitudesConAcciones);
    } catch (error) {
        console.error('Error en getSolicitudesPorModalidadCodigo:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar la modalidad por código.' });
    }
};

// Obtener todas las solicitudes activas independientemente de la modalidad
const getSolicitudesActivas = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id AS idSolicitud,
                s.idAspi,
                s.estado AS estadoSolicitud,
                CONCAT(a.nombre, ' ', a.primerApellido, ' ', COALESCE(a.segundoApellido, '')) AS aspiranteNombre,
                u.correo,
                c.nombre AS programa,
                c.posgrado_id,
                p.tipo AS posgradoTipo,
                op.nombre AS opcionNombre,
                mi.id AS idModalidad,
                mi.nombre AS modalidadNombre,
                ep.id AS idEtapaActual,
                ep.nombre AS etapaNombre,
                pe.id AS idProgramacion,
                pe.fecha,
                pe.hora,
                pe.lugar,
                pe.observaciones
            FROM solicitud s
            JOIN aspirante a ON s.idAspi = a.id
            JOIN usuario u ON a.idUsuario = u.id
            JOIN convocatorias c ON s.idConvocatoria = c.id
            LEFT JOIN posgrado p ON c.posgrado_id = p.id
            LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
            LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
            LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
            LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
            LEFT JOIN programacion_examen pe ON pe.idSolicitud = s.id
            WHERE s.estado != 'CANCELADO'
            GROUP BY s.id
            ORDER BY s.creadoEn DESC
        `;
        const [resultados] = await db.query(query);
        return res.json(resultados);
    } catch (error) {
        console.error('Error en getSolicitudesActivas:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar las solicitudes.' });
    }
};

// Obtener mapa del proceso (niveles)
const getMapaProceso = async (req, res) => {
    try {
        const { idAspi } = req.params;

        // 1. Obtener solicitud activa
        const [solicitudes] = await db.query(
            "SELECT s.id, s.estado, s.idModalidad, s.idEtapaActual, me.orden AS etapaActualOrden " +
            "FROM solicitud s " +
            "LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id " +
            "WHERE s.idAspi = ? AND s.estado != 'CANCELADO' " +
            "ORDER BY s.creadoEn DESC LIMIT 1",
            [idAspi]
        );

        if (solicitudes.length === 0) {
            return res.status(404).json({ mensaje: 'No hay solicitud activa.' });
        }

        const solicitud = solicitudes[0];
        
        // Si no tiene modalidad aún asignada, no hay mapa
        if (!solicitud.idModalidad) {
            return res.status(200).json([]);
        }

        // El orden actual, si no tiene etapa es 1 (inicio)
        let ordenActual = solicitud.etapaActualOrden || 1;
        
        // Si el proceso ya finalizó exitosamente, marcamos todo como completado
        if (solicitud.estado === 'APROBADO') {
            ordenActual = 9999;
        }

        // 2. Obtener las etapas de la modalidad
        const [etapas] = await db.query(
            `SELECT me.orden, ep.id, ep.nombre 
             FROM modalidad_etapa me 
             JOIN etapa_proceso ep ON me.etapa_id = ep.id 
             WHERE me.modalidad_id = ? 
             ORDER BY me.orden ASC`,
            [solicitud.idModalidad]
        );

        // Agregar etapa inicial "Convocatoria"
        etapas.unshift({ orden: 0, id: 'convocatoria', nombre: 'Convocatoria' });

        // 3. Mapear estado
        const mapa = etapas.map(etapa => {
            let status = 'pendiente';
            if (etapa.orden < ordenActual) status = 'completado';
            else if (etapa.orden === ordenActual) status = 'actual';
            
            return {
                ...etapa,
                status
            };
        });

        return res.status(200).json(mapa);
    } catch (error) {
        console.error('Error en getMapaProceso:', error);
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
    getEtapasWorkflow,
    getAccionesSolicitud,
    getSolicitudesPorModalidad,
    getSolicitudesPorModalidadCodigo,
    getSolicitudesActivas,
    getMapaProceso
};

