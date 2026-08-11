const db = require('../database/db');
const WorkflowService = require('../services/workflowService');
const emit = require('../utils/socketEmit');
const { ETAPAS } = require('../constants');

const coordinadorController = {

  // ==========================================
// 1. MÉTRICAS DEL PANEL DE COORDINACIÓN
// ==========================================

getMetricas: async (req, res) => {

    try {

        const [[totales]] = await db.query(`
            SELECT COUNT(*) AS cantidad
            FROM solicitud
        `);

        const [[pendientes]] = await db.query(`
            SELECT COUNT(*) AS cantidad
            FROM solicitud
            WHERE estado IN ('PENDIENTE', 'EN_REVISION')
        `);

        const [[entrevistas]] = await db.query(`
            SELECT COUNT(*) AS cantidad
            FROM entrevistas
            WHERE estatus = 'PROGRAMADA'
        `);

        const [[aceptados]] = await db.query(`
            SELECT COUNT(*) AS cantidad
            FROM solicitud
            WHERE estado = 'APROBADO'
        `);

        return res.status(200).json({
            ok: true,
            totales: Number(totales.cantidad || 0),
            pendientes: Number(pendientes.cantidad || 0),
            entrevistas: Number(entrevistas.cantidad || 0),
            aceptados: Number(aceptados.cantidad || 0)
        });

    } catch (error) {

        console.error(
            "Error al obtener métricas:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener las métricas.",
            error: error.sqlMessage || error.message
        });
    }
},

    // ==========================================
// 2. Lista de Aspirantes
// ==========================================
getAspirantes: async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                s.id AS id_solicitud,

                a.id AS id_aspirante,

                CONCAT(
                    a.nombre,
                    ' ',
                    a.primerApellido,
                    ' ',
                    IFNULL(a.segundoApellido, '')
                ) AS nombre_completo,

                a.curp,

                c.nombre AS programa,

                c.nombre AS convocatoria,

                COALESCE(
                    mi.nombre,
                    'N/A'
                ) AS tipo_admision,

                COALESCE(
                    ep.nombre,
                    'Sin etapa'
                ) AS etapa_actual,

                COALESCE(
                    s.estado,
                    'PENDIENTE'
                ) AS estado

            FROM solicitud s

            INNER JOIN aspirante a
                ON s.idAspi = a.id

            INNER JOIN convocatorias c
                ON s.idConvocatoria = c.id

            LEFT JOIN modalidad_ingreso mi
                ON s.idModalidad = mi.id

            LEFT JOIN etapa_proceso ep
                ON s.idEtapaActual = ep.id

            ORDER BY s.id DESC
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Error al obtener aspirantes:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al obtener aspirantes.",
            error:
                error.sqlMessage ||
                error.message
        });
    }
},

    // ==========================================
// 3. Actualizar Estado / Dictamen
// ==========================================
actualizarDictamen: async (req, res) => {

    const { id } = req.params;
    const { estado } = req.body;

    try {

        await db.query(`
            UPDATE solicitud
            SET estado = ?
            WHERE id = ?
        `, [estado, id]);

        if (req.app.get('io')) {
            // Notificar al aspirante específico + ADMIN
            const [solD] = await db.query(
                'SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?',
                [id]
            );
            if (solD.length > 0) emit.aAspiranteEspecifico(req, solD[0].idUsuario);
            else emit.aAdmin(req);
        }

        res.json({
            ok: true,
            mensaje: "Estado actualizado correctamente."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar."
        });

    }

},
    // ==========================================
// 4. Expediente del Aspirante
// ==========================================
getExpediente: async (req, res) => {

    const { id } = req.params;

    try {

        const [aspirantes] = await db.query(`
            SELECT
                a.id AS idAspirante,

                CONCAT(
                    a.nombre,
                    ' ',
                    a.primerApellido,
                    ' ',
                    IFNULL(a.segundoApellido, '')
                ) AS nombreCompleto,

                a.curp,
                a.telefono,
                a.promedio,
                a.licenciatura,
                a.institucionLicenciatura,

                u.correo,

                s.id AS idSolicitud,
                s.estado,

                c.nombre AS convocatoria

            FROM aspirante a

            INNER JOIN solicitud s
                ON s.idAspi = a.id

            INNER JOIN convocatorias c
                ON c.id = s.idConvocatoria

            LEFT JOIN usuario u
                ON u.id = a.idUsuario

            WHERE a.id = ?

            ORDER BY s.id DESC
            LIMIT 1
        `, [id]);

        if (aspirantes.length === 0) {

            return res.status(404).json({
                ok: false,
                mensaje:
                    "Aspirante no encontrado o sin solicitud registrada."
            });
        }

        const aspirante = aspirantes[0];

        const [documentos] = await db.query(`
            SELECT
                sd.id,
                sd.idSolicitud,
                sd.idRequisito,
                sd.rutaArchivo,
                sd.estadoValidacion,
                sd.comentarios,
                sd.intentos,

                cr.nombre AS requisito

            FROM solicitud_documentos sd

            LEFT JOIN catalogo_requisitos cr
                ON cr.id = sd.idRequisito

            WHERE sd.idSolicitud = ?

            ORDER BY cr.nombre ASC
        `, [aspirante.idSolicitud]);

        return res.json({
            ok: true,

            aspirante: {
                id: aspirante.idAspirante,
                nombreCompleto: aspirante.nombreCompleto,
                curp: aspirante.curp,
                correo: aspirante.correo || null,
                telefono: aspirante.telefono || null,
                promedio: aspirante.promedio || null,
                licenciatura: aspirante.licenciatura || null,

                institucion:
                    aspirante.institucionLicenciatura || null,

                convocatoria: aspirante.convocatoria,
                estado: aspirante.estado,
                idSolicitud: aspirante.idSolicitud
            },

            documentos: documentos.map(documento => ({
                id: documento.id,

                requisito:
                    documento.requisito || "Documento",

                rutaArchivo: documento.rutaArchivo,
                estadoValidacion: documento.estadoValidacion,
                comentarios: documento.comentarios,
                intentos: documento.intentos
            }))
        });

    } catch (error) {

        console.error(
            "Error al obtener expediente:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el expediente.",
            error: error.sqlMessage || error.message
        });
    }
},

   // ==========================================
// 5. Obtener Docentes
// ==========================================
getDocentes: async (req,res)=>{

    try{

        const [docentes]=await db.query(`

            SELECT

                id,

                CONCAT(
                    nombre,' ',
                    primerApellido,' ',
                    IFNULL(segundoApellido,'')
                ) AS nombre

            FROM docente

            ORDER BY nombre

        `);

        res.json(docentes);

    }catch(error){

        console.error(error);

        res.status(500).json(error);

    }

},


// ==========================================
// 6. Obtener Entrevistas
// ==========================================
getEntrevistas: async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT

                s.id AS id_solicitud,

                CONCAT(
                    a.nombre,' ',
                    a.primerApellido,' ',
                    IFNULL(a.segundoApellido,'')
                ) AS nombre_completo,

                a.curp,

                c.nombre AS programa,

                e.id,

                e.fecha,

                e.hora,

                e.lugar,

                e.enlace,

                e.estatus,

                d.id AS id_docente,

                CONCAT(
                    d.nombre,' ',
                    d.primerApellido,' ',
                    IFNULL(d.segundoApellido,'')
                ) AS docente

            FROM solicitud s

            INNER JOIN aspirante a
                ON a.id = s.idAspi

            INNER JOIN convocatorias c
                ON c.id = s.idConvocatoria

            LEFT JOIN entrevistas e
                ON e.idSolicitud = s.id

            LEFT JOIN docente d
                ON d.id = e.idDocente

            ORDER BY s.id DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener entrevistas."
        });

    }

},



// ==========================================
// 7. Guardar Entrevista + Notificar Aspirante
// ==========================================
guardarEntrevista: async (req, res) => {

    const { id } = req.params;

    const {
        fecha,
        hora,
        lugar,
        enlace,
        idDocente
    } = req.body;

    if (!id || !fecha || !hora || !idDocente) {

        return res.status(400).json({
            ok: false,
            mensaje:
                "Faltan datos obligatorios para programar la entrevista."
        });
    }

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // ==========================================
        // Verificar si ya existe entrevista
        // ==========================================
        const [entrevistasExistentes] =
            await connection.query(
                `
                    SELECT id
                    FROM entrevistas
                    WHERE idSolicitud = ?
                    ORDER BY id DESC
                    LIMIT 1
                `,
                [id]
            );

        const entrevistaYaExistia =
            entrevistasExistentes.length > 0;

        if (entrevistaYaExistia) {

            const idEntrevista =
                entrevistasExistentes[0].id;

            // Actualizar solamente una entrevista
            await connection.query(
                `
                    UPDATE entrevistas
                    SET
                        idDocente = ?,
                        fecha = ?,
                        hora = ?,
                        lugar = ?,
                        enlace = ?,
                        estatus = 'PROGRAMADA',
                        actualizado_en = NOW()
                    WHERE id = ?
                `,
                [
                    idDocente,
                    fecha,
                    hora,
                    lugar || "",
                    enlace || "",
                    idEntrevista
                ]
            );

            /*
             * Eliminar entrevistas duplicadas antiguas
             * y conservar únicamente la actual.
             */
            await connection.query(
                `
                    DELETE FROM entrevistas
                    WHERE idSolicitud = ?
                      AND id <> ?
                `,
                [
                    id,
                    idEntrevista
                ]
            );

        } else {

            // Crear la entrevista por primera vez
            await connection.query(
                `
                    INSERT INTO entrevistas
                    (
                        idSolicitud,
                        idDocente,
                        fecha,
                        hora,
                        lugar,
                        enlace,
                        estatus
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 'PROGRAMADA')
                `,
                [
                    id,
                    idDocente,
                    fecha,
                    hora,
                    lugar || "",
                    enlace || ""
                ]
            );

            // M-02: avanzar el workflow solo si la solicitud aún está en la etapa de Entrevista.
            // Esto sincroniza coordinadorController con entrevistaController (que sí avanzaba la etapa).
            const [[solicitudEtapa]] = await connection.query(
                'SELECT idEtapaActual FROM solicitud WHERE id = ?', [id]
            );
            if (solicitudEtapa && solicitudEtapa.idEtapaActual === ETAPAS.ENTREVISTA) {
                await WorkflowService.avanzarEtapa(parseInt(id), connection);
            }

        } // fin else (nueva entrevista)

        // ==========================================
        // Buscar aspirante y usuario
        // ==========================================
        const [aspirantes] =
            await connection.query(
                `
                    SELECT
                        a.idUsuario,

                        CONCAT(
                            a.nombre,
                            ' ',
                            a.primerApellido,
                            ' ',
                            IFNULL(a.segundoApellido, '')
                        ) AS nombreAspirante

                    FROM solicitud s

                    INNER JOIN aspirante a
                        ON s.idAspi = a.id

                    WHERE s.id = ?
                    LIMIT 1
                `,
                [id]
            );

        const aspirante =
            aspirantes[0];

        // ==========================================
        // Obtener nombre del docente
        // ==========================================
        const [docentes] =
            await connection.query(
                `
                    SELECT
                        CONCAT(
                            nombre,
                            ' ',
                            primerApellido,
                            ' ',
                            IFNULL(segundoApellido, '')
                        ) AS nombreDocente

                    FROM docente

                    WHERE id = ?
                    LIMIT 1
                `,
                [idDocente]
            );

        const docente =
            docentes[0];

        const mensaje = `
Tu entrevista ha sido programada.

Fecha: ${fecha}
Hora: ${hora}
Docente: ${docente?.nombreDocente || "Docente asignado"}
Lugar: ${lugar || "Por definir"}
        `.trim();

        // ==========================================
        // Evitar notificaciones duplicadas
        // ==========================================
        if (aspirante?.idUsuario) {

            await connection.query(
                `
                    DELETE FROM notificaciones
                    WHERE nombre = 'Entrevista Programada'
                      AND destino = 'individual'
                      AND idDestino = ?
                `,
                [aspirante.idUsuario]
            );

            await connection.query(
                `
                    INSERT INTO notificaciones
                    (
                        nombre,
                        mensaje,
                        destino,
                        activa,
                        rolRemitente,
                        nombreRemitente,
                        idDestino
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    "Entrevista Programada",
                    mensaje,
                    "individual",
                    1,
                    "COORDINADOR",
                    "Coordinación Posgrados",
                    aspirante.idUsuario
                ]
            );
        }

        await connection.commit();

        if (req.app.get("io")) {
            emit.aAspiranteEspecifico(req, aspirante.idUsuario);
        }

        return res.json({
            ok: true,
            mensaje:
                entrevistaYaExistia
                    ? "Entrevista actualizada correctamente."
                    : "Entrevista programada correctamente."
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.error(
            "Error al guardar entrevista:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "Error al guardar la entrevista.",
            error:
                error.sqlMessage ||
                error.message
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
},
// ==========================================
// 8. Obtener Dictámenes
// ==========================================
getDictamenes: async (req, res) => {

    try {

        const [dictamenes] = await db.query(`
            SELECT
                s.id AS idSolicitud,
                a.id AS idAspirante,

                CONCAT(
                    a.nombre,' ',
                    a.primerApellido,' ',
                    IFNULL(a.segundoApellido,'')
                ) AS nombre,

                a.curp,

                c.nombre AS programa,

                s.estado,

                rf.resultado,
                rf.motivo,
                rf.publicado,
                rf.fechaPublicacion

            FROM solicitud s

            INNER JOIN aspirante a
                ON s.idAspi = a.id

            INNER JOIN convocatorias c
                ON s.idConvocatoria = c.id

            LEFT JOIN resultado_final rf
                ON rf.idSolicitud = s.id

            ORDER BY s.id DESC
        `);

        res.json(dictamenes);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener los dictámenes."
        });

    }

},


// ==========================================
// 9. Emitir Dictamen Final + Notificar
// ==========================================
emitirDictamen: async (req, res) => {

    const { id } = req.params;
    const { resultado, motivo } = req.body;

    const resultadosPermitidos = [
        'ACEPTADO',
        'RECHAZADO',
        'LISTA_ESPERA'
    ];

    if (!resultado || !resultadosPermitidos.includes(resultado)) {
        return res.status(400).json({
            ok: false,
            mensaje: 'El resultado del dictamen no es válido.'
        });
    }

    if (!motivo || !motivo.trim()) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Debe escribir una observación para el aspirante.'
        });
    }

    let connection;

    try {

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Obtener solicitud y usuario destinatario
        const [solicitudes] = await connection.query(`
            SELECT
                s.id,
                s.idAspi,
                a.idUsuario,

                CONCAT(
                    a.nombre, ' ',
                    a.primerApellido, ' ',
                    IFNULL(a.segundoApellido, '')
                ) AS nombreAspirante

            FROM solicitud s

            INNER JOIN aspirante a
                ON s.idAspi = a.id

            WHERE s.id = ?
        `, [id]);

        if (solicitudes.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                ok: false,
                mensaje: 'Solicitud no encontrada.'
            });
        }

        const aspirante = solicitudes[0];

        if (!aspirante.idUsuario) {
            await connection.rollback();

            return res.status(400).json({
                ok: false,
                mensaje: 'El aspirante no tiene un usuario asociado.'
            });
        }

        // Verificar si ya existe un resultado final
        const [dictamenExistente] = await connection.query(`
            SELECT id
            FROM resultado_final
            WHERE idSolicitud = ?
        `, [id]);

        if (dictamenExistente.length > 0) {

            await connection.query(`
                UPDATE resultado_final
                SET
                    resultado = ?,
                    motivo = ?,
                    publicado = 1,
                    fechaPublicacion = NOW()
                WHERE idSolicitud = ?
            `, [
                resultado,
                motivo.trim(),
                id
            ]);

        } else {

            await connection.query(`
                INSERT INTO resultado_final
                (
                    idSolicitud,
                    resultado,
                    motivo,
                    publicado,
                    fechaPublicacion
                )
                VALUES (?, ?, ?, 1, NOW())
            `, [
                id,
                resultado,
                motivo.trim()
            ]);

        }

        const mensajeNotificacion = `
Tu dictamen final ha sido publicado.

Resultado: ${resultado.replace('_', ' ')}

Observaciones:
${motivo.trim()}
        `.trim();

        // Evitar duplicar notificaciones idénticas si se vuelve a editar
        await connection.query(`
            DELETE FROM notificaciones
            WHERE nombre = 'Resultado de Admisión'
              AND destino = 'individual'
              AND idDestino = ?
        `, [aspirante.idUsuario]);

        await connection.query(`
            INSERT INTO notificaciones
            (
                nombre,
                mensaje,
                destino,
                activa,
                rolRemitente,
                nombreRemitente,
                idDestino
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'Resultado de Admisión',
            mensajeNotificacion,
            'individual',
            1,
            'COORDINADOR',
            'Coordinación Posgrados',
            aspirante.idUsuario
        ]);

        await connection.commit();
        // Notificar al aspirante específico + ADMIN
        if (req.app.get('io')) {
            const [solDictamen] = await db.query(
                'SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?',
                [id]
            );
            if (solDictamen.length > 0) emit.aAspiranteEspecifico(req, solDictamen[0].idUsuario);
            else emit.aAdmin(req);
        }

        return res.json({
            ok: true,
            mensaje: 'Dictamen guardado y notificación enviada al aspirante.'
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.error('Error al emitir el dictamen:', error);

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al emitir el dictamen.',
            error: error.message
        });

    } finally {

        if (connection) {
            connection.release();
        }

    }

}

};



module.exports = coordinadorController;