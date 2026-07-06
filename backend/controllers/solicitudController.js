const db = require('../database/db');

// Crear una solicitud
const crearSolicitud = (req, res) => {

    const { idAspi, idPos } = req.body;

    // Validar campos obligatorios
    if (!idAspi || !idPos) {
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

            // Verificar que exista el posgrado
            db.query(
                "SELECT * FROM posgrado WHERE id = ?",
                [idPos],
                (err, posgrado) => {

                    if (err)
                        return res.status(500).json(err);

                    if (posgrado.length === 0) {
                        return res.status(404).json({
                            mensaje: "El posgrado no existe."
                        });
                    }

                    // Insertar la solicitud
                    db.query(
                        `INSERT INTO solicitud (idAspi, idPos)
                         VALUES (?, ?)`,
                        [idAspi, idPos],
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