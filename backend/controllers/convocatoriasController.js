const db = require('../database/db');

// Obtener todas
exports.obtenerConvocatorias = (req, res) => {

    const sql = 'SELECT * FROM convocatorias';

    db.query(sql, (err, resultados) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener convocatorias'
            });
        }

        res.json(resultados);

    });

};

// Obtener una
exports.obtenerConvocatoria = (req, res) => {

    const { id } = req.params;

    db.query(
        'SELECT * FROM convocatorias WHERE id = ?',
        [id],
        (err, resultados) => {

            if (err) {

                return res.status(500).json(err);

            }

            if (resultados.length === 0) {

                return res.status(404).json({
                    success: false,
                    mensaje: 'Convocatoria no encontrada'
                });

            }

            res.json(resultados[0]);

        }
    );

};

// Crear
exports.crearConvocatorias = (req, res) => {
    const { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos } = req.body;

    const sql = `
        INSERT INTO convocatorias
        (nombre, descripcion, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [nombre, descripcion, fecha_inicio, fecha_fin, estado], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al crear convocatoria' });
        }

        const convocatoriaId = result.insertId;

        // Insertar requisitos si existen
        if (requisitos && requisitos.length > 0) {
            const reqSql = 'INSERT INTO convocatoria_requisitos (convocatoria_id, requisito_id, obligatorio) VALUES ?';
            const reqValues = requisitos.map(r => [convocatoriaId, r.id, r.obligatorio ? 1 : 0]);

            db.query(reqSql, [reqValues], (reqErr) => {
                if (reqErr) {
                    console.error('Error insertando requisitos:', reqErr);
                    return res.status(500).json({ success: false, mensaje: 'Convocatoria creada, pero falló al guardar requisitos' });
                }
                res.json({ success: true, mensaje: 'Convocatoria y requisitos creados correctamente' });
            });
        } else {
            res.json({ success: true, mensaje: 'Convocatoria creada correctamente (Sin requisitos)' });
        }
    });
};

// Actualizar
exports.actualizarConvocatorias = (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos } = req.body;

    const sql = `
        UPDATE convocatorias
        SET nombre=?, descripcion=?, fecha_inicio=?, fecha_fin=?, estado=?
        WHERE id=?
    `;

    db.query(sql, [nombre, descripcion, fecha_inicio, fecha_fin, estado, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al actualizar convocatoria' });
        }

        // Borrar requisitos anteriores
        db.query('DELETE FROM convocatoria_requisitos WHERE convocatoria_id = ?', [id], (delErr) => {
            if (delErr) {
                console.error('Error borrando requisitos antiguos:', delErr);
                return res.status(500).json({ success: false, mensaje: 'Convocatoria actualizada, pero falló al limpiar requisitos antiguos' });
            }

            // Insertar los nuevos requisitos
            if (requisitos && requisitos.length > 0) {
                const reqSql = 'INSERT INTO convocatoria_requisitos (convocatoria_id, requisito_id, obligatorio) VALUES ?';
                const reqValues = requisitos.map(r => [id, r.id, r.obligatorio ? 1 : 0]);

                db.query(reqSql, [reqValues], (reqErr) => {
                    if (reqErr) {
                        console.error('Error insertando requisitos nuevos:', reqErr);
                        return res.status(500).json({ success: false, mensaje: 'Convocatoria actualizada, pero falló al guardar requisitos nuevos' });
                    }
                    res.json({ success: true, mensaje: 'Convocatoria y requisitos actualizados correctamente' });
                });
            } else {
                res.json({ success: true, mensaje: 'Convocatoria actualizada correctamente (Sin requisitos)' });
            }
        });
    });
};

// Eliminar
exports.eliminarConvocatorias = (req, res) => {

    const { id } = req.params;

    db.query(
        'DELETE FROM convocatorias WHERE id=?',
        [id],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al eliminar convocatoria'
                });

            }

            res.json({
                success: true,
                mensaje: 'Convocatoria eliminada correctamente'
            });

        }
    );

};
// Obtener requisitos de una convocatoria
exports.obtenerRequisitosConvocatoria = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
            cr.id AS pivot_id,
            cr.obligatorio,
            cat.id AS id,
            cat.nombre AS descripcion,
            cat.categoria
        FROM convocatoria_requisitos cr
        INNER JOIN catalogo_requisitos cat ON cr.requisito_id = cat.id
        WHERE cr.convocatoria_id = ?
    `;

    db.query(
        sql,
        [id],
        (err, resultados) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al obtener requisitos de la convocatoria'
                });
            }
            res.json(resultados);
        }
    );
};
