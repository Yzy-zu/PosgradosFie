const db = require('../database/db');
const bcrypt = require('bcrypt');

// Registrar aspirante (con usuario asociado)
const registrarAspirante = async (req, res) => {
    let connection;
    try {
        const {
            nombre, primerApellido, segundoApellido, curp,
            correo, telefono, fechaNacimiento, direccion, password, rfc
        } = req.body;

        // Validaciones de campos obligatorios
        if (!nombre || !primerApellido || !curp || !correo || !telefono || !fechaNacimiento || !direccion || !password || !rfc) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
        }

        // Validar formato de correo
        const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!correoRegex.test(correo)) {
            return res.status(400).json({ mensaje: 'Correo inválido.' });
        }

        // Validar CURP (18 caracteres)
        if (curp.length !== 18) {
            return res.status(400).json({ mensaje: 'La CURP debe tener 18 caracteres.' });
        }

        // Validar teléfono (10 dígitos)
        if (!/^\d{10}$/.test(telefono)) {
            return res.status(400).json({ mensaje: 'El teléfono debe tener 10 dígitos.' });
        }

        // Validar contraseña (mínimo 8 caracteres)
        if (password.length < 8) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 8 caracteres.' });
        }

        // Verificar correo duplicado
        const [resultadoCorreo] = await db.query('SELECT id FROM usuario WHERE correo = ?', [correo]);
        if (resultadoCorreo.length > 0) {
            return res.status(409).json({ mensaje: 'El correo ya está registrado.' });
        }

        // Verificar CURP duplicado
        const [resultadoCurp] = await db.query('SELECT id FROM aspirante WHERE curp = ?', [curp]);
        if (resultadoCurp.length > 0) {
            return res.status(409).json({ mensaje: 'La CURP ya está registrada.' });
        }

        // Verificar RFC duplicado (antes era fire-and-forget, ahora se espera correctamente)
        const [resultadoRfc] = await db.query('SELECT id FROM aspirante WHERE rfc = ?', [rfc]);
        if (resultadoRfc.length > 0) {
            return res.status(409).json({ mensaje: 'El RFC ya está registrado.' });
        }

        // Encriptar contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Insertar usuario
        const [resultadoUsuario] = await connection.query(
            'INSERT INTO usuario(correo, contraseña, rol) VALUES(?, ?, ?)',
            [correo, passwordHash, 'ASPIRANTE']
        );

        const idUsuario = resultadoUsuario.insertId;

        // Insertar aspirante (correo no va aquí, ya está en usuario)
        await connection.query(
            `INSERT INTO aspirante
            (nombre, primerApellido, segundoApellido, curp, rfc, telefono, fechaNacimiento, direccion, idUsuario)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, primerApellido, segundoApellido, curp, rfc, telefono, fechaNacimiento, direccion, idUsuario]
        );

        await connection.commit();

        return res.status(201).json({ mensaje: 'Aspirante registrado correctamente.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en registrarAspirante:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    } finally {
        if (connection) connection.release();
    }
};

// Obtener el aspirante del usuario autenticado (usando idUsuario del JWT)
const getAspiranteMe = async (req, res) => {
    try {
        const idUsuario = req.usuario?.id;
        if (!idUsuario) {
            return res.status(401).json({ success: false, mensaje: 'No se pudo identificar al usuario.' });
        }

        const [resultados] = await db.query('SELECT * FROM aspirante WHERE idUsuario = ?', [idUsuario]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'No se encontró el perfil de aspirante para este usuario.' });
        }

        return res.status(200).json(resultados[0]);
    } catch (error) {
        console.error('Error en getAspiranteMe:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor.' });
    }
};

// Obtener todos los aspirantes con el posgrado al que aplicaron
const obtenerAspirantes = async (req, res) => {
    try {
        const query = `
            SELECT a.*, 
                   (
                       SELECT c.nombre 
                       FROM solicitud s 
                       JOIN convocatorias c ON s.idConvocatoria = c.id 
                       WHERE s.idAspi = a.id 
                       ORDER BY s.creadoEn DESC 
                       LIMIT 1
                   ) AS posgradoNombre
            FROM aspirante a
            ORDER BY a.id DESC
        `;
        const [resultados] = await db.query(query);
        return res.status(200).json(resultados);
    } catch (error) {
        console.error('Error en obtenerAspirantes:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
};

// Obtener aspirante por ID
const obtenerAspirantePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM aspirante WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Aspirante no encontrado' });
        }

        return res.status(200).json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerAspirantePorId:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
};

// Función auxiliar para agrupar múltiples intentos por requisito manteniendo el historial
function agruparDocumentosPorRequisito(docsList) {
    const mapa = {};
    docsList.forEach(doc => {
        const reqKey = doc.idRequisito || doc.requisitoNombre;
        if (!mapa[reqKey]) {
            mapa[reqKey] = [];
        }
        mapa[reqKey].push(doc);
    });

    const resultado = [];
    Object.keys(mapa).forEach(key => {
        const intentosArr = mapa[key].sort((a, b) => (a.intentos || 1) - (b.intentos || 1));
        const ultimoIntento = intentosArr[intentosArr.length - 1];

        resultado.push({
            ...ultimoIntento,
            historial: intentosArr.map(i => ({
                idDocumento: i.idDocumento,
                intentos: i.intentos || 1,
                rutaArchivo: i.rutaArchivo,
                estadoValidacion: i.estadoValidacion,
                comentarios: i.comentarios
            }))
        });
    });

    return resultado;
}

// Obtener expediente por ID de aspirante
const obtenerExpediente = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Info del aspirante + correo de usuario
        const queryAspirante = `
            SELECT a.*, u.correo, u.activo 
            FROM aspirante a 
            JOIN usuario u ON a.idUsuario = u.id 
            WHERE a.id = ?
        `;
        const [resAspirante] = await db.query(queryAspirante, [id]);
        if (resAspirante.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Aspirante no encontrado' });
        }

        let expediente = {
            perfil: resAspirante[0],
            solicitudes: []
        };

        // 2. Historial de solicitudes (convocatorias)
        const querySolicitudes = `
            SELECT s.id as idSolicitud, s.estado, s.creadoEn, 
                   mi.nombre AS modalidadNombre,
                   ep.nombre AS etapaNombre,
                   c.nombre as convocatoriaNombre, c.posgrado_id,
                   op.nombre as opcionNombre
            FROM solicitud s
            JOIN convocatorias c ON s.idConvocatoria = c.id
            LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
            LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
            LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
            LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
            LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
            WHERE s.idAspi = ?
            ORDER BY s.creadoEn DESC
        `;
        const [solicitudes] = await db.query(querySolicitudes, [id]);

        if (solicitudes.length > 0) {
            const idsSolicitudes = solicitudes.map(s => s.idSolicitud);

            // 3. Documentos por solicitud
            const queryDocs = `
                SELECT sd.id as idDocumento, sd.idSolicitud, sd.idRequisito, sd.rutaArchivo, sd.estadoValidacion, sd.comentarios, sd.intentos, cr.nombre as requisitoNombre
                FROM solicitud_documentos sd
                JOIN catalogo_requisitos cr ON sd.idRequisito = cr.id
                WHERE sd.idSolicitud IN (?)
                ORDER BY sd.intentos ASC
            `;
            const [documentos] = await db.query(queryDocs, [idsSolicitudes]);

            expediente.solicitudes = solicitudes.map(sol => {
                const docsDeEstaSoli = documentos.filter(doc => doc.idSolicitud === sol.idSolicitud);
                sol.documentos = agruparDocumentosPorRequisito(docsDeEstaSoli);
                return sol;
            });
        }

        return res.status(200).json(expediente);
    } catch (error) {
        console.error('Error en obtenerExpediente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
};

// Obtener todos los expedientes (para panel de docentes)
const obtenerTodosLosExpedientes = async (req, res) => {
    try {
        const queryAspirantes = `
            SELECT a.id, a.nombre, a.primerApellido, a.segundoApellido, u.correo, a.fechaNacimiento
            FROM aspirante a 
            JOIN usuario u ON a.idUsuario = u.id
            ORDER BY a.id DESC
        `;
        const [aspirantes] = await db.query(queryAspirantes);

        if (aspirantes.length === 0) {
            return res.status(200).json([]);
        }

        const idsAspirantes = aspirantes.map(a => a.id);

        const querySolicitudes = `
            SELECT s.id as idSolicitud, s.idAspi, s.idConvocatoria, s.estado, s.creadoEn, 
                   mi.nombre AS modalidadNombre,
                   ep.nombre AS etapaNombre,
                   c.nombre as convocatoriaNombre, c.posgrado_id,
                   op.nombre as opcionNombre
            FROM solicitud s
            JOIN convocatorias c ON s.idConvocatoria = c.id
            LEFT JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
            LEFT JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
            LEFT JOIN modalidad_ingreso mi ON s.idModalidad = mi.id
            LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id
            LEFT JOIN modalidad_etapa me ON s.idModalidad = me.modalidad_id AND s.idEtapaActual = me.etapa_id
            WHERE s.idAspi IN (?)
            ORDER BY s.creadoEn DESC
        `;
        const [solicitudes] = await db.query(querySolicitudes, [idsAspirantes]);

        let documentos = [];
        if (solicitudes.length > 0) {
            const idsSolicitudes = solicitudes.map(s => s.idSolicitud);
            const queryDocs = `
                SELECT sd.id as idDocumento, sd.idSolicitud, sd.idRequisito, sd.rutaArchivo, sd.estadoValidacion, sd.comentarios, sd.intentos, cr.nombre as requisitoNombre
                FROM solicitud_documentos sd
                JOIN catalogo_requisitos cr ON sd.idRequisito = cr.id
                WHERE sd.idSolicitud IN (?)
                ORDER BY sd.intentos ASC
            `;
            const [docs] = await db.query(queryDocs, [idsSolicitudes]);
            documentos = docs;
        }

        const expedientes = aspirantes.map(asp => {
            const solsAsp = solicitudes.filter(s => s.idAspi === asp.id).map(sol => {
                const docsDeEstaSoli = documentos.filter(doc => doc.idSolicitud === sol.idSolicitud);
                return {
                    ...sol,
                    documentos: agruparDocumentosPorRequisito(docsDeEstaSoli)
                };
            });
            return {
                perfil: asp,
                solicitudes: solsAsp
            };
        });

        return res.status(200).json(expedientes);
    } catch (error) {
        console.error('Error en obtenerTodosLosExpedientes:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
};

// ==========================================
// Obtener Dictamen del Aspirante
// ==========================================
const obtenerDictamen = async (req, res) => {

    try {

        const idUsuario = req.usuario.id;

        const [[dictamen]] = await db.query(`
            SELECT

                rf.resultado,
                rf.motivo,
                rf.fechaPublicacion,

                c.nombre AS programa

            FROM aspirante a

            INNER JOIN solicitud s
                ON s.idAspi = a.id

            INNER JOIN convocatorias c
                ON c.id = s.idConvocatoria

            LEFT JOIN resultado_final rf
                ON rf.idSolicitud = s.id

            WHERE a.idUsuario = ?

            ORDER BY s.id DESC

            LIMIT 1
        `,[idUsuario]);

        if(!dictamen){

            return res.json({
                resultado: null,
                motivo: null
            });

        }

        res.json(dictamen);

    }catch(error){

        console.error(error);

        res.status(500).json({
            mensaje:"Error al obtener el dictamen."
        });

    }

};

module.exports = {
    registrarAspirante,
    getAspiranteMe,
    obtenerAspirantes,
    obtenerAspirantePorId,
    obtenerExpediente,
    obtenerTodosLosExpedientes,
    obtenerDictamen
};