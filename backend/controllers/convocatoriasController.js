const db = require('../database/db');
const emit = require('../utils/socketEmit');

// Obtener todas las convocatorias
const obtenerConvocatorias = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM convocatorias');
        
        // Fetch options for each convocatoria
        const [opciones] = await db.query(`
            SELECT co.id as idConvocatoriaOpcion, co.convocatoria_id, co.cupos, co.activo as opcionConvocatoriaActiva,
                   op.id as idOpcionPosgrado, op.nombre, op.descripcion, op.activo as opcionPosgradoActiva
            FROM convocatoria_opcion co
            JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
        `);

        // Attach options to convocatorias
        const convocatoriasConOpciones = resultados.map(conv => {
            return {
                ...conv,
                opciones: opciones.filter(op => op.convocatoria_id === conv.id)
            };
        });

        return res.json(convocatoriasConOpciones);
    } catch (error) {
        console.error('Error en obtenerConvocatorias:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener convocatorias' });
    }
};

// Obtener una convocatoria por ID
const obtenerConvocatoria = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM convocatorias WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Convocatoria no encontrada' });
        }

        // Fetch options for this convocatoria
        const [opciones] = await db.query(`
            SELECT co.id as idConvocatoriaOpcion, co.convocatoria_id, co.cupos, co.activo as opcionConvocatoriaActiva,
                   op.id as idOpcionPosgrado, op.nombre, op.descripcion, op.activo as opcionPosgradoActiva
            FROM convocatoria_opcion co
            JOIN opcion_posgrado op ON co.opcion_posgrado_id = op.id
            WHERE co.convocatoria_id = ?
        `, [id]);

        return res.json({
            ...resultados[0],
            opciones
        });
    } catch (error) {
        console.error('Error en obtenerConvocatoria:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener convocatoria' });
    }
};

// Crear convocatoria con requisitos y opciones
const crearConvocatorias = async (req, res) => {
    let connection;
    try {
        const { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos, opciones, posgrado_id, tipo, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, duracion, modalidad, inicioCurso, finCurso, inicioExamen, finExamen } = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // M-06: idCreador siempre proviene del JWT (req.usuario.id garantizado por auth middleware).
        // Nunca se acepta del body para evitar spoofing del creador.
        const idCreador = req.usuario.id;

        const [resultado] = await connection.query(
            'INSERT INTO convocatorias (nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id, tipo, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, duracion, modalidad, inicioCurso, finCurso, inicioExamen, finExamen, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id || null, tipo || 'MAESTRIA', fechaInicioDocumentos || null, fechaFinDocumentos || null, fechaEntrevistaInicio || null, fechaEntrevistaFin || null, fechaInicioEscolar || null, fechaResultados || null, duracion || 0, modalidad || 'Escolarizada', inicioCurso || null, finCurso || null, inicioExamen || null, finExamen || null, idCreador]
        );

        const convocatoriaId = resultado.insertId;

        // Insertar requisitos si existen
        if (requisitos && requisitos.length > 0) {
            const reqValues = requisitos.map(r => [convocatoriaId, r.id, r.obligatorio ? 1 : 0]);
            await connection.query(
                'INSERT INTO convocatoria_requisitos (convocatoria_id, requisito_id, obligatorio) VALUES ?',
                [reqValues]
            );
        }

        // Insertar opciones de posgrado si existen
        if (opciones && opciones.length > 0) {
            const opValues = opciones.map(o => [convocatoriaId, o.idOpcionPosgrado, o.cupos]);
            await connection.query(
                'INSERT INTO convocatoria_opcion (convocatoria_id, opcion_posgrado_id, cupos) VALUES ?',
                [opValues]
            );
        }

        await connection.commit();

        // Notificar a ADMIN y ASPIRANTE (nueva convocatoria disponible)
        emit.aAdminYAspirantes(req);
        return res.json({ success: true, mensaje: 'Convocatoria creada correctamente' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en crearConvocatorias:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear convocatoria' });
    } finally {
        if (connection) connection.release();
    }
};

// Actualizar convocatoria con requisitos
const actualizarConvocatorias = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos, posgrado_id, tipo, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, duracion, modalidad, inicioCurso, finCurso, inicioExamen, finExamen } = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.query(
            'UPDATE convocatorias SET nombre=?, descripcion=?, fecha_inicio=?, fecha_fin=?, estado=?, posgrado_id=?, tipo=?, fechaInicioDocumentos=?, fechaFinDocumentos=?, fechaEntrevistaInicio=?, fechaEntrevistaFin=?, fechaInicioEscolar=?, fechaResultados=?, duracion=?, modalidad=?, inicioCurso=?, finCurso=?, inicioExamen=?, finExamen=? WHERE id=?',
            [nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id || null, tipo || 'MAESTRIA', fechaInicioDocumentos || null, fechaFinDocumentos || null, fechaEntrevistaInicio || null, fechaEntrevistaFin || null, fechaInicioEscolar || null, fechaResultados || null, duracion || 0, modalidad || 'Escolarizada', inicioCurso || null, finCurso || null, inicioExamen || null, finExamen || null, id]
        );

        // Obtener requisitos actuales
        const [existentes] = await connection.query('SELECT id, requisito_id FROM convocatoria_requisitos WHERE convocatoria_id = ?', [id]);
        
        const nuevosIds = requisitos ? requisitos.map(r => r.id.toString()) : [];
        
        // 1. Eliminar los que ya no están marcados (si no tienen documentos asociados)
        const paraEliminar = existentes.filter(e => !nuevosIds.includes(e.requisito_id.toString()));
        for (const req of paraEliminar) {
            try {
                await connection.query('DELETE FROM convocatoria_requisitos WHERE id = ?', [req.id]);
            } catch (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    // No podemos eliminarlo porque ya hay documentos subidos, lo omitimos silenciosamente
                    console.warn(`No se pudo eliminar el requisito ${req.id} de la convocatoria porque está en uso.`);
                } else {
                    throw err;
                }
            }
        }

        // 2. Insertar nuevos o actualizar existentes
        if (requisitos && requisitos.length > 0) {
            for (const r of requisitos) {
                const existe = existentes.find(e => e.requisito_id.toString() === r.id.toString());
                if (existe) {
                    await connection.query('UPDATE convocatoria_requisitos SET obligatorio = ? WHERE id = ?', [r.obligatorio ? 1 : 0, existe.id]);
                } else {
                    await connection.query('INSERT INTO convocatoria_requisitos (convocatoria_id, requisito_id, obligatorio) VALUES (?, ?, ?)', [id, r.id, r.obligatorio ? 1 : 0]);
                }
            }
        }

        // Manejar opciones de posgrado
        const { opciones } = req.body;
        const [existentesOpciones] = await connection.query('SELECT id, opcion_posgrado_id FROM convocatoria_opcion WHERE convocatoria_id = ?', [id]);
        const nuevosIdsOpciones = opciones ? opciones.map(o => o.idOpcionPosgrado.toString()) : [];
        
        const paraEliminarOpciones = existentesOpciones.filter(e => !nuevosIdsOpciones.includes(e.opcion_posgrado_id.toString()));
        for (const opc of paraEliminarOpciones) {
            try {
                await connection.query('DELETE FROM convocatoria_opcion WHERE id = ?', [opc.id]);
            } catch (err) {
                console.warn(`No se pudo eliminar la opcion ${opc.id} de la convocatoria porque está en uso.`);
            }
        }

        if (opciones && opciones.length > 0) {
            for (const o of opciones) {
                const existeOpc = existentesOpciones.find(e => e.opcion_posgrado_id.toString() === o.idOpcionPosgrado.toString());
                if (existeOpc) {
                    await connection.query('UPDATE convocatoria_opcion SET cupos = ? WHERE id = ?', [o.cupos, existeOpc.id]);
                } else {
                    await connection.query('INSERT INTO convocatoria_opcion (convocatoria_id, opcion_posgrado_id, cupos) VALUES (?, ?, ?)', [id, o.idOpcionPosgrado, o.cupos]);
                }
            }
        }

        await connection.commit();

        // Notificar a ADMIN y ASPIRANTE (convocatoria actualizada)
        emit.aAdminYAspirantes(req);
        return res.json({ success: true, mensaje: 'Convocatoria actualizada correctamente' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en actualizarConvocatorias:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar convocatoria' });
    } finally {
        if (connection) connection.release();
    }
};

// Eliminar convocatoria
const eliminarConvocatorias = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM convocatorias WHERE id=?', [id]);
        
        // Notificar a ADMIN y ASPIRANTE (convocatoria eliminada)
        emit.aAdminYAspirantes(req);
        return res.json({ success: true, mensaje: 'Convocatoria eliminada correctamente' });
    } catch (error) {
        console.error('Error en eliminarConvocatorias:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar convocatoria' });
    }
};

// Obtener requisitos de una convocatoria
const obtenerRequisitosConvocatoria = async (req, res) => {
    try {
        const { id } = req.params;

        const [resultados] = await db.query(
            `SELECT
                cr.id AS pivot_id,
                cr.obligatorio,
                cat.id AS id,
                cat.nombre AS descripcion,
                cat.categoria
            FROM convocatoria_requisitos cr
            INNER JOIN catalogo_requisitos cat ON cr.requisito_id = cat.id
            WHERE cr.convocatoria_id = ?`,
            [id]
        );

        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerRequisitosConvocatoria:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener requisitos de la convocatoria' });
    }
};

module.exports = {
    obtenerConvocatorias,
    obtenerConvocatoria,
    crearConvocatorias,
    actualizarConvocatorias,
    eliminarConvocatorias,
    obtenerRequisitosConvocatoria
};
