const db = require('../database/db');

// =======================
// Subir documento
// =======================
const subirDocumento = (req, res) => {

    const { idSoli, tipoDoc } = req.body;

    // Validar campos
    if (!idSoli || !tipoDoc) {
        return res.status(400).json({
            mensaje: "Todos los campos son obligatorios."
        });
    }

    // Validar archivo
    if (!req.file) {
        return res.status(400).json({
            mensaje: "Debe seleccionar un archivo."
        });
    }

    // Verificar que exista la solicitud
    db.query(
        "SELECT * FROM solicitud WHERE id = ?",
        [idSoli],
        (err, solicitud) => {

            if (err)
                return res.status(500).json(err);

            if (solicitud.length === 0) {
                return res.status(404).json({
                    mensaje: "La solicitud no existe."
                });
            }

            // Guardar documento
            db.query(
                `INSERT INTO documento
                (idSoli, tipoDoc, rutaArchivo)
                VALUES (?, ?, ?)`,
                [
                    idSoli,
                    tipoDoc,
                    req.file.filename
                ],
                (err, resultado) => {

                    if (err)
                        return res.status(500).json(err);

                    res.status(201).json({
                        mensaje: "Documento registrado correctamente.",
                        idDocumento: resultado.insertId
                    });

                }
            );

        }
    );

};

// =======================
// Obtener todos
// =======================
const obtenerDocumentos = (req, res) => {

    db.query(
        "SELECT * FROM documento",
        (err, resultados) => {

            if (err)
                return res.status(500).json(err);

            res.json(resultados);

        }
    );

};

// =======================
// Obtener uno
// =======================
const obtenerDocumento = (req, res) => {

    const { id } = req.params;

    db.query(
        "SELECT * FROM documento WHERE id = ?",
        [id],
        (err, resultado) => {

            if (err)
                return res.status(500).json(err);

            if (resultado.length === 0) {

                return res.status(404).json({
                    mensaje: "Documento no encontrado."
                });

            }

            res.json(resultado[0]);

        }
    );

};

// =======================
// Actualizar documento
// =======================
const actualizarDocumento = (req, res) => {

    const { id } = req.params;
    const { estadoDoc } = req.body;

    db.query(
        "UPDATE documento SET estadoDoc = ? WHERE id = ?",
        [estadoDoc, id],
        (err) => {

            if (err)
                return res.status(500).json(err);

            res.json({
                mensaje: "Documento actualizado correctamente."
            });

        }
    );

};

// =======================
// Eliminar documento
// =======================
const eliminarDocumento = (req, res) => {

    const { id } = req.params;

    db.query(
        "DELETE FROM documento WHERE id = ?",
        [id],
        (err) => {

            if (err)
                return res.status(500).json(err);

            res.json({
                mensaje: "Documento eliminado correctamente."
            });

        }
    );

};

module.exports = {
    subirDocumento,
    obtenerDocumentos,
    obtenerDocumento,
    actualizarDocumento,
    eliminarDocumento
};