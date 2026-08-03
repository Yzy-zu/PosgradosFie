const db = require('../database/db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Obtener todos los usuarios
const obtenerUsuarios = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT id, correo, rol, activo FROM usuario');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerUsuarios:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener usuarios' });
    }
};

// Obtener un usuario por ID
const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT id, correo, rol, activo FROM usuario WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        let usuario = { ...resultados[0] };
        
        // Cargar detalles extra según rol
        if (usuario.rol === 'ASPIRANTE') {
            const [detalles] = await db.query('SELECT curp, nombre, primerApellido, segundoApellido, telefono, direccion, fechaNacimiento, estadoCivil, licenciatura, institucionLicenciatura, fechaEgreso, fechaTitulacion, promedio, otrosEstudios, ocupacion, direccionPostal, ciudadOcupacion, estadoOcupacion, telefonoOcupacion FROM aspirante WHERE idUsuario = ?', [id]);
            if (detalles.length > 0) usuario.detalles = detalles[0];
        } else if (usuario.rol === 'DOCENTE') {
            const [detalles] = await db.query('SELECT nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo FROM docente WHERE idUsua = ?', [id]);
            if (detalles.length > 0) usuario.detalles = detalles[0];
        } else if (usuario.rol === 'SECRETARIO') {
            const [detalles] = await db.query('SELECT area, extension FROM secretario WHERE idUsua = ?', [id]);
            if (detalles.length > 0) usuario.detalles = detalles[0];
        }

        return res.json(usuario);
    } catch (error) {
        console.error('Error en obtenerUsuario:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener usuario' });
    }
};

// Crear usuario
const crearUsuario = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        const { correo, password, rol, activo, detalles } = req.body;

        if (!correo || !password) {
            await conexion.rollback();
            conexion.release();
            return res.status(400).json({ success: false, mensaje: 'Correo y contraseña son obligatorios.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [result] = await conexion.query(
            'INSERT INTO usuario (correo, contraseña, rol, activo) VALUES (?, ?, ?, ?)',
            [correo, passwordHash, rol, activo !== undefined ? activo : 1]
        );
        const idUsuario = result.insertId;

        if (detalles) {
            if (rol === 'ASPIRANTE') {
                await conexion.query(
                    'INSERT INTO aspirante (idUsuario, nombre, primerApellido, segundoApellido, curp, telefono, direccion, fechaNacimiento, estadoCivil, licenciatura, institucionLicenciatura, fechaEgreso, fechaTitulacion, promedio, otrosEstudios, ocupacion, direccionPostal, ciudadOcupacion, estadoOcupacion, telefonoOcupacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [idUsuario, detalles.nombre||'', detalles.primerApellido||'', detalles.segundoApellido||'', detalles.curp||'', detalles.telefono||'', detalles.direccion||'', detalles.fechaNacimiento||new Date(), detalles.estadoCivil||'SOLTERO', detalles.licenciatura||'', detalles.institucionLicenciatura||'', detalles.fechaEgreso||null, detalles.fechaTitulacion||null, detalles.promedio||null, detalles.otrosEstudios||'', detalles.ocupacion||'', detalles.direccionPostal||null, detalles.ciudadOcupacion||'', detalles.estadoOcupacion||'', detalles.telefonoOcupacion||null]
                );
            } else if (rol === 'DOCENTE') {
                await conexion.query(
                    'INSERT INTO docente (idUsua, nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [idUsuario, detalles.nombre||'', detalles.primerApellido||'', detalles.segundoApellido||'', detalles.cargo||'', detalles.especialidad||'', detalles.cubiculo||'']
                );
            } else if (rol === 'SECRETARIO') {
                await conexion.query(
                    'INSERT INTO secretario (idUsua, area, extension) VALUES (?, ?, ?)',
                    [idUsuario, detalles.area||'', detalles.extension||'']
                );
            }
        }

        await conexion.commit();
        return res.json({ success: true, mensaje: 'Usuario creado correctamente' });
    } catch (error) {
        await conexion.rollback();
        console.error('Error en crearUsuario:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear usuario: ' + error.message });
    } finally {
        conexion.release();
    }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { correo, password, rol, activo, detalles } = req.body;

        if (password && password.trim() !== '') {
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            await db.query(
                'UPDATE usuario SET correo = ?, contraseña = ?, rol = ?, activo = ? WHERE id = ?',
                [correo || '', passwordHash, rol || 'ASPIRANTE', activo !== undefined ? activo : 1, id]
            );
        } else {
            await db.query(
                'UPDATE usuario SET correo = ?, rol = ?, activo = ? WHERE id = ?',
                [correo || '', rol || 'ASPIRANTE', activo !== undefined ? activo : 1, id]
            );
        }

        if (detalles) {
            if (rol === 'ASPIRANTE') {
                const [exists] = await db.query('SELECT id FROM aspirante WHERE idUsuario = ?', [id]);
                if (exists.length > 0) {
                    await db.query('UPDATE aspirante SET nombre=?, primerApellido=?, segundoApellido=?, curp=?, telefono=?, direccion=?, fechaNacimiento=?, estadoCivil=?, licenciatura=?, institucionLicenciatura=?, fechaEgreso=?, fechaTitulacion=?, promedio=?, otrosEstudios=?, ocupacion=?, direccionPostal=?, ciudadOcupacion=?, estadoOcupacion=?, telefonoOcupacion=? WHERE idUsuario=?', 
                    [detalles.nombre||'', detalles.primerApellido||'', detalles.segundoApellido||'', detalles.curp||'', detalles.telefono||'', detalles.direccion||'', detalles.fechaNacimiento||new Date(), detalles.estadoCivil||'SOLTERO', detalles.licenciatura||'', detalles.institucionLicenciatura||'', detalles.fechaEgreso||null, detalles.fechaTitulacion||null, detalles.promedio||null, detalles.otrosEstudios||'', detalles.ocupacion||'', detalles.direccionPostal||null, detalles.ciudadOcupacion||'', detalles.estadoOcupacion||'', detalles.telefonoOcupacion||null, id]);
                } else {
                    await db.query('INSERT INTO aspirante (idUsuario, nombre, primerApellido, segundoApellido, curp, telefono, direccion, fechaNacimiento, estadoCivil, licenciatura, institucionLicenciatura, fechaEgreso, fechaTitulacion, promedio, otrosEstudios, ocupacion, direccionPostal, ciudadOcupacion, estadoOcupacion, telefonoOcupacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, detalles.nombre||'', detalles.primerApellido||'', detalles.segundoApellido||'', detalles.curp||'', detalles.telefono||'', detalles.direccion||'', detalles.fechaNacimiento||new Date(), detalles.estadoCivil||'SOLTERO', detalles.licenciatura||'', detalles.institucionLicenciatura||'', detalles.fechaEgreso||null, detalles.fechaTitulacion||null, detalles.promedio||null, detalles.otrosEstudios||'', detalles.ocupacion||'', detalles.direccionPostal||null, detalles.ciudadOcupacion||'', detalles.estadoOcupacion||'', detalles.telefonoOcupacion||null]);
                }
            } else if (rol === 'DOCENTE') {
                const [exists] = await db.query('SELECT id FROM docente WHERE idUsua = ?', [id]);
                if (exists.length > 0) {
                    await db.query('UPDATE docente SET nombre=?, primerApellido=?, segundoApellido=?, cargo=?, especialidad=?, cubiculo=? WHERE idUsua=?',
                    [detalles.nombre||'', detalles.primerApellido||'', detalles.segundoApellido||'', detalles.cargo||'', detalles.especialidad||'', detalles.cubiculo||'', id]);
                } else {
                    await db.query('INSERT INTO docente (idUsua, nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [id, detalles.nombre||'', detalles.primerApellido||'', detalles.segundoApellido||'', detalles.cargo||'', detalles.especialidad||'', detalles.cubiculo||'']);
                }
            } else if (rol === 'SECRETARIO') {
                const [exists] = await db.query('SELECT id FROM secretario WHERE idUsua = ?', [id]);
                if (exists.length > 0) {
                    await db.query('UPDATE secretario SET area=?, extension=? WHERE idUsua=?',
                    [detalles.area||'', detalles.extension||'', id]);
                } else {
                    await db.query('INSERT INTO secretario (idUsua, area, extension) VALUES (?, ?, ?)',
                    [id, detalles.area||'', detalles.extension||'']);
                }
            }
        }

        return res.json({ success: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('Error en actualizarUsuario:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar usuario' });
    }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM usuario WHERE id = ?', [id]);
        return res.json({ success: true, mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error en eliminarUsuario:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar usuario' });
    }
};

// Cambiar contraseña del usuario
const cambiarPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { passwordActual, passwordNueva } = req.body;

        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ success: false, mensaje: 'Debe proporcionar la contraseña actual y la nueva' });
        }

        // Obtener usuario para verificar contraseña actual
        const [resultados] = await db.query('SELECT contraseña FROM usuario WHERE id = ?', [id]);
        
        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        const usuarioDB = resultados[0];
        
        // Verificar contraseña actual con bcrypt
        const passwordValida = await bcrypt.compare(passwordActual, usuarioDB.contraseña);
        if (!passwordValida) {
            return res.status(401).json({ success: false, mensaje: 'La contraseña actual es incorrecta' });
        }

        // Hashear y guardar la nueva contraseña
        const nuevoHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
        await db.query('UPDATE usuario SET contraseña = ? WHERE id = ?', [nuevoHash, id]);

        return res.json({ success: true, mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error en cambiarPassword:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al cambiar la contraseña' });
    }
};

module.exports = {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    cambiarPassword
};