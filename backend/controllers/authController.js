const db = require('../database/db');

exports.login = (req, res) => {

    const { usuario, password } = req.body;

    const sql = `
        SELECT *
        FROM usuario
        WHERE correo = ?
        AND contraseña = ?
    `;

    db.query(
        sql,
        [usuario, password],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    mensaje: 'Error del servidor'
                });

            }

            if (result.length > 0) {

                return res.json({
                    success: true,
                    mensaje: 'Login correcto',
                    usuario: result[0]
                });

            }

            return res.json({
                success: false,
                mensaje: 'Correo o contraseña incorrectos'
            });

        }
    );

};