const db = require('../database/db');

// ==============================
// Obtener todos los docentes
// ==============================

exports.obtenerDocentes = (req, res) => {

    const sql = 'SELECT * FROM docente';

    db.query(sql, (err, resultados) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener docentes'
            });

        }

        res.json(resultados);

    });

};

// ==============================
// Obtener un docente
// ==============================

exports.obtenerDocente = (req, res) => {

    const { id } = req.params;

    const sql = 'SELECT * FROM docente WHERE idDocente = ?';

    db.query(sql, [id], (err, resultados) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener docente'
            });

        }

        if (resultados.length === 0) {

            return res.status(404).json({
                success: false,
                mensaje: 'Docente no encontrado'
            });

        }

        res.json(resultados[0]);

    });

};

// ==============================
// Crear docente
// ==============================

exports.crearDocente = (req, res) => {

    const {
        nombre,
        correo,
        telefono,
        especialidad
    } = req.body;

    const sql = `
        INSERT INTO docente
        (nombre, correo, telefono, especialidad)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [nombre, correo, telefono, especialidad],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al crear docente'
                });

            }

            res.json({
                success: true,
                mensaje: 'Docente creado correctamente'
            });

        }
    );

};

// ==============================
// Actualizar docente
// ==============================

exports.actualizarDocente = (req, res) => {

    const { id } = req.params;

    const {
        nombre,
        correo,
        telefono,
        especialidad
    } = req.body;

    const sql = `
        UPDATE docente
        SET
            nombre = ?,
            correo = ?,
            telefono = ?,
            especialidad = ?
        WHERE idDocente = ?
    `;

    db.query(
        sql,
        [nombre, correo, telefono, especialidad, id],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error al actualizar docente'
                });

            }

            res.json({
                success: true,
                mensaje: 'Docente actualizado correctamente'
            });

        }
    );

};

// ==============================
// Eliminar docente
// ==============================

exports.eliminarDocente = (req, res) => {

    const { id } = req.params;

    const sql = 'DELETE FROM docente WHERE idDocente = ?';

    db.query(sql, [id], (err) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al eliminar docente'
            });

        }

        res.json({
            success: true,
            mensaje: 'Docente eliminado correctamente'
        });

    });

};