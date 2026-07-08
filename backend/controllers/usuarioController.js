const db = require('../database/db');

exports.obtenerUsuarios = (req, res) => {
    const sql = 'SELECT * FROM usuario';
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al obtener usuarios' });
        }
        res.json(resultados);
    });
};

exports.obtenerUsuario = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM usuario WHERE id = ?';
    db.query(sql, [id], (err, resultados) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al obtener usuario' });
        }
        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }
        res.json(resultados[0]);
    });
};

exports.crearUsuario = (req, res) => {
    const { correo, password, rol } = req.body;
    const sql = 'INSERT INTO usuario (correo, contraseña, rol) VALUES (?, ?, ?)';
    
    db.query(sql, [correo || '', password || '', rol || 'ASPIRANTE'], (err, resultado) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al crear usuario' });
        }
        res.json({ success: true, mensaje: 'Usuario creado correctamente' });
    });
};

exports.actualizarUsuario = (req, res) => {
    const { id } = req.params;
    const { correo, password, rol } = req.body;

    let sql;
    let params;

    if (password && password.trim() !== "") {
        sql = 'UPDATE usuario SET correo = ?, contraseña = ?, rol = ? WHERE id = ?';
        params = [correo || '', password, rol || 'ASPIRANTE', id];
    } else {
        sql = 'UPDATE usuario SET correo = ?, rol = ? WHERE id = ?';
        params = [correo || '', rol || 'ASPIRANTE', id];
    }

    db.query(sql, params, (err, resultado) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al actualizar usuario' });
        }
        res.json({ success: true, mensaje: 'Usuario actualizado correctamente' });
    });
};

exports.eliminarUsuario = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM usuario WHERE id = ?';
    
    db.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, mensaje: 'Error al eliminar usuario' });
        }
        res.json({ success: true, mensaje: 'Usuario eliminado correctamente' });
    });
};