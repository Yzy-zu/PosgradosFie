const db = require('../database/db');
const jwt = require('jsonwebtoken');

// Iniciar sesión
exports.login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        const [resultado] = await db.query(
            'SELECT * FROM usuario WHERE correo = ? AND contraseña = ?',
            [usuario, password]
        );

        if (resultado.length === 0) {
            return res.status(401).json({
                success: false,
                mensaje: 'Correo o contraseña incorrectos'
            });
        }

        const usuarioDB = resultado[0];

        const token = jwt.sign(
            { id: usuarioDB.id, rol: usuarioDB.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        return res.json({
            success: true,
            mensaje: 'Login correcto',
            token,
            usuario: {
                id: usuarioDB.id,
                correo: usuarioDB.correo,
                rol: usuarioDB.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error del servidor'
        });
    }
};

// Registrar usuario
exports.register = async (req, res) => {
    try {
        const { nombre, correo, password, rol } = req.body;

        if (!nombre || !correo || !password) {
            return res.status(400).json({
                success: false,
                mensaje: 'Todos los campos son obligatorios'
            });
        }

        const [resultado] = await db.query(
            'INSERT INTO usuario (nombre, correo, contraseña, rol) VALUES (?, ?, ?, ?)',
            [nombre, correo, password, rol || 'ASPIRANTE']
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Usuario registrado correctamente',
            usuarioId: resultado.insertId
        });
    } catch (error) {
        console.error('Error en register:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                mensaje: 'El correo electrónico ya se encuentra registrado.'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje: 'Error interno del servidor al registrar usuario.'
        });
    }
};