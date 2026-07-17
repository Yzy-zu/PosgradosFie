const db = require('../database/db');

// Crear una solicitud
const crearSolicitud = (req, res) => {

    const { idAspi, idC } = req.body;

    // Validar campos obligatorios
    if (!idAspi || !idC) {
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
                "SELECT * FROM convocatorias WHERE id = ?",
                [idC],
                (err, convocatoria) => {

                    if (err)
                        return res.status(500).json(err);

                    if (convocatoria.length === 0) {
                        return res.status(404).json({
                            mensaje: "El posgrado no existe."
                        });
                    }

                    // Buscar si el usuario ya tiene CUALQUIER solicitud activa
                    db.query(
                        "SELECT * FROM solicitud WHERE idAspi = ? AND estado IN ('PENDIENTE', 'EN_REVISION')",
                        [idAspi],
                        (err, solicitudes) => {
                            if (err) return res.status(500).json(err);

                            if (solicitudes.length > 0) {
                                // Buscar si ALGUNA de las solicitudes activas coincide con esta convocatoria
                                const match = solicitudes.find(s => s.idConvocatoria == idC);
                                
                                if (match) {
                                    // Mismo posgrado: devolver el ID existente para restaurar estado
                                    return res.status(200).json({
                                        mensaje: "Solicitud recuperada.",
                                        idSolicitud: match.id
                                    });
                                } else {
                                    // Diferente posgrado: Bloqueo de seguridad!
                                    return res.status(409).json({
                                        mensaje: "Acceso denegado: Ya tienes un proceso de admisión en curso."
                                    });
                                }
                            }

                            // No existe, Insertar la nueva solicitud
                            db.query(
                                `INSERT INTO solicitud (idAspi, idConvocatoria)
                                 VALUES (?, ?)`,
                                [idAspi, idC],
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

        }
    );

};

// Obtener la solicitud activa de un aspirante
const getSolicitudActiva = (req, res) => {
    const { idAspi } = req.params;

    const query = `
        SELECT s.*, c.tipo AS nivel 
        FROM solicitud s 
        JOIN convocatorias c ON s.idConvocatoria = c.id 
        WHERE s.idAspi = ? AND s.estado IN ('PENDIENTE', 'EN_REVISION') 
        ORDER BY s.creadoEn DESC LIMIT 1
    `;

    db.query(query, [idAspi], (err, resultados) => {
        if (err) {
            console.error("Error obteniendo solicitud activa:", err);
            return res.status(500).json(err);
        }

        if (resultados.length > 0) {
            return res.status(200).json({
                existe: true,
                ...resultados[0]
            });
        } else {
            return res.status(200).json({
                existe: false
            });
        }
    });
};

// Cancelar solicitud
const cancelarSolicitud = (req, res) => {
    const { id } = req.params;
    db.query(
        "UPDATE solicitud SET estado = 'CANCELADO' WHERE id = ?",
        [id],
        (err, resultado) => {
            if (err) return res.status(500).json(err);
            return res.status(200).json({ mensaje: "Solicitud cancelada exitosamente." });
        }
    );
};

// Obtener las modalidades de admisión desde el ENUM de la BD
const getModalidades = (req, res) => {
    db.query("SHOW COLUMNS FROM solicitud LIKE 'tipoAdmision'", (err, resultado) => {
        if (err) {
            console.error("Error obteniendo modalidades:", err);
            return res.status(500).json(err);
        }

        if (resultado.length > 0) {
            const enumStr = resultado[0].Type;
            // Extraer valores entre comillas simples: enum('EXAMEN_ADMISION','CURSO_PROPEDEUTICO')
            const matches = enumStr.match(/'([^']+)'/g);
            if (matches) {
                const opciones = matches.map(m => m.replace(/'/g, ''));
                return res.status(200).json(opciones);
            }
        }
        
        return res.status(404).json({ mensaje: "No se encontraron modalidades." });
    });
};

// Actualizar la modalidad seleccionada
const actualizarModalidad = (req, res) => {
    const { id } = req.params;
    const { tipoAdmision } = req.body;

    if (!tipoAdmision) {
        return res.status(400).json({ mensaje: "El tipo de admisión es requerido." });
    }

    db.query(
        "UPDATE solicitud SET tipoAdmision = ? WHERE id = ?",
        [tipoAdmision, id],
        (err, resultado) => {
            if (err) return res.status(500).json(err);
            return res.status(200).json({ mensaje: "Modalidad actualizada correctamente." });
        }
    );
};

// Actualizar la estación actual de una solicitud
const actualizarEstacion = (req, res) => {
    const { id } = req.params;
    const { estacion_actual } = req.body;

    if (estacion_actual === undefined) {
        return res.status(400).json({ mensaje: "Falta estacion_actual" });
    }

    db.query(
        "UPDATE solicitud SET estacion_actual = ? WHERE id = ?",
        [estacion_actual, id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ mensaje: "Estación actualizada correctamente" });
        }
    );
};

module.exports = {
    crearSolicitud,
    getSolicitudActiva,
    cancelarSolicitud,
    getModalidades,
    actualizarModalidad,
    actualizarEstacion
};
