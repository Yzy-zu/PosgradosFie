const ProgramacionCursoService = require('../services/programacionCursoService');
const db = require('../database/db');
const emit = require('../utils/socketEmit');

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
            const [solC] = await db.query('SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?', [idSolicitud]);
            if (solC.length > 0) emit.aAspiranteEspecifico(req, solC[0].idUsuario);
            else emit.aAdmin(req);
        }

        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al programar curso propedéutico:', error);
        if (error.message && error.message.includes('Error de configuración')) {
            return res.status(400).json({ success: false, mensaje: error.message });
        }
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

        if (resultado.bloqueo) {
            return res.status(422).json(resultado);
        }

        if (req.app.get('io')) {
            const [solCC] = await db.query('SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?', [idSolicitud]);
            if (solCC.length > 0) emit.aAspiranteEspecifico(req, solCC[0].idUsuario);
            else emit.aAdmin(req);
        }

        return res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al capturar resultado de curso propedéutico:', error);
        if (error.message && error.message.includes('Regresión de workflow impedida')) {
            return res.status(400).json({ success: false, mensaje: error.message });
        }
        return res.status(500).json({ success: false, mensaje: 'Error interno al capturar resultado del curso propedéutico.' });
    }
};

module.exports = {
    programarCurso,
    getProgramacion,
    capturarResultado
};
