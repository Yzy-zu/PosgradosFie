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

exports.register = (req, res) => {
    const { nombre, correo, password, rol } = req.body;

    // 1. Validar que no vengan campos vacíos
    if (!nombre || !correo || !password) {
        return res.status(400).json({
            success: false,
            mensaje: 'Todos los campos son obligatorios'
        });
    }

    // 2. Query SQL para insertar el nuevo aspirante
    // Nota: Revisa que los nombres de las columnas coincidan con tu tabla 'usuario' (nombre, correo, contraseña, rol)
    const sql = `
        INSERT INTO usuario (nombre, correo, contraseña, rol) 
        VALUES (?, ?, ?, ?)
    `;

    // 3. Ejecutar la consulta en la base de datos
    db.query(sql, [nombre, correo, password, rol || 'ASPIRANTE'], (err, result) => {
        if (err) {
            console.error('Error al insertar en la base de datos:', err);
            
            // Si el correo ya existe (llave duplicada)
            if (err.code === 'ER_DUP_ENTRY') {
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

        // 4. Registro exitoso
        return res.status(201).json({
            success: true,
            mensaje: 'Usuario registrado correctamente',
            usuarioId: result.insertId
        });
    });
};