const db = require('../database/db');
const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    const { usuario, password } = req.body;

    const sql = `
        SELECT *
        FROM usuario
        WHERE correo = ?
        AND contraseña = ?
    `;

    db.query(sql, [usuario, password], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                mensaje: 'Error del servidor'
            });
        }

        if (result.length === 0) {
            return res.status(401).json({
                success: false,
                mensaje: 'Correo o contraseña incorrectos'
            });
        }

        const usuarioDB = result[0];

        const token = jwt.sign(
            { id: usuarioDB.id, rol: usuarioDB.rol },
            process.env.JWT_SECRET || 'clave_secreta_temporal',
            { expiresIn: '8h' }
        );

        return res.json({
            success: true,
            mensaje: 'Login correcto',
            token: token,
            usuario: {
                id: usuarioDB.id,
                correo: usuarioDB.correo,
                rol: usuarioDB.rol
            }
        });
    });
};