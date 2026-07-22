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
const crearDocente = async (req, res) => {
    try {
        const { nombre, correo, telefono, especialidad } = req.body;

        await db.query(
            'INSERT INTO docente (nombre, correo, telefono, especialidad) VALUES (?, ?, ?, ?)',
            [nombre, correo, telefono, especialidad]
        );

        return res.json({ success: true, mensaje: 'Docente creado correctamente' });
    } catch (error) {
        console.error('Error en crearDocente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear docente' });
    }
};

// Actualizar docente
const actualizarDocente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, telefono, especialidad } = req.body;

        await db.query(
            'UPDATE docente SET nombre = ?, correo = ?, telefono = ?, especialidad = ? WHERE idDocente = ?',
            [nombre, correo, telefono, especialidad, id]
        );

        return res.json({ success: true, mensaje: 'Docente actualizado correctamente' });
    } catch (error) {
        console.error('Error en actualizarDocente:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar docente' });
    }
};

// Eliminar docente
const eliminarDocente = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM docente WHERE idDocente = ?', [id]);
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