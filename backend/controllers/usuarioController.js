const db = require('../database/db');

// Obtener todos los usuarios
const obtenerUsuarios = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM usuario');
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
        const [resultados] = await db.query('SELECT * FROM usuario WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        return res.json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerUsuario:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener usuario' });
    }
};

// Crear usuario
const crearUsuario = async (req, res) => {
    try {
        const { correo, password, rol } = req.body;

        await db.query(
            'INSERT INTO usuario (correo, contraseña, rol) VALUES (?, ?, ?)',
            [correo || '', password || '', rol || 'ASPIRANTE']
        );

        return res.json({ success: true, mensaje: 'Usuario creado correctamente' });
    } catch (error) {
        console.error('Error en crearUsuario:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear usuario' });
    }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { correo, password, rol } = req.body;

        if (password && password.trim() !== '') {
            await db.query(
                'UPDATE usuario SET correo = ?, contraseña = ?, rol = ? WHERE id = ?',
                [correo || '', password, rol || 'ASPIRANTE', id]
            );
        } else {
            await db.query(
                'UPDATE usuario SET correo = ?, rol = ? WHERE id = ?',
                [correo || '', rol || 'ASPIRANTE', id]
            );
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

module.exports = {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
};