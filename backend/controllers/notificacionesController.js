const db = require('../database/db');

// Obtener todas las notificaciones
const obtenerNotificaciones = async (req, res) => {
    try {
        const { destino, idUsuario } = req.query;
        let query = 'SELECT * FROM notificaciones';
        let params = [];
        
        if (destino && idUsuario) {
            query += ' WHERE (destino = ? OR destino = "todos") OR (destino = "individual" AND idDestino = ?)';
            params.push(destino, idUsuario);
        } else if (destino) {
            query += ' WHERE destino = ? OR destino = "todos"';
            params.push(destino);
        }
        
        const [resultados] = await db.query(query, params);
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerNotificaciones:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener las notificaciones' });
    }
};

// Obtener una notificación por ID
const obtenerNotificacion = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM notificaciones WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Notificación no encontrada' });
        }

        return res.json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerNotificacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener la notificación' });
    }
};

// Crear notificación
const crearNotificacion = async (req, res) => {
    try {
        const { nombre, mensaje, destino, activa, rolRemitente, nombreRemitente, idDestino } = req.body;

        const [resultado] = await db.query(
            'INSERT INTO notificaciones (nombre, mensaje, destino, activa, rolRemitente, nombreRemitente, idDestino) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, mensaje, destino, activa, rolRemitente, nombreRemitente, idDestino || null]
        );

        return res.json({
            success: true,
            mensaje: 'Notificación creada correctamente',
            id: resultado.insertId
        });
    } catch (error) {
        console.error('Error en crearNotificacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear la notificación' });
    }
};

// Actualizar notificación
const actualizarNotificacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, mensaje, destino, activa, rolRemitente, nombreRemitente, idDestino } = req.body;

        await db.query(
            'UPDATE notificaciones SET nombre = ?, mensaje = ?, destino = ?, activa = ?, rolRemitente = ?, nombreRemitente = ?, idDestino = ? WHERE id = ?',
            [nombre, mensaje, destino, activa, rolRemitente, nombreRemitente, idDestino || null, id]
        );

        return res.json({ success: true, mensaje: 'Notificación actualizada correctamente' });
    } catch (error) {
        console.error('Error en actualizarNotificacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar la notificación' });
    }
};

// Eliminar notificación
const eliminarNotificacion = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM notificaciones WHERE id = ?', [id]);
        return res.json({ success: true, mensaje: 'Notificación eliminada correctamente' });
    } catch (error) {
        console.error('Error en eliminarNotificacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar la notificación' });
    }
};

module.exports = {
    obtenerNotificaciones,
    obtenerNotificacion,
    crearNotificacion,
    actualizarNotificacion,
    eliminarNotificacion
};