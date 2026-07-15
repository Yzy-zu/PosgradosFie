const db = require('../database/db');

// Obtener todas las notificaciones
exports.obtenerNotificaciones = (req, res) => {

    const sql = 'SELECT * FROM notificaciones';

    db.query(sql, (err, resultados) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener las notificaciones'
            });
        }

        res.json(resultados);

    });

};

// Obtener una notificación
exports.obtenerNotificacion = (req, res) => {

    const { id } = req.params;

    db.query(
        'SELECT * FROM notificaciones WHERE id = ?',
        [id],
        (err, resultados) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al obtener la notificación'
                });
            }

            if (resultados.length === 0) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Notificación no encontrada'
                });
            }

            res.json(resultados[0]);

        }
    );

};

// Crear notificación
exports.crearNotificacion = (req, res) => {

    const {
        nombre,
        mensaje,
        destino
    } = req.body;

    const sql = `
        INSERT INTO notificaciones
        (nombre, mensaje, destino)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [nombre, mensaje, destino],
        (err, resultado) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al crear la notificación'
                });
            }

            res.json({
                success: true,
                mensaje: 'Notificación creada correctamente',
                id: resultado.insertId
            });

        }
    );

};

// Actualizar notificación
exports.actualizarNotificacion = (req, res) => {

    const { id } = req.params;

    const {
        nombre,
        mensaje,
        destino
    } = req.body;

    const sql = `
        UPDATE notificaciones
        SET
            nombre = ?,
            mensaje = ?,
            destino = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [nombre, mensaje, destino, id],
        (err) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al actualizar la notificación'
                });
            }

            res.json({
                success: true,
                mensaje: 'Notificación actualizada correctamente'
            });

        }
    );

};

// Eliminar notificación
exports.eliminarNotificacion = (req, res) => {

    const { id } = req.params;

    db.query(
        'DELETE FROM notificaciones WHERE id = ?',
        [id],
        (err) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al eliminar la notificación'
                });
            }

            res.json({
                success: true,
                mensaje: 'Notificación eliminada correctamente'
            });

        }
    );

};