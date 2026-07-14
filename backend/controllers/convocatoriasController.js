const db = require('../database/db');

// Obtener todas
exports.obtenerConvocatorias = (req, res) => {

    const sql = `
        SELECT c.*, p.tipo as posgrado_tipo, p.nombre as posgrado_nombre 
        FROM convocatorias c 
        LEFT JOIN posgrado p ON c.posgrado_id = p.id
    `;

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
exports.crearConvocatoria = (req, res) => {

    const {

        nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        estado,
        posgrado_id

    } = req.body;

    const sql = `
        INSERT INTO convocatorias
        (nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            nombre,
            descripcion,
            fecha_inicio,
            fecha_fin,
            estado,
            posgrado_id
        ],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al crear convocatoria'
                });

            }

            res.json({
                success: true,
                mensaje: 'Convocatoria creada correctamente'
            });

        }
    );

};

// Actualizar
exports.actualizarConvocatorias = (req, res) => {

    const { id } = req.params;

    const {

        nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        estado,
        posgrado_id

    } = req.body;

    const sql = `
        UPDATE convocatorias
        SET
            nombre=?,
            descripcion=?,
            fecha_inicio=?,
            fecha_fin=?,
            estado=?,
            posgrado_id=?
        WHERE id=?
    `;

    db.query(
        sql,
        [
            nombre,
            descripcion,
            fecha_inicio,
            fecha_fin,
            estado,
            posgrado_id,
            id
        ],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al actualizar convocatoria'
                });

            }

            res.json({
                success: true,
                mensaje: 'Convocatoria actualizada correctamente'
            });

        }
    );

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