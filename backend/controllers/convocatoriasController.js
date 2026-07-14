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
exports.obtenerConvocatorias = (req, res) => {

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

    const {

        titulo,
        descripcion,
        fechaInicio,
        fechaFin,
        estado

    } = req.body;

    const sql = `
        INSERT INTO convocatorias
        (titulo, descripcion, fechaInicio, fechaFin, estado)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            titulo,
            descripcion,
            fechaInicio,
            fechaFin,
            estado
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

        titulo,
        descripcion,
        fechaInicio,
        fechaFin,
        estado

    } = req.body;

    const sql = `
        UPDATE convocatorias
        SET
            titulo=?,
            descripcion=?,
            fechaInicio=?,
            fechaFin=?,
            estado=?
        WHERE id=?
    `;

    db.query(
        sql,
        [
            titulo,
            descripcion,
            fechaInicio,
            fechaFin,
            estado,
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