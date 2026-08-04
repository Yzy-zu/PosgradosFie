const ProgramacionCursoService = require('../services/programacionCursoService');

const programarCurso = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { fechaInicio, fechaFin, aula, observaciones } = req.body;

        const resultado = await ProgramacionCursoService.programarCurso(idSolicitud, {
            fechaInicio,
            fechaFin,
            aula,
            observaciones
        });

        if (req.app.get('io')) {
            req.app.get('io').emit('actualizacionGlobal');
        }

        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al programar curso propedéutico:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno al programar el curso propedéutico.' });
    }
};

const getProgramacion = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const programacion = await ProgramacionCursoService.getProgramacionPorSolicitud(idSolicitud);

        if (!programacion) {
            return res.json({ existe: false, mensaje: 'No hay datos de curso propedéutico asignados aún.' });
        }

        return res.json({ existe: true, ...programacion });
    } catch (error) {
        console.error('Error al obtener programación de curso propedéutico:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar datos de curso propedéutico.' });
    }
};

const capturarResultado = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const { calificacion, aprobado, observaciones } = req.body;

        if (aprobado === undefined) {
            return res.status(400).json({ success: false, mensaje: 'El dictamen (aprobado/no aprobado) es obligatorio.' });
        }

        const resultado = await ProgramacionCursoService.capturarResultado(idSolicitud, {
            calificacion,
            aprobado,
            observaciones
        });

        if (req.app.get('io')) {
            req.app.get('io').emit('actualizacionGlobal');
        }

        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al capturar resultado de curso propedéutico:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno al capturar resultado del curso propedéutico.' });
    }
};

module.exports = {
    programarCurso,
    getProgramacion,
    capturarResultado
};
