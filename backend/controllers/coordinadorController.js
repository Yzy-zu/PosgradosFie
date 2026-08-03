const db = require('../database/db');

const coordinadorController = {

    // ==========================================
// 1. Métricas
// ==========================================
getMetricas: async (req, res) => {
    try {

        const [[solicitudes]] = await db.query(`
            SELECT COUNT(*) AS totalSolicitudes
            FROM solicitud
        `);

        const [[aspirantes]] = await db.query(`
            SELECT COUNT(*) AS totalAspirantes
            FROM aspirante
        `);

        const [[docentes]] = await db.query(`
            SELECT COUNT(*) AS totalDocentes
            FROM docente
        `);

        const [[entrevistas]] = await db.query(`
            SELECT COUNT(*) AS entrevistas
            FROM entrevistas
        `);

        res.json({
            totalSolicitudes: solicitudes.totalSolicitudes,
            totalAspirantes: aspirantes.totalAspirantes,
            totalDocentes: docentes.totalDocentes,
            entrevistas: entrevistas.entrevistas
        });

    } catch (error) {
        console.error("Error al obtener métricas:", error);

        res.status(500).json({
            mensaje: "Error al obtener métricas."
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
                    a.nombre,' ',
                    a.primerApellido,' ',
                    IFNULL(a.segundoApellido,'')
                ) AS nombre_completo,

                a.curp,

                c.nombre AS programa,

                s.estado

            FROM solicitud s

            INNER JOIN aspirante a
                ON s.idAspi = a.id

            INNER JOIN convocatorias c
                ON s.idConvocatoria = c.id

            ORDER BY s.id DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error("Error al obtener aspirantes:", error);

        res.status(500).json({
            mensaje: "Error al obtener aspirantes."
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

        const [[expediente]] = await db.query(`

            SELECT

                a.*,

                s.id AS solicitud,

                c.nombre AS convocatoria,

                s.estado

            FROM aspirante a

            INNER JOIN solicitud s
                ON a.id = s.idAspi

            INNER JOIN convocatorias c
                ON s.idConvocatoria = c.id

            WHERE a.id = ?

        `,[id]);

        res.json(expediente);

    } catch(error){

        console.error(error);

        res.status(500).json(error);

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
guardarEntrevista: async (req,res)=>{

    const { id } = req.params;

    const {
        fecha,
        hora,
        lugar,
        enlace,
        idDocente
    } = req.body;

    try {

        // Verificar si ya existe entrevista para la solicitud
        const [existe] = await db.query(
            "SELECT id FROM entrevistas WHERE idSolicitud=?",
            [id]
        );

        if (existe.length) {

            // Actualizar entrevista existente
            await db.query(`
                UPDATE entrevistas
                SET
                    fecha=?,
                    hora=?,
                    lugar=?,
                    enlace=?,
                    idDocente=?,
                    estatus='PROGRAMADA'
                WHERE idSolicitud=?
            `,[
                fecha,
                hora,
                lugar,
                enlace,
                idDocente,
                id
            ]);

        } else {

            // Crear nueva entrevista
            await db.query(`
                INSERT INTO entrevistas(
                    idSolicitud,
                    idDocente,
                    fecha,
                    hora,
                    lugar,
                    enlace,
                    estatus
                )
                VALUES(?,?,?,?,?,?,'PROGRAMADA')
            `,[
                id,
                idDocente,
                fecha,
                hora,
                lugar,
                enlace
            ]);

        }

        // ==========================================
        // Buscar el usuario del aspirante
        // ==========================================
        const [[aspirante]] = await db.query(`
            SELECT
                a.idUsuario,
                CONCAT(
                    a.nombre,' ',
                    a.primerApellido,' ',
                    IFNULL(a.segundoApellido,'')
                ) AS nombreAspirante
            FROM solicitud s
            INNER JOIN aspirante a
                ON s.idAspi = a.id
            WHERE s.id = ?
        `,[id]);

        // ==========================================
        // Obtener nombre del docente
        // ==========================================
        const [[docente]] = await db.query(`
            SELECT
                CONCAT(
                    nombre,' ',
                    primerApellido,' ',
                    IFNULL(segundoApellido,'')
                ) AS nombreDocente
            FROM docente
            WHERE id = ?
        `,[idDocente]);

        // ==========================================
        // Crear mensaje de notificación
        // ==========================================
        const mensaje = `
Tu entrevista ha sido programada.

Fecha: ${fecha}
Hora: ${hora}
Docente: ${docente?.nombreDocente || 'Docente asignado'}
Lugar: ${lugar}
        `.trim();

        // ==========================================
        // Insertar notificación para el aspirante
        // ==========================================
        if (aspirante?.idUsuario) {

            await db.query(`
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
                VALUES (?,?,?,?,?,?,?)
            `,[
                'Entrevista Programada',
                mensaje,
                'individual',
                1,
                'COORDINADOR',
                'Coordinación Posgrados',
                aspirante.idUsuario
            ]);

        }

        // Respuesta final
        res.json({
            ok: true,
            mensaje: 'Entrevista guardada y notificación enviada al aspirante.'
        });

    } catch(error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error al guardar la entrevista.'
        });

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
// 9. Emitir Dictamen Final
// ==========================================
emitirDictamen: async (req, res) => {

    const { id } = req.params;

    const {
        resultado,
        motivo
    } = req.body;

    try {

        // Obtener datos del aspirante
        const [solicitud] = await db.query(`
            SELECT
                s.id,
                s.idAspi,
                CONCAT(
                    a.nombre,' ',
                    a.primerApellido,' ',
                    IFNULL(a.segundoApellido,'')
                ) AS nombre
            FROM solicitud s
            INNER JOIN aspirante a
                ON s.idAspi = a.id
            WHERE s.id = ?
        `,[id]);

        if(solicitud.length===0){

            return res.status(404).json({
                mensaje:"Solicitud no encontrada."
            });

        }

        const aspirante=solicitud[0];

        // Verificar si ya existe un dictamen
        const [existe]=await db.query(

            "SELECT id FROM resultado_final WHERE idSolicitud=?",

            [id]

        );

        if(existe.length){

            await db.query(`
                UPDATE resultado_final
                SET
                    resultado=?,
                    motivo=?,
                    publicado=1,
                    fechaPublicacion=NOW()
                WHERE idSolicitud=?
            `,[
                resultado,
                motivo,
                id
            ]);

        }else{

            await db.query(`
                INSERT INTO resultado_final(
                    idSolicitud,
                    resultado,
                    motivo,
                    publicado,
                    fechaPublicacion
                )
                VALUES(?,?,?,1,NOW())
            `,[
                id,
                resultado,
                motivo
            ]);

        }

        // Actualizar estado de la solicitud
        await db.query(
            "UPDATE solicitud SET estado=? WHERE id=?",
            [resultado,id]
        );

        // Crear notificación
        await db.query(`
            INSERT INTO notificaciones(

                nombre,

                mensaje,

                destino,

                activa,

                rolRemitente,

                nombreRemitente,

                idDestino,

                creado_en

            )

            VALUES(

                ?,

                ?,

                'aspirante',

                1,

                'COORDINADOR',

                'Coordinación',

                ?,

                NOW()

            )
        `,[

            "Resultado de Admisión",

            `Tu dictamen final ha sido publicado.\n\nResultado: ${resultado}`,

            aspirante.idAspi

        ]);

        res.json({

            ok:true,

            mensaje:"Dictamen emitido correctamente."

        });

    }catch(error){

        console.error(error);

        res.status(500).json({

            mensaje:"Error al emitir el dictamen."

        });

    }

},

};



module.exports = coordinadorController;