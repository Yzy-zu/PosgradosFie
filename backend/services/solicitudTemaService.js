const db = require('../database/db');

class SolicitudTemaService {
    /**
     * Genera los registros de evaluación por tema para una solicitud si aún no existen.
     * Es idempotente: solo inserta los temas faltantes.
     * @param {number} idSolicitud 
     * @param {object} conn Conexión opcional para transacciones
     */
    static async generarTemasSiNoExisten(idSolicitud, conn = db) {
        // 1. Obtener idOpcionPosgrado de la solicitud
        const [solicitudes] = await conn.query(
            `SELECT co.opcion_posgrado_id 
             FROM solicitud s
             JOIN convocatoria_opcion co ON s.idConvocatoriaOpcion = co.id
             WHERE s.id = ?`,
            [idSolicitud]
        );

        if (solicitudes.length === 0 || !solicitudes[0].opcion_posgrado_id) {
            throw new Error('La solicitud no tiene una opción de posgrado válida asignada.');
        }

        const idOpcion = solicitudes[0].opcion_posgrado_id;

        // 2. Obtener los temas configurados para esa opción
        const [temasOpcion] = await conn.query(
            `SELECT idTema FROM opcion_tema WHERE idOpcion = ?`,
            [idOpcion]
        );

        if (temasOpcion.length === 0) {
            // Regla de Negocio 1: Toda opción de posgrado debe tener temas. Si no tiene, bloqueamos.
            throw new Error('Error de configuración: La opción de posgrado no tiene temas de evaluación asignados. Contacte a un administrador para configurarlos en el catálogo.');
        }

        // 3. Consultar qué temas ya existen para esta solicitud
        const [temasExistentes] = await conn.query(
            `SELECT idTema FROM solicitud_tema WHERE idSolicitud = ?`,
            [idSolicitud]
        );
        const idsExistentes = temasExistentes.map(t => t.idTema);

        // 4. Filtrar los temas que faltan para insertarlos de forma segura
        const temasFaltantes = temasOpcion.filter(t => !idsExistentes.includes(t.idTema));

        // 5. Insertar los temas faltantes
        if (temasFaltantes.length > 0) {
            const values = temasFaltantes.map(t => [idSolicitud, t.idTema]);
            await conn.query(
                `INSERT INTO solicitud_tema (idSolicitud, idTema) VALUES ?`,
                [values]
            );
        }
    }

    /**
     * Obtiene todos los temas de evaluación de una solicitud.
     */
    static async getTemasDeSolicitud(idSolicitud) {
        const [resultados] = await db.query(
            `SELECT st.id, st.idSolicitud, st.idTema, st.idDocente, st.calificacion, st.fechaCaptura, st.observaciones,
                    t.nombre AS nombreTema,
                    COALESCE(CONCAT(d.nombre, ' ', d.primerApellido, ' ', COALESCE(d.segundoApellido, '')), '') AS nombreDocente
             FROM solicitud_tema st
             JOIN tema t ON st.idTema = t.id
             LEFT JOIN docente d ON st.idDocente = d.id
             WHERE st.idSolicitud = ?`,
            [idSolicitud]
        );
        return resultados;
    }

    /**
     * Actualiza la calificación y datos de evaluación de un tema específico.
     * Valida que la solicitud aún esté en la etapa permitida (Examen o Curso) y no esté cerrada.
     */
    static async actualizarCalificacionTema(idSolicitudTema, datos) {
        const { idDocente, calificacion, observaciones } = datos;

        // Validar etapa actual de la solicitud
        const [solicitudes] = await db.query(
            `SELECT s.idEtapaActual, s.estado 
             FROM solicitud_tema st
             JOIN solicitud s ON st.idSolicitud = s.id
             WHERE st.id = ?`,
            [idSolicitudTema]
        );

        if (solicitudes.length === 0) {
            throw new Error('El tema de evaluación no existe.');
        }

        const solicitud = solicitudes[0];
        // 3 = Examen, 4 = Curso Propedéutico, 8 = Examen programado
        const ETAPAS_PERMITIDAS = [3, 4, 8];
        
        if (!ETAPAS_PERMITIDAS.includes(solicitud.idEtapaActual) || solicitud.estado !== 'PENDIENTE') {
            throw new Error('No se pueden modificar calificaciones en esta etapa o estado del proceso.');
        }

        await db.query(
            `UPDATE solicitud_tema 
             SET idDocente = ?, 
                 calificacion = ?, 
                 observaciones = ?, 
                 fechaCaptura = NOW()
             WHERE id = ?`,
            [idDocente || null, calificacion, observaciones || null, idSolicitudTema]
        );
    }

    /**
     * Retorna true si TODOS los temas de una solicitud están calificados (calificacion IS NOT NULL).
     * Retorna false si existe al menos uno sin calificar.
     * Lanza error si la solicitud no tiene temas generados.
     */
    static async validarTemasCompletos(idSolicitud) {
        const [temas] = await db.query(
            `SELECT calificacion FROM solicitud_tema WHERE idSolicitud = ?`,
            [idSolicitud]
        );

        if (temas.length === 0) {
            // Regla de Negocio 1: Toda opción debe tener temas. Si llega aquí con 0 temas,
            // es porque ocurrió una inconsistencia grave.
            throw new Error('Error de configuración crítico: La solicitud no tiene temas de evaluación generados.');
        }

        // Todos deben tener una calificación (no null)
        const todosCalificados = temas.every(t => t.calificacion !== null && t.calificacion !== undefined);
        return todosCalificados;
    }
}

module.exports = SolicitudTemaService;
