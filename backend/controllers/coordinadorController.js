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
// 7. Guardar Entrevista
// ==========================================
guardarEntrevista: async (req,res)=>{

    const { id }=req.params;

    const{

        fecha,
        hora,
        lugar,
        enlace,
        idDocente

    }=req.body;

    try{

        const[existe]=await db.query(

            "SELECT id FROM entrevistas WHERE idSolicitud=?",

            [id]

        );

        if(existe.length){

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

        }else{

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

        res.json({

            ok:true,

            mensaje:"Entrevista guardada."

        });

    }catch(error){

        console.error(error);

        res.status(500).json(error);

    }

}

};

module.exports = coordinadorController;