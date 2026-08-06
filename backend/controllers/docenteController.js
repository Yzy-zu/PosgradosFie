const db = require('../database/db');

// Obtener todos los docentes
const obtenerDocentes = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM docente');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerDocentes:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener docentes' });
    }
};

// Obtener un docente por ID
const obtenerDocente = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM docente WHERE idUsua = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Docente no encontrado' });
        }

        return res.json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerDocente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener docente' });
    }
};

// Crear docente
// Columnas reales de la tabla: idUsua, nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo
const crearDocente = async (req, res) => {
    try {
        const { idUsua, nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo } = req.body;

        if (!idUsua || !nombre || !primerApellido) {
            return res.status(400).json({ success: false, mensaje: 'idUsua, nombre y primerApellido son obligatorios.' });
        }

        await db.query(
            'INSERT INTO docente (idUsua, nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [idUsua, nombre, primerApellido, segundoApellido || '', cargo || '', especialidad || '', cubiculo || null]
        );
        if (req.app.get('io')) req.app.get('io').emit('actualizacionGlobal');
        return res.json({ success: true, mensaje: 'Docente creado correctamente' });
    } catch (error) {
        console.error('Error en crearDocente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear docente' });
    }
};

// Actualizar docente
// :id en la ruta corresponde a idUsua (ID del usuario vinculado al docente)
const actualizarDocente = async (req, res) => {
    try {
        const { id } = req.params; // idUsua
        const { nombre, primerApellido, segundoApellido, cargo, especialidad, cubiculo } = req.body;

        await db.query(
            'UPDATE docente SET nombre = ?, primerApellido = ?, segundoApellido = ?, cargo = ?, especialidad = ?, cubiculo = ? WHERE idUsua = ?',
            [nombre, primerApellido, segundoApellido || '', cargo || '', especialidad || '', cubiculo || null, id]
        );
        if (req.app.get('io')) req.app.get('io').emit('actualizacionGlobal');
        return res.json({ success: true, mensaje: 'Docente actualizado correctamente' });
    } catch (error) {
        console.error('Error en actualizarDocente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar docente' });
    }
};

// Eliminar docente
// :id en la ruta corresponde a idUsua
const eliminarDocente = async (req, res) => {
    try {
        const { id } = req.params; // idUsua
        await db.query('DELETE FROM docente WHERE idUsua = ?', [id]);
        if (req.app.get('io')) req.app.get('io').emit('actualizacionGlobal');
        return res.json({ success: true, mensaje: 'Docente eliminado correctamente' });
    } catch (error) {
        console.error('Error en eliminarDocente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar docente' });
    }
};

module.exports = {
    obtenerDocentes,
    obtenerDocente,
    crearDocente,
    actualizarDocente,
    eliminarDocente
};