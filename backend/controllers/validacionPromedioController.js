const ValidacionPromedioService = require('../services/validacionPromedioService');
const db = require('../database/db');
const emit = require('../utils/socketEmit');

const getValidacionPromedio = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        if (!idSolicitud) {
            return res.status(400).json({ success: false, mensaje: 'El ID de la solicitud es requerido.' });
        }

        const datos = await ValidacionPromedioService.obtenerDatosPromedio(idSolicitud);
        return res.status(200).json({ success: true, ...datos });
    } catch (error) {
        console.error('Error en getValidacionPromedio:', error);
        return res.status(500).json({ success: false, mensaje: error.message || 'Error interno del servidor.' });
    }
};

const guardarValidacionPromedio = async (req, res) => {
    try {
        const { idSolicitud, promedio, promedioValido, egelValido, observaciones } = req.body;

        if (!idSolicitud || promedioValido === undefined) {
            return res.status(400).json({ success: false, mensaje: 'Los campos idSolicitud y promedioValido son obligatorios.' });
        }

        const resultado = await ValidacionPromedioService.guardarDictamenPromedio({
            idSolicitud,
            promedio,
            promedioValido,
            egelValido,
            observaciones
        });

        // Notificar al aspirante específico + ADMIN
        if (req.app.get('io')) {
            const [solV] = await db.query('SELECT a.idUsuario FROM solicitud s JOIN aspirante a ON s.idAspi = a.id WHERE s.id = ?', [idSolicitud]);
            if (solV.length > 0) emit.aAspiranteEspecifico(req, solV[0].idUsuario);
            else emit.aAdmin(req);
        }

        return res.status(200).json({
            success: true,
            mensaje: resultado.promedioValido 
                ? 'Dictamen de promedio guardado exitosamente. Etapa avanzada.' 
                : 'Dictamen de promedio guardado con estado no válido.',
            ...resultado
        });
    } catch (error) {
        console.error('Error en guardarValidacionPromedio:', error);
        return res.status(500).json({ success: false, mensaje: error.message || 'Error al guardar el dictamen de promedio.' });
    }
};

module.exports = {
    getValidacionPromedio,
    guardarValidacionPromedio
};
