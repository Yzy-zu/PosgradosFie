const db = require('../database/db');

class WorkflowService {
    /**
     * Obtiene la primera etapa de una modalidad
     */
    static async getPrimeraEtapa(idModalidad) {
        const [resultados] = await db.query(
            `SELECT etapa_id FROM modalidad_etapa 
             WHERE modalidad_id = ? 
             ORDER BY orden ASC 
             LIMIT 1`,
            [idModalidad]
        );

        if (resultados.length === 0) {
            throw new Error('La modalidad no tiene etapas configuradas.');
        }

        return resultados[0].etapa_id;
    }

    /**
     * Obtiene la etapa actual de una solicitud y la siguiente etapa según el workflow
     */
    static async getSiguienteEtapa(idModalidad, idEtapaActual) {
        // 1. Obtener el orden de la etapa actual
        const [actual] = await db.query(
            `SELECT orden FROM modalidad_etapa 
             WHERE modalidad_id = ? AND etapa_id = ?`,
            [idModalidad, idEtapaActual]
        );

        if (actual.length === 0) {
            throw new Error('La etapa actual no pertenece a la modalidad indicada.');
        }

        const ordenActual = actual[0].orden;

        // 2. Obtener la siguiente etapa
        const [siguiente] = await db.query(
            `SELECT etapa_id FROM modalidad_etapa 
             WHERE modalidad_id = ? AND orden > ? 
             ORDER BY orden ASC 
             LIMIT 1`,
            [idModalidad, ordenActual]
        );

        if (siguiente.length === 0) {
            return null; // Ya es la última etapa
        }

        return siguiente[0].etapa_id;
    }

    /**
     * Avanza una solicitud a la siguiente etapa de su modalidad
     */
    static async avanzarEtapa(idSolicitud) {
        // 1. Obtener la solicitud actual
        const [solicitudes] = await db.query(
            'SELECT idModalidad, idEtapaActual FROM solicitud WHERE id = ?',
            [idSolicitud]
        );

        if (solicitudes.length === 0) {
            throw new Error('Solicitud no encontrada.');
        }

        const { idModalidad, idEtapaActual } = solicitudes[0];

        // 2. Obtener la siguiente etapa
        const idSiguienteEtapa = await this.getSiguienteEtapa(idModalidad, idEtapaActual);

        if (!idSiguienteEtapa) {
            return {
                completado: true,
                mensaje: 'La solicitud ya completó todas las etapas.'
            };
        }

        // 3. Actualizar la solicitud
        await db.query(
            'UPDATE solicitud SET idEtapaActual = ? WHERE id = ?',
            [idSiguienteEtapa, idSolicitud]
        );

        return {
            completado: false,
            nuevaEtapa: idSiguienteEtapa,
            mensaje: 'Etapa avanzada correctamente.'
        };
    }

    /**
     * Asigna la modalidad a una solicitud y la inicializa en la primera etapa.
     * ÚNICO punto autorizado para inicializar idEtapaActual al cambiar modalidad.
     */
    static async asignarModalidad(idSolicitud, idModalidad) {
        const idEtapaActual = await this.getPrimeraEtapa(idModalidad);
        
        await db.query(
            'UPDATE solicitud SET idModalidad = ?, idEtapaActual = ? WHERE id = ?', 
            [idModalidad, idEtapaActual, idSolicitud]
        );
        
        return idEtapaActual;
    }

    /**
     * Evalúa si los documentos de una solicitud cumplen las condiciones para avanzar de etapa.
     * Gestiona el estado de la solicitud (EN_REVISION, RECHAZADO, APROBADO) y avanza la etapa si aplica.
     */
    static async evaluarTransicionDocumentacion(idSolicitud) {
        // Obtener sólo los últimos intentos de todos los documentos de la solicitud
        const [ultimosDocs] = await db.query(
            `SELECT sd1.estadoValidacion 
             FROM solicitud_documentos sd1
             INNER JOIN (
                 SELECT idRequisito, MAX(intentos) as maxIntentos
                 FROM solicitud_documentos
                 WHERE idSolicitud = ?
                 GROUP BY idRequisito
             ) sd2 ON sd1.idRequisito = sd2.idRequisito AND sd1.intentos = sd2.maxIntentos
             WHERE sd1.idSolicitud = ?`,
            [idSolicitud, idSolicitud]
        );
        
        if (ultimosDocs.length === 0) return 'EN_REVISION';

        const tieneRechazados = ultimosDocs.some(d => d.estadoValidacion === 'RECHAZADO');
        const todosAprobados = ultimosDocs.every(d => d.estadoValidacion === 'APROBADO');
        
        let nuevoEstado = 'EN_REVISION';
        
        if (tieneRechazados) {
            nuevoEstado = 'RECHAZADO';
        } else if (todosAprobados) {
            nuevoEstado = 'APROBADO'; // TODO: Debería avanzar a la etapa siguiente y tal vez PENDIENTE?
            // Si la etapa de documentación fue superada, avanzamos la etapa en el workflow.
            const avance = await this.avanzarEtapa(idSolicitud);
            if (!avance.completado) {
                // Al avanzar a una nueva etapa (ej. EXAMEN), la solicitud vuelve a requerir acción, 
                // se podría poner en PENDIENTE para la siguiente etapa, pero por ahora conservamos la semántica.
                // En un diseño más maduro, cada etapa tendría su propio estado.
                nuevoEstado = 'PENDIENTE'; // Vuelve a pendiente en la nueva etapa para que el aspirante proceda.
            } else {
                nuevoEstado = 'APROBADO'; // Fin del workflow
            }
        }
        
        await db.query('UPDATE solicitud SET estado = ? WHERE id = ?', [nuevoEstado, idSolicitud]);
        return nuevoEstado;
    }

    /**
     * Obtiene las acciones de negocio vinculadas a una etapa específica.
     */
    static async getAccionesDeEtapa(idEtapa) {
        const [acciones] = await db.query(
            'SELECT codigo, nombre, descripcion FROM etapa_accion WHERE idEtapa = ? AND activo = 1 ORDER BY id ASC',
            [idEtapa]
        );
        return acciones;
    }

    /**
     * Obtiene las acciones de negocio que corresponden a la etapa actual de una solicitud.
     */
    static async getAccionActual(idSolicitud) {
        const [solicitudes] = await db.query(
            'SELECT idEtapaActual FROM solicitud WHERE id = ?',
            [idSolicitud]
        );

        if (solicitudes.length === 0 || !solicitudes[0].idEtapaActual) {
            return [];
        }

        return await this.getAccionesDeEtapa(solicitudes[0].idEtapaActual);
    }
}

module.exports = WorkflowService;
