const ProgramacionExamenService = require('../services/programacionExamenService');

const programarExamen = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { fecha, hora, lugar, observaciones } = req.body;

        if (!fecha || !hora || !lugar) {
            return res.status(400).json({ success: false, mensaje: 'Fecha, hora y lugar son obligatorios.' });
        }

        const resultado = await ProgramacionExamenService.programarExamen(idSolicitud, {
            fecha,
            hora,
            lugar,
            observaciones
        });

        req.app.get('io').emit('actualizacionGlobal');
        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al programar examen:', error);
        if (error.message && error.message.includes('Error de configuración')) {
            return res.status(400).json({ success: false, mensaje: error.message });
        }
        return res.status(500).json({ success: false, mensaje: 'Error interno al programar el examen.' });
    }
};

const getProgramacion = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const programacion = await ProgramacionExamenService.getProgramacionPorSolicitud(idSolicitud);

        if (!programacion) {
            return res.json({ existe: false, mensaje: 'No hay fecha de examen asignada aún.' });
        }

        return res.json({ existe: true, ...programacion });
    } catch (error) {
        console.error('Error al obtener programación de examen:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar datos de programación de examen.' });
    }
};

const confirmarExamen = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const resultado = await ProgramacionExamenService.confirmarExamen(idSolicitud);
        req.app.get('io').emit('actualizacionGlobal');
        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al confirmar aplicación de examen:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno al confirmar el examen.' });
    }
};

const capturarResultado = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { calificacion, aprobado, observaciones } = req.body;

        if (aprobado === undefined) {
            return res.status(400).json({ success: false, mensaje: 'El dictamen (aprobado/no aprobado) es obligatorio.' });
        }

        const resultado = await ProgramacionExamenService.capturarResultado(idSolicitud, {
            calificacion,
            aprobado,
            observaciones
        });

        if (resultado.bloqueo) {
            return res.status(422).json(resultado);
        }

        req.app.get('io').emit('actualizacionGlobal');
        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al capturar resultado de examen:', error);
        if (error.message && error.message.includes('Regresión de workflow impedida')) {
            return res.status(400).json({ success: false, mensaje: error.message });
        }
        return res.status(500).json({ success: false, mensaje: 'Error interno al capturar resultado.' });
    }
};

module.exports = {
    programarExamen,
    getProgramacion,
    getProgramacionExamenPorSolicitud: getProgramacion, // Alias para compatibilidad hacia atrás
    confirmarExamen,
    capturarResultado
};
