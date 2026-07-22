const db = require('../database/db');

// Subir documento
const subirDocumento = async (req, res) => {
    try {
        const { idSoli, idRequisito, tipoDoc } = req.body;

        if (!idSoli || (!idRequisito && !tipoDoc)) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios para guardar el documento.' });
        }

        if (!req.file) {
            return res.status(400).json({ mensaje: 'Debe seleccionar un archivo.' });
        }

        // Verificar que exista la solicitud y su estado actual
        const [solicitud] = await db.query('SELECT id, estado FROM solicitud WHERE id = ?', [idSoli]);
        if (solicitud.length === 0) {
            return res.status(404).json({ mensaje: 'La solicitud no existe.' });
        }

        // Validación de Seguridad: Sólo se pueden subir archivos si la solicitud está PENDIENTE
        if (solicitud[0].estado !== 'PENDIENTE') {
            return res.status(403).json({ mensaje: 'Acceso Denegado: La solicitud está en revisión o ya fue procesada, no puedes alterar sus documentos.' });
        }

        if (idRequisito) {
            // Flujo nuevo: tabla solicitud_documentos
            const [resultado] = await db.query(
                `INSERT INTO solicitud_documentos (idSolicitud, idRequisito, rutaArchivo, estadoValidacion)
                 VALUES (?, ?, ?, 'PENDIENTE')`,
                [idSoli, idRequisito, req.file.filename]
            );
            return res.status(201).json({ mensaje: 'Documento registrado correctamente.', idDocumento: resultado.insertId });
        } else {
            // Flujo viejo (compatibilidad): tabla documento
            const [resultado] = await db.query(
                'INSERT INTO documento (idSoli, tipoDoc, rutaArchivo) VALUES (?, ?, ?)',
                [idSoli, tipoDoc, req.file.filename]
            );
            return res.status(201).json({ mensaje: 'Documento registrado correctamente.', idDocumento: resultado.insertId });
        }
    } catch (error) {
        console.error('Error en subirDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

// Obtener todos los documentos
const obtenerDocumentos = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM documento');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerDocumentos:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener documentos.' });
    }
};

// Obtener un documento por ID
const obtenerDocumento = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await db.query('SELECT * FROM documento WHERE id = ?', [id]);

        if (resultado.length === 0) {
            return res.status(404).json({ mensaje: 'Documento no encontrado.' });
        }

        return res.json(resultado[0]);
    } catch (error) {
        console.error('Error en obtenerDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener documento.' });
    }
};

// Actualizar estado de documento
const actualizarDocumento = async (req, res) => {
    try {
        const { id } = req.params;
        const { estadoDoc } = req.body;

        await db.query('UPDATE documento SET estadoDoc = ? WHERE id = ?', [estadoDoc, id]);
        return res.json({ mensaje: 'Documento actualizado correctamente.' });
    } catch (error) {
        console.error('Error en actualizarDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar documento.' });
    }
};

// Eliminar documento
const eliminarDocumento = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM documento WHERE id = ?', [id]);
        return res.json({ mensaje: 'Documento eliminado correctamente.' });
    } catch (error) {
        console.error('Error en eliminarDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar documento.' });
    }
};

// Evaluar documento (flujo nuevo: solicitud_documentos)
const evaluarDocumento = async (req, res) => {
    try {
        const { id } = req.params; // ID de solicitud_documentos
        const { estadoValidacion, comentarios } = req.body; // PENDIENTE, APROBADO, RECHAZADO

        if (!['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(estadoValidacion)) {
            return res.status(400).json({ mensaje: 'Estado de validación inválido.' });
        }

        // Obtener el ID de la solicitud
        const [doc] = await db.query('SELECT idSolicitud FROM solicitud_documentos WHERE id = ?', [id]);
        if (doc.length === 0) {
            return res.status(404).json({ mensaje: 'Documento no encontrado.' });
        }
        const idSolicitud = doc[0].idSolicitud;

        // Actualizar el documento
        await db.query(
            'UPDATE solicitud_documentos SET estadoValidacion = ?, comentarios = ? WHERE id = ?',
            [estadoValidacion, comentarios || null, id]
        );

        // Lógica automática para actualizar el estado general de la solicitud
        // Obtener todos los documentos de la solicitud
        const [todosDocs] = await db.query('SELECT estadoValidacion FROM solicitud_documentos WHERE idSolicitud = ?', [idSolicitud]);
        
        let nuevoEstadoSolicitud = 'EN_REVISION';
        
        const tieneRechazados = todosDocs.some(d => d.estadoValidacion === 'RECHAZADO');
        const todosAprobados = todosDocs.every(d => d.estadoValidacion === 'APROBADO');
        
        if (tieneRechazados) {
            nuevoEstadoSolicitud = 'RECHAZADO';
        } else if (todosAprobados && todosDocs.length > 0) {
            nuevoEstadoSolicitud = 'APROBADO';
        } else {
            nuevoEstadoSolicitud = 'EN_REVISION';
        }

        await db.query('UPDATE solicitud SET estado = ? WHERE id = ?', [nuevoEstadoSolicitud, idSolicitud]);

        return res.json({ success: true, mensaje: 'Documento evaluado correctamente.', nuevoEstadoSolicitud });
    } catch (error) {
        console.error('Error en evaluarDocumento:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al evaluar documento.' });
    }
};

module.exports = {
    subirDocumento,
    obtenerDocumentos,
    obtenerDocumento,
    actualizarDocumento,
    eliminarDocumento,
    evaluarDocumento
};