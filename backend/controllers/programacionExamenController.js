const ProgramacionExamenService = require('../services/programacionExamenService');
const db = require('../database/db');
const emit = require('../utils/socketEmit');

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
        // Notificar al aspirante específico + ADMIN
        const [solEx] = await db.query('SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?', [idSolicitud]);
        if (solEx.length > 0) emit.aAspiranteEspecifico(req, solEx[0].idUsuario);
        else emit.aAdmin(req);
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
        const [solCon] = await db.query('SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?', [idSolicitud]);
        if (solCon.length > 0) emit.aAspiranteEspecifico(req, solCon[0].idUsuario);
        else emit.aAdmin(req);
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
        const [solRes] = await db.query('SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?', [idSolicitud]);
        if (solRes.length > 0) emit.aAspiranteEspecifico(req, solRes[0].idUsuario);
        else emit.aAdmin(req);
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
