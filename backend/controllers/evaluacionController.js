const db = require('../database/db');

// Obtener todas las evaluaciones
const obtenerEvaluaciones = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM evaluacion');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerEvaluaciones:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener evaluaciones' });
    }
};

// Obtener una evaluación por ID
const obtenerEvaluacion = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM evaluacion WHERE id = ?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Evaluación no encontrada' });
        }

        return res.json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerEvaluacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener evaluación' });
    }
};

// Crear evaluación
const crearEvaluacion = async (req, res) => {
    try {
        const { idSoli, idUsua, notaExamen, notaEntrevista, observaciones } = req.body;

        await db.query(
            'INSERT INTO evaluacion (idSoli, idUsua, notaExamen, notaEntrevista, observaciones) VALUES (?, ?, ?, ?, ?)',
            [idSoli, idUsua, notaExamen, notaEntrevista, observaciones]
        );

        return res.json({ success: true, mensaje: 'Evaluación registrada correctamente' });
    } catch (error) {
        console.error('Error en crearEvaluacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al crear evaluación' });
    }
};

// Actualizar evaluación
const actualizarEvaluacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { idSoli, idUsua, notaExamen, notaEntrevista, observaciones } = req.body;

        await db.query(
            'UPDATE evaluacion SET idSoli=?, idUsua=?, notaExamen=?, notaEntrevista=?, observaciones=? WHERE id=?',
            [idSoli, idUsua, notaExamen, notaEntrevista, observaciones, id]
        );

        return res.json({ success: true, mensaje: 'Evaluación actualizada correctamente' });
    } catch (error) {
        console.error('Error en actualizarEvaluacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar evaluación' });
    }
};

// Eliminar evaluación
const eliminarEvaluacion = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM evaluacion WHERE id=?', [id]);
        return res.json({ success: true, mensaje: 'Evaluación eliminada correctamente' });
    } catch (error) {
        console.error('Error en eliminarEvaluacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar evaluación' });
    }
};

module.exports = {
    obtenerEvaluaciones,
    obtenerEvaluacion,
    crearEvaluacion,
    actualizarEvaluacion,
    eliminarEvaluacion
};