const db = require('../database/db');
const WorkflowService = require('./workflowService');
const SolicitudTemaService = require('./solicitudTemaService');
const { ETAPAS } = require('../constants');

class ProgramacionExamenService {
    /**
     * Guarda o actualiza la programación del examen para una solicitud
     */
    static async programarExamen(idSolicitud, datosProgramacion) {
        // Verificar si ya existe una programación
        const [existente] = await db.query(
            'SELECT id FROM programacion_examen WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (existente.length > 0) {
            // Edición posterior: no avanza de etapa
            await this.actualizarProgramacion(idSolicitud, datosProgramacion);
            return { success: true, mensaje: 'Programación de examen actualizada correctamente.' };
        } else {
            // Primera programación: sí avanza de etapa a "Examen Programado" y genera temas
            const conn = await db.getConnection();
            await conn.beginTransaction();
            try {
                await this.crearProgramacion(idSolicitud, datosProgramacion, conn);
                await WorkflowService.avanzarEtapa(idSolicitud, conn);
                await SolicitudTemaService.generarTemasSiNoExisten(idSolicitud, conn);
                await conn.commit();
                return { success: true, mensaje: 'Examen programado, etapa avanzada y temas de evaluación generados correctamente.' };
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }
        }
    }

    /**
     * Crea un nuevo registro de programación de examen.
     */
    static async crearProgramacion(idSolicitud, datosProgramacion, conn = db) {
        const { fecha, hora, lugar, observaciones } = datosProgramacion;
        await conn.query(
            `INSERT INTO programacion_examen (idSolicitud, fecha, hora, lugar, observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [idSolicitud, fecha, hora, lugar, observaciones || null]
        );
    }

    /**
     * Actualiza un registro existente de programación de examen.
     */
    static async actualizarProgramacion(idSolicitud, datosProgramacion, conn = db) {
        const { fecha, hora, lugar, observaciones } = datosProgramacion;
        await conn.query(
            `UPDATE programacion_examen 
             SET fecha = ?, hora = ?, lugar = ?, observaciones = ? 
             WHERE idSolicitud = ?`,
            [fecha, hora, lugar, observaciones || null, idSolicitud]
        );
    }

    /**
     * Confirma la aplicación del examen (El docente marca que ya se aplicó)
     * Esto avanza la etapa hacia la captura de resultados.
     */
    static async confirmarExamen(idSolicitud) {
        await WorkflowService.avanzarEtapa(idSolicitud);
        return { success: true, mensaje: 'Aplicación del examen confirmada exitosamente.' };
    }

    /**
     * Obtiene la programación de examen actual de una solicitud
     */
    static async getProgramacionPorSolicitud(idSolicitud) {
        const [resultados] = await db.query(
            'SELECT fecha, hora, lugar, observaciones FROM programacion_examen WHERE idSolicitud = ?',
            [idSolicitud]
        );
        return resultados.length > 0 ? resultados[0] : null;
    }

    /**
     * Captura el resultado del examen (calificación y si aprobó)
     */
    static async capturarResultado(idSolicitud, datosCaptura) {
        // Validar que todos los temas de la solicitud estén calificados antes de avanzar
        const todosCalificados = await SolicitudTemaService.validarTemasCompletos(idSolicitud);
        if (!todosCalificados) {
            return { success: false, bloqueo: true, mensaje: 'Evaluación por temas incompleta. Todos los temas deben tener calificación antes de cerrar el resultado.' };
        }

        const { calificacion, aprobado, observaciones } = datosCaptura;
        
        const conn = await db.getConnection();
        await conn.beginTransaction();
        try {
            // Verificar etapa actual para impedir regresiones
            const [solicitudes] = await conn.query('SELECT s.idEtapaActual, ep.nombre FROM solicitud s LEFT JOIN etapa_proceso ep ON s.idEtapaActual = ep.id WHERE s.id = ? FOR UPDATE', [idSolicitud]);
            
            if (solicitudes.length === 0 || (solicitudes[0].nombre !== 'Examen' && solicitudes[0].nombre !== 'Examen programado')) {
                throw new Error('Regresión de workflow impedida: La solicitud ya no se encuentra en la etapa de Examen.');
            }

            // Se guarda en resultado_examen, NO en programacion_examen
            await conn.query(
                `INSERT INTO resultado_examen (idSolicitud, calificacion, aprobado, observaciones, fechaCaptura)
                 VALUES (?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE 
                 calificacion = VALUES(calificacion), 
                 aprobado = VALUES(aprobado), 
                 observaciones = VALUES(observaciones),
                 fechaCaptura = NOW()`,
                [idSolicitud, calificacion, aprobado ? 1 : 0, observaciones || null]
            );

            // Avance dinámico, se asume 'Resultado' como la etapa de destino o la idEtapa=6
            const [etapasResultado] = await conn.query("SELECT id FROM etapa_proceso WHERE nombre = 'Resultado' LIMIT 1");
            const idEtapaResultado = etapasResultado.length > 0 ? etapasResultado[0].id : ETAPAS.RESULTADO;

            // Actualizar la etapa
            await conn.query('UPDATE solicitud SET idEtapaActual = ? WHERE id = ?', [idEtapaResultado, idSolicitud]);

            await conn.commit();
            return { success: true, mensaje: 'Resultado capturado y etapa avanzada a Resultado correctamente.' };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = ProgramacionExamenService;
