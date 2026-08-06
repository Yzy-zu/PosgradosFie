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

        // 1. Buscar usuario
        const [resultado] = await db.query(
            'SELECT id, correo, contraseña, rol, activo FROM usuario WHERE correo = ?',
            [usuario]
        );

        if (resultado.length === 0) {
            return res.status(401).json({ success: false, mensaje: 'Correo o contraseña incorrectos.' });
        }

        const usuarioDB = resultado[0];

        if (!usuarioDB.activo) {
            return res.status(403).json({ success: false, mensaje: 'La cuenta está desactivada.' });
        }

        // 2. Comparar contraseña
        const passwordValida = await bcrypt.compare(password, usuarioDB.contraseña);
        if (!passwordValida) {
            return res.status(401).json({ success: false, mensaje: 'Correo o contraseña incorrectos.' });
        }

        // 3. Obtener datos de la tabla secretario detectando la columna FK
        let datosExtra = {};
        if (usuarioDB.rol === 'SECRETARIO') {
            try {
                const [columns] = await db.query('SHOW COLUMNS FROM secretario');
                const fieldNames = columns.map(c => c.Field);

                let fkCol = fieldNames.find(f => ['idUsuario', 'idUsua', 'id_usuario', 'usuario_id'].includes(f)) || 'id';

                const sqlQuery = 'SELECT * FROM secretario WHERE ' + fkCol + ' = ? LIMIT 1';
                const [secResult] = await db.query(sqlQuery, [usuarioDB.id]);

                if (secResult.length > 0) {
                    datosExtra = secResult[0];
                }
            } catch (errSec) {
                console.error("Error al consultar la tabla secretario:", errSec);
            }
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
                rol: usuarioDB.rol,
                ...datosExtra,
                SECRE_AREA: datosExtra.area || datosExtra.secre_area || datosExtra.SECRE_AREA || 'Sin área asignada',
                SECRE_EXTENSION: datosExtra.extension || datosExtra.secre_extension || datosExtra.SECRE_EXTENSION || 'Sin extensión'
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ success: false, mensaje: 'Error del servidor.' });
    }
};

// Registrar usuario (usado solo internamente; el registro público de aspirantes usa aspiranteController)
exports.register = async (req, res) => {
    let connection;
    try {
        const data = req.body;
        
        // Validación básica
        if (!data.correo || !data.password || !data.nombre || !data.primerApellido || !data.curp || !data.telefono || !data.fechaNacimiento || !data.estadoCivil || !data.licenciatura || !data.institucionLicenciatura || !data.fechaEgreso || !data.fechaTitulacion || !data.promedio) {
            return res.status(400).json({ success: false, mensaje: 'Faltan campos obligatorios.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        // 1. Crear Usuario
        const [userResult] = await connection.query(
            'INSERT INTO usuario (correo, contraseña, rol) VALUES (?, ?, ?)',
            [data.correo, passwordHash, 'ASPIRANTE']
        );
        const userId = userResult.insertId;

        // 2. Crear Aspirante
        await connection.query(
            `INSERT INTO aspirante (
                nombre, primerApellido, segundoApellido, curp, rfc, telefono, 
                fechaNacimiento, direccion, estadoCivil, licenciatura, 
                institucionLicenciatura, fechaEgreso, fechaTitulacion, 
                promedio, otrosEstudios, ocupacion, direccionPostal, 
                ciudadOcupacion, estadoOcupacion, telefonoOcupacion, idUsuario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.nombre,
                data.primerApellido,
                data.segundoApellido || null,
                data.curp,
                data.rfc || null,
                data.telefono,
                data.fechaNacimiento,
                data.direccion || null,
                data.estadoCivil,
                data.licenciatura,
                data.institucionLicenciatura,
                data.fechaEgreso,
                data.fechaTitulacion,
                data.promedio,
                data.otrosEstudios || null,
                data.ocupacion || null,
                data.direccionPostal || null,
                data.ciudadOcupacion || null,
                data.estadoOcupacion || null,
                data.telefonoOcupacion || null,
                userId
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            mensaje: 'Registro de aspirante completado exitosamente.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en register:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, mensaje: 'El correo, CURP o RFC ya se encuentra registrado.' });
        }

        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al registrar aspirante.' });
    } finally {
        if (connection) connection.release();
    }
};