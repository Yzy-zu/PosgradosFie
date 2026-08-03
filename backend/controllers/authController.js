const db = require('../database/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Iniciar sesión
exports.login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({ success: false, mensaje: 'Correo y contraseña son obligatorios.' });
        }

        // Solo buscar por correo — la comparación de contraseña se hace con bcrypt en Node
        const [resultado] = await db.query(
            'SELECT id, correo, contraseña, rol, activo FROM usuario WHERE correo = ?',
            [usuario]
        );

        if (resultado.length === 0) {
            return res.status(401).json({ success: false, mensaje: 'Correo o contraseña incorrectos.' });
        }

        const usuarioDB = resultado[0];

        if (!usuarioDB.activo) {
            return res.status(403).json({ success: false, mensaje: 'La cuenta está desactivada. Contacta al administrador.' });
        }

        // Comparar contraseña con el hash almacenado
        const passwordValida = await bcrypt.compare(password, usuarioDB.contraseña);
        if (!passwordValida) {
            return res.status(401).json({ success: false, mensaje: 'Correo o contraseña incorrectos.' });
        }

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
        return res.status(500).json({ success: false, mensaje: 'Error del servidor.' });
    }
};

// Registrar usuario (usado solo internamente; el registro público de aspirantes usa aspiranteController)
exports.register = async (req, res) => {
    try {
        const { correo, password, rol } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ success: false, mensaje: 'Correo y contraseña son obligatorios.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [resultado] = await db.query(
            'INSERT INTO usuario (correo, contraseña, rol) VALUES (?, ?, ?)',
            [correo, passwordHash, rol || 'ASPIRANTE']
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Usuario registrado correctamente',
            usuarioId: resultado.insertId
        });
    } catch (error) {
        console.error('Error en register:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, mensaje: 'El correo electrónico ya se encuentra registrado.' });
        }

        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al registrar usuario.' });
    }
};