const db = require('../database/db');

// Crear una solicitud
const crearSolicitud = (req, res) => {

    const { idAspi, idConvocatoria } = req.body;

    // Validar campos obligatorios
    if (!idAspi || !idConvocatoria) {
        return res.status(400).json({
            mensaje: "Todos los campos son obligatorios."
        });
    }

    // Verificar que exista el aspirante
    db.query(
        "SELECT * FROM aspirante WHERE id = ?",
        [idAspi],
        (err, aspirante) => {

            if (err)
                return res.status(500).json(err);

            if (aspirante.length === 0) {
                return res.status(404).json({
                    mensaje: "El aspirante no existe."
                });
            }

            // Verificar que exista la convocatoria
            db.query(
                "SELECT * FROM convocatorias WHERE id = ?",
                [idConvocatoria],
                (err, convocatoria) => {

                    if (err)
                        return res.status(500).json(err);

                    if (convocatoria.length === 0) {
                        return res.status(404).json({
                            mensaje: "La convocatoria no existe."
                        });
                    }

                    // Insertar la solicitud
                    db.query(
                        `INSERT INTO solicitud (idAspi, idConvocatoria)
                         VALUES (?, ?)`,
                        [idAspi, idConvocatoria],
                        (err, resultado) => {

                            if (err)
                                return res.status(500).json(err);

                            return res.status(201).json({
                                mensaje: "Solicitud creada correctamente.",
                                idSolicitud: resultado.insertId
                            });

                        }
                    );

                }
            );

        }
    );

};

module.exports = {
    crearSolicitud
};