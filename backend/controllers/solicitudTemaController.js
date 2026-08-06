const SolicitudTemaService = require('../services/solicitudTemaService');
const db = require('../database/db');
const emit = require('../utils/socketEmit');

const getTemasDeSolicitud = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const temas = await SolicitudTemaService.getTemasDeSolicitud(idSolicitud);
        return res.json(temas);
    } catch (error) {
        console.error('Error al obtener temas de solicitud:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno al consultar temas.' });
    }
};

const actualizarCalificacionTema = async (req, res) => {
    try {
        const { idSolicitudTema } = req.params;
        const { idDocente, calificacion, observaciones } = req.body;

        if (calificacion === undefined) {
            return res.status(400).json({ success: false, mensaje: 'La calificación es obligatoria.' });
        }

        let docenteIdFinal = idDocente;

        // Regla de Seguridad: Si es DOCENTE, extraemos su ID desde el JWT para evitar suplantaciones
        if (req.usuario && req.usuario.rol === 'DOCENTE') {
            const [docentes] = await db.query('SELECT id FROM docente WHERE idUsua = ?', [req.usuario.id]);
            if (docentes.length === 0) {
                return res.status(403).json({ success: false, mensaje: 'El usuario autenticado no tiene un perfil de docente válido.' });
            }
            docenteIdFinal = docentes[0].id;
        }

        if (!docenteIdFinal) {
            return res.status(400).json({ success: false, mensaje: 'La asignación de un docente (idDocente) es obligatoria.' });
        }

        await SolicitudTemaService.actualizarCalificacionTema(idSolicitudTema, {
            idDocente: docenteIdFinal,
            calificacion,
            observaciones
        });

        // Notificar al aspirante específico + ADMIN
        if (req.app.get('io')) {
            const [solTema] = await db.query(
                `SELECT a.idUsuario FROM solicitud_temas st
                 JOIN solicitud s ON st.idSolicitud = s.id
                 JOIN aspirante a ON s.idAspi = a.id
                 WHERE st.id = ?`,
                [idSolicitudTema]
            );
            if (solTema.length > 0) emit.aAspiranteEspecifico(req, solTema[0].idUsuario);
            else emit.aAdmin(req);
        }

        return res.status(200).json({ success: true, mensaje: 'Calificación de tema actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar calificación de tema:', error);
        if (error.message && (error.message.includes('No se pueden modificar') || error.message.includes('no existe'))) {
            return res.status(400).json({ success: false, mensaje: error.message });
        }
        return res.status(500).json({ success: false, mensaje: 'Error interno al actualizar la calificación.' });
    }
};

module.exports = {
    getTemasDeSolicitud,
    actualizarCalificacionTema
};
