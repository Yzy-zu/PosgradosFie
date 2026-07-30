const ProgramacionExamenService = require('../services/programacionExamenService');

const crearProgramacion = async (req, res) => {
    try {
        const { idSolicitud, fecha, hora, lugar, observaciones } = req.body;

        if (!idSolicitud || !fecha || !hora || !lugar) {
            return res.status(400).json({ success: false, mensaje: 'Faltan campos obligatorios para programar el examen.' });
        }

        const resultado = await ProgramacionExamenService.crearProgramacion(idSolicitud, fecha, hora, lugar, observaciones);
        return res.status(201).json({ success: true, ...resultado });

    } catch (error) {
        console.error('Error en crearProgramacion:', error);
        return res.status(400).json({ success: false, mensaje: error.message });
    }
};

const obtenerProgramacion = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const programacion = await ProgramacionExamenService.obtenerProgramacion(idSolicitud);
        
        if (!programacion) {
            return res.status(200).json({ existe: false });
        }
        
        return res.status(200).json({ existe: true, programacion });

    } catch (error) {
        console.error('Error en obtenerProgramacion:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al obtener la programación.' });
    }
};

const actualizarProgramacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, hora, lugar, observaciones } = req.body;

        if (!fecha || !hora || !lugar) {
            return res.status(400).json({ success: false, mensaje: 'Faltan campos obligatorios para actualizar el examen.' });
        }

        const resultado = await ProgramacionExamenService.actualizarProgramacion(id, fecha, hora, lugar, observaciones);
        return res.status(200).json({ success: true, ...resultado });

    } catch (error) {
        console.error('Error en actualizarProgramacion:', error);
        return res.status(400).json({ success: false, mensaje: error.message });
    }
};

const cancelarProgramacion = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await ProgramacionExamenService.cancelarProgramacion(id);
        return res.status(200).json({ success: true, ...resultado });

    } catch (error) {
        console.error('Error en cancelarProgramacion:', error);
        return res.status(400).json({ success: false, mensaje: error.message });
    }
};

module.exports = {
    crearProgramacion,
    obtenerProgramacion,
    actualizarProgramacion,
    cancelarProgramacion
};
