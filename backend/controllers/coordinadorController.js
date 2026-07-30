const db = require('../database/db');

const coordinadorController = {

    // ==========================================
    // 1. Obtener Métricas Generales
    // ==========================================
    getMetricas: async (req, res) => {
        try {
            const [totales] = await db.query('SELECT COUNT(*) AS total FROM solicitud');
            const [pendientes] = await db.query("SELECT COUNT(*) AS total FROM solicitud WHERE estado = 'PENDIENTE'");
            const [entrevistas] = await db.query("SELECT COUNT(*) AS total FROM entrevistas WHERE estatus = 'PROGRAMADA'");
            const [aceptados] = await db.query("SELECT COUNT(*) AS total FROM solicitud WHERE estado = 'APROBADO'");

            res.json({
                totales: totales[0]?.total || 0,
                pendientes: pendientes[0]?.total || 0,
                entrevistas: entrevistas[0]?.total || 0,
                aceptados: aceptados[0]?.total || 0
            });
        } catch (error) {
            console.error('Error al obtener métricas:', error);
            res.status(500).json({ mensaje: 'Error al obtener métricas.' });
        }
    },

    // ==========================================
    // 2. Obtener Lista de Aspirantes
    // ==========================================
    getAspirantes: async (req, res) => {
        try {
            const query = `
                SELECT 
                    s.id AS id_solicitud,
                    a.id AS id_aspirante,
                    CONCAT(a.nombre, ' ', a.primerApellido, ' ', COALESCE(a.segundoApellido, '')) AS nombre_completo,
                    a.curp AS folio,
                    conv.nombre AS programa,
                    c.dictamen,
                    s.estado,
                    mi.nombre AS modalidadNombre,
                    ep.nombre AS etapaNombre
                FROM solicitud s
                INNER JOIN aspirante a ON s.idAspi = a.id
                INNER JOIN convocatorias conv ON s.idConvocatoria = conv.id
                LEFT JOIN coordinacion c ON s.id = c.idSolicitud
                LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
                LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
                LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
                ORDER BY s.id DESC
            `;
            const [aspirantes] = await db.query(query);
            res.json(aspirantes);
        } catch (error) {
            console.error('Error al obtener aspirantes:', error);
            res.status(500).json({ mensaje: 'Error al consultar lista de aspirantes.' });
        }
    },

    // ==========================================
    // 3. Actualizar Dictamen
    // ==========================================
    actualizarDictamen: async (req, res) => {
        const { id } = req.params; // idSolicitud
        const { dictamen, observaciones, idUsuarioCoordinador } = req.body;

        try {
            await db.query(`
                INSERT INTO coordinacion (idSolicitud, idUsuarioCoordinador, dictamen, observaciones)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    dictamen = VALUES(dictamen),
                    observaciones = VALUES(observaciones),
                    idUsuarioCoordinador = VALUES(idUsuarioCoordinador),
                    fechaEvaluacion = CURRENT_TIMESTAMP
            `, [id, idUsuarioCoordinador, dictamen, observaciones || null]);

            await db.query(
                'UPDATE solicitud SET estado = ? WHERE id = ?',
                [dictamen, id]
            );

            const io = req.app.get('io');
            if (io) {
                io.emit('actualizacionSolicitudes', { idSolicitud: id, nuevoEstado: dictamen });
            }

            res.json({ mensaje: "Dictamen de coordinación guardado exitosamente." });
        } catch (error) {
            console.error("Error al guardar el dictamen:", error);
            res.status(500).json({ mensaje: "Error al actualizar el dictamen." });
        }
    },

    // ==========================================
    // 4. Expediente Completo del Aspirante
    // ==========================================
    getExpediente: async (req, res) => {
        const { id } = req.params; // idAspirante

        try {
            const [perfil] = await db.query(`
                SELECT 
                    a.*, 
                    u.correo,
                    c.dictamen AS dictamenCoordinacion,
                    c.observaciones AS observacionesCoordinacion,
                    mi.nombre AS modalidadNombre,
                    ep.nombre AS etapaNombre
                FROM aspirante a
                INNER JOIN usuario u ON a.idUsuario = u.id
                LEFT JOIN solicitud s ON s.idAspi = a.id
                LEFT JOIN coordinacion c ON s.id = c.idSolicitud
                LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
                LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
                LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
                WHERE a.id = ?
            `, [id]);

            if (perfil.length === 0) {
                return res.status(404).json({ mensaje: "Aspirante no encontrado." });
            }

            const [documentos] = await db.query(`
                SELECT DISTINCT
                    sd.id AS id_documento,
                    sd.rutaArchivo,
                    sd.estadoValidacion,
                    sd.comentarios,
                    cat.nombre AS nombreRequisito,
                    cat.categoria
                FROM solicitud_documentos sd
                INNER JOIN solicitud s ON sd.idSolicitud = s.id
                INNER JOIN convocatoria_requisitos cr ON sd.idRequisito = cr.id
                INNER JOIN catalogo_requisitos cat ON cr.requisito_id = cat.id
                WHERE s.idAspi = ?
            `, [id]);

            res.json({
                perfil: perfil[0],
                documentos
            });
        } catch (error) {
            console.error("Error al obtener expediente:", error);
            res.status(500).json({ mensaje: "Error al obtener expediente." });
        }
    },

    // ==========================================
    // 5. Obtener lista de docentes para el Select
    // ==========================================
    getDocentes: async (req, res) => {
        try {
            const query = `
                SELECT 
                    id AS id_docente, 
                    id,
                    CONCAT(nombre, ' ', primerApellido, ' ', COALESCE(segundoApellido, '')) AS nombre_completo,
                    cargo,
                    especialidad
                FROM docente
                ORDER BY nombre ASC
            `;
            const [docentes] = await db.query(query);
            res.json(docentes);
        } catch (error) {
            console.error("Error al obtener docentes:", error);
            res.status(500).json({ mensaje: "Error al consultar la lista de docentes." });
        }
    },

    // ==========================================
    // 6. Consultar Entrevistas
    // ==========================================
    getEntrevistas: async (req, res) => {
        try {
            const query = `
                SELECT 
                    s.id AS id_solicitud,
                    CONCAT(a.nombre, ' ', a.primerApellido, ' ', COALESCE(a.segundoApellido, '')) AS nombre_completo,
                    a.curp AS folio,
                    conv.nombre AS programa,
                    e.id AS id_entrevista,
                    e.fecha_entrevista,
                    e.hora,
                    COALESCE(e.lugar_enlace, '') AS lugar_link,
                    e.idDocente AS id_docente,
                    CONCAT(d.nombre, ' ', d.primerApellido, ' ', COALESCE(d.segundoApellido, '')) AS docente_asignado,
                    COALESCE(e.estatus, 'PENDIENTE') AS estatus
                FROM solicitud s
                INNER JOIN aspirante a ON s.idAspi = a.id
                INNER JOIN convocatorias conv ON s.idConvocatoria = conv.id
                LEFT JOIN entrevistas e ON s.id = e.idSolicitud
                LEFT JOIN docente d ON e.idDocente = d.id
                ORDER BY s.id DESC
            `;
            
            const [rows] = await db.query(query);

            const entrevistasFormateadas = rows.map(r => ({
                ...r,
                lugar_link: r.lugar_link || '',
                docente_asignado: r.docente_asignado ? r.docente_asignado.trim() : 'Sin asignar',
                estatus: r.estatus || 'PENDIENTE'
            }));

            res.json(entrevistasFormateadas);
        } catch (error) {
            console.error('CRÍTICO - Error MySQL en getEntrevistas:', error.sqlMessage || error.message);
            res.status(500).json({ 
                mensaje: 'Error interno al consultar entrevistas.', 
                error: error.sqlMessage || error.message 
            });
        }
    },

    // ==========================================
    // 7. Guardar o Actualizar Entrevista
    // ==========================================
    guardarEntrevista: async (req, res) => {
        const { id } = req.params; // idSolicitud
        
        const fechaFinal = req.body.fecha_entrevista || req.body.fecha;
        const lugarFinal = req.body.lugar_link || req.body.lugar_enlace || req.body.lugar;
        const docenteFinal = req.body.id_docente || req.body.idDocente;
        const horaFinal = req.body.hora || null;

        try {
            const query = `
                INSERT INTO entrevistas (idSolicitud, fecha_entrevista, hora, lugar_enlace, idDocente, estatus)
                VALUES (?, ?, ?, ?, ?, 'PROGRAMADA')
                ON DUPLICATE KEY UPDATE 
                    fecha_entrevista = VALUES(fecha_entrevista),
                    hora = VALUES(hora),
                    lugar_enlace = VALUES(lugar_enlace),
                    idDocente = VALUES(idDocente),
                    estatus = 'PROGRAMADA'
            `;
            await db.query(query, [id, fechaFinal, horaFinal, lugarFinal || null, docenteFinal || null]);
            res.json({ ok: true, mensaje: 'Entrevista programada correctamente.' });
        } catch (error) {
            console.error('Error al guardar entrevista:', error);
            res.status(500).json({ 
                mensaje: 'Error al agendar la entrevista.', 
                error: error.sqlMessage || error.message 
            });
        }
    }

};

module.exports = coordinadorController;