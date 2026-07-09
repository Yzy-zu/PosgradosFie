const db = require('../database/db');

// ==============================
// Obtener todas las evaluaciones
// ==============================

exports.obtenerEvaluaciones = (req, res) => {

    db.query('SELECT * FROM evaluacion', (err, resultados) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener evaluaciones'
            });
        }

        res.json(resultados);

    });

};

// ==============================
// Obtener una evaluación
// ==============================

exports.obtenerEvaluacion = (req, res) => {

    const { id } = req.params;

    db.query(
        'SELECT * FROM evaluacion WHERE id = ?',
        [id],
        (err, resultados) => {

            if (err) {

                console.error(err);

                return res.status(500).json(err);

            }

            if (resultados.length === 0) {

                return res.status(404).json({
                    success: false,
                    mensaje: 'Evaluación no encontrada'
                });

            }

            res.json(resultados[0]);

        }
    );

};

// ==============================
// Crear evaluación
// ==============================

exports.crearEvaluacion = (req, res) => {

    const {

        idSoli,
        idUsua,
        notaExamen,
        notaEntrevista,
        observaciones

    } = req.body;

    db.query(

        `INSERT INTO evaluacion
        (idSoli,idUsua,notaExamen,notaEntrevista,observaciones)
        VALUES (?,?,?,?,?)`,

        [

            idSoli,
            idUsua,
            notaExamen,
            notaEntrevista,
            observaciones

        ],

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json(err);

            }

            res.json({

                success: true,
                mensaje: 'Evaluación registrada correctamente'

            });

        }

    );

};

// ==============================
// Actualizar evaluación
// ==============================

exports.actualizarEvaluacion = (req, res) => {

    const { id } = req.params;

    const {

        idSoli,
        idUsua,
        notaExamen,
        notaEntrevista,
        observaciones

    } = req.body;

    db.query(

        `UPDATE evaluacion
        SET
        idSoli=?,
        idUsua=?,
        notaExamen=?,
        notaEntrevista=?,
        observaciones=?
        WHERE id=?`,

        [

            idSoli,
            idUsua,
            notaExamen,
            notaEntrevista,
            observaciones,
            id

        ],

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json(err);

            }

            res.json({

                success: true,
                mensaje: 'Evaluación actualizada correctamente'

            });

        }

    );

};

// ==============================
// Eliminar evaluación
// ==============================

exports.eliminarEvaluacion = (req, res) => {

    const { id } = req.params;

    db.query(

        'DELETE FROM evaluacion WHERE id=?',

        [id],

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json(err);

            }

            res.json({

                success: true,
                mensaje: 'Evaluación eliminada correctamente'

            });

        }

    );

};