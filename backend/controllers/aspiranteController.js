const db = require('../database/db');
const bcrypt = require('bcrypt');

// Registrar aspirante (con usuario asociado)
const registrarAspirante = async (req, res) => {
    try {
        const {
            nombre, primerApellido, segundoApellido, curp,
            correo, telefono, fechaNacimiento, direccion, password, rfc
        } = req.body;

        // Validaciones de campos obligatorios
        if (!nombre || !primerApellido || !curp || !correo || !telefono || !fechaNacimiento || !direccion || !password || !rfc) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
        }

        // Validar formato de correo
        const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!correoRegex.test(correo)) {
            return res.status(400).json({ mensaje: 'Correo inválido.' });
        }

        // Validar CURP (18 caracteres)
        if (curp.length !== 18) {
            return res.status(400).json({ mensaje: 'La CURP debe tener 18 caracteres.' });
        }

        // Validar teléfono (10 dígitos)
        if (!/^\d{10}$/.test(telefono)) {
            return res.status(400).json({ mensaje: 'El teléfono debe tener 10 dígitos.' });
        }

        // Validar contraseña (mínimo 8 caracteres)
        if (password.length < 8) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 8 caracteres.' });
        }

        // Verificar correo duplicado
        const [resultadoCorreo] = await db.query('SELECT id FROM usuario WHERE correo = ?', [correo]);
        if (resultadoCorreo.length > 0) {
            return res.status(409).json({ mensaje: 'El correo ya está registrado.' });
        }

        // Verificar CURP duplicado
        const [resultadoCurp] = await db.query('SELECT id FROM aspirante WHERE curp = ?', [curp]);
        if (resultadoCurp.length > 0) {
            return res.status(409).json({ mensaje: 'La CURP ya está registrada.' });
        }

        // Verificar RFC duplicado (antes era fire-and-forget, ahora se espera correctamente)
        const [resultadoRfc] = await db.query('SELECT id FROM aspirante WHERE rfc = ?', [rfc]);
        if (resultadoRfc.length > 0) {
            return res.status(409).json({ mensaje: 'El RFC ya está registrado.' });
        }

        // Encriptar contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [resultadoUsuario] = await db.query(
            'INSERT INTO usuario(correo, password, rol) VALUES(?, ?, ?)',
            [correo, passwordHash, 'aspirante']
        );

        const idUsuario = resultadoUsuario.insertId;

        // Insertar aspirante
        await db.query(
            `INSERT INTO aspirante
            (nombre, primerApellido, segundoApellido, curp, correo, telefono, fechaNacimiento, direccion, rfc, idUsuario)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, primerApellido, segundoApellido, curp, correo, telefono, fechaNacimiento, direccion, rfc, idUsuario]
        );

        return res.status(201).json({ mensaje: 'Aspirante registrado correctamente.' });
    } catch (error) {
        console.error('Error en registrarAspirante:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Obtener todos los aspirantes
const obtenerAspirantes = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM aspirante');
        return res.status(200).json(resultados);
    } catch (error) {
        console.error('Error en obtenerAspirantes:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
};

// Obtener aspirante por ID
const obtenerAspirantePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM aspirante WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Aspirante no encontrado' });
        }

        return res.status(200).json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerAspirantePorId:', error);
        return res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
};

module.exports = {
    registrarAspirante,
    obtenerAspirantes,
    obtenerAspirantePorId
};