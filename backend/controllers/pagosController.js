const db = require('../database/db');

// Obtener todos
exports.obtenerPagos = (req, res) => {

    db.query('SELECT * FROM pagos', (err, resultados) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener pagos'
            });
        }

        res.json(resultados);

    });

};

// Obtener uno
exports.obtenerPago = (req, res) => {

    const { id } = req.params;

    db.query(
        'SELECT * FROM pagos WHERE id=?',
        [id],
        (err, resultados) => {

            if (err) {

                return res.status(500).json(err);

            }

            if (resultados.length === 0) {

                return res.status(404).json({
                    success: false,
                    mensaje: 'Pago no encontrado'
                });

            }

            res.json(resultados[0]);

        }
    );

};

// Crear
exports.crearPago = (req, res) => {

    const {

        idSoli,
        monto,
        referencia,
        estado

    } = req.body;

    db.query(

        `INSERT INTO pagos
        (idSoli,monto,referencia,estado)
        VALUES (?,?,?,?)`,

        [

            idSoli,
            monto,
            referencia,
            estado

        ],

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json(err);

            }

            res.json({

                success: true,
                mensaje: 'Pago registrado correctamente'

            });

        }

    );

};

// Actualizar
exports.actualizarPago = (req, res) => {

    const { id } = req.params;

    const {

        idSoli,
        monto,
        referencia,
        estado

    } = req.body;

    db.query(

        `UPDATE pagos SET

        idSoli=?,
        monto=?,
        referencia=?,
        estado=?

        WHERE id=?`,

        [

            idSoli,
            monto,
            referencia,
            estado,
            id

        ],

        (err) => {

            if (err) {

                return res.status(500).json(err);

            }

            res.json({

                success: true,
                mensaje: 'Pago actualizado'

            });

        }

    );

};

// Eliminar
exports.eliminarPago = (req, res) => {

    const { id } = req.params;

    db.query(

        'DELETE FROM pagos WHERE id=?',

        [id],

        (err) => {

            if (err) {

                return res.status(500).json(err);

            }

            res.json({

                success: true,
                mensaje: 'Pago eliminado'

            });

        }

    );

};