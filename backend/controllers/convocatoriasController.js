const db = require('../database/db');

// Obtener todas las convocatorias
const obtenerConvocatorias = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM convocatorias');
        return res.json(resultados);
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

        return res.json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerConvocatoria:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener convocatoria' });
    }
};

// Crear convocatoria con requisitos
const crearConvocatorias = async (req, res) => {
    try {
        const { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos, posgrado_id, tipo, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, duracion, modalidad, inicioCurso, finCurso, inicioExamen, finExamen } = req.body;

        const [resultado] = await db.query(
            'INSERT INTO convocatorias (nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id, tipo, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, duracion, modalidad, inicioCurso, finCurso, inicioExamen, finExamen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id || null, tipo || 'MAESTRIA', fechaInicioDocumentos || null, fechaFinDocumentos || null, fechaEntrevistaInicio || null, fechaEntrevistaFin || null, fechaInicioEscolar || null, fechaResultados || null, duracion || 0, modalidad || 'Escolarizada', inicioCurso || null, finCurso || null, inicioExamen || null, finExamen || null]
        );

        const convocatoriaId = resultado.insertId;

        // Insertar requisitos si existen
        if (requisitos && requisitos.length > 0) {
            const reqValues = requisitos.map(r => [convocatoriaId, r.id, r.obligatorio ? 1 : 0]);
            await db.query(
                'INSERT INTO convocatoria_requisitos (convocatoria_id, requisito_id, obligatorio) VALUES ?',
                [reqValues]
            );
        }

        return res.json({ success: true, mensaje: 'Convocatoria creada correctamente' });
    } catch (error) {
        console.error('Error en crearConvocatorias:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear convocatoria' });
    }
};

// Actualizar convocatoria con requisitos
const actualizarConvocatorias = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos, posgrado_id, tipo, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, duracion, modalidad, inicioCurso, finCurso, inicioExamen, finExamen } = req.body;

        await db.query(
            'UPDATE convocatorias SET nombre=?, descripcion=?, fecha_inicio=?, fecha_fin=?, estado=?, posgrado_id=?, tipo=?, fechaInicioDocumentos=?, fechaFinDocumentos=?, fechaEntrevistaInicio=?, fechaEntrevistaFin=?, fechaInicioEscolar=?, fechaResultados=?, duracion=?, modalidad=?, inicioCurso=?, finCurso=?, inicioExamen=?, finExamen=? WHERE id=?',
            [nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id || null, tipo || 'MAESTRIA', fechaInicioDocumentos || null, fechaFinDocumentos || null, fechaEntrevistaInicio || null, fechaEntrevistaFin || null, fechaInicioEscolar || null, fechaResultados || null, duracion || 0, modalidad || 'Escolarizada', inicioCurso || null, finCurso || null, inicioExamen || null, finExamen || null, id]
        );

        // Obtener requisitos actuales
        const [existentes] = await db.query('SELECT id, requisito_id FROM convocatoria_requisitos WHERE convocatoria_id = ?', [id]);
        
        const nuevosIds = requisitos ? requisitos.map(r => r.id.toString()) : [];
        
        // 1. Eliminar los que ya no están marcados (si no tienen documentos asociados)
        const paraEliminar = existentes.filter(e => !nuevosIds.includes(e.requisito_id.toString()));
        for (const req of paraEliminar) {
            try {
                await db.query('DELETE FROM convocatoria_requisitos WHERE id = ?', [req.id]);
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
                    await db.query('UPDATE convocatoria_requisitos SET obligatorio = ? WHERE id = ?', [r.obligatorio ? 1 : 0, existe.id]);
                } else {
                    await db.query('INSERT INTO convocatoria_requisitos (convocatoria_id, requisito_id, obligatorio) VALUES (?, ?, ?)', [id, r.id, r.obligatorio ? 1 : 0]);
                }
            }
        }

        return res.json({ success: true, mensaje: 'Convocatoria actualizada correctamente' });
    } catch (error) {
        console.error('Error en actualizarConvocatorias:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar convocatoria' });
    }
};

// Eliminar convocatoria
const eliminarConvocatorias = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM convocatorias WHERE id=?', [id]);
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
