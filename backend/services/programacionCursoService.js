const db = require('../database/db');
const WorkflowService = require('./workflowService');
const SolicitudTemaService = require('./solicitudTemaService');

class ProgramacionCursoService {
    /**
     * Guarda o actualiza la programación del curso propedéutico para una solicitud
     */
    static async programarCurso(idSolicitud, datosProgramacion) {
        const { fechaInicio, fechaFin, aula, observaciones } = datosProgramacion;

        // Verificar si ya existe una programación
        const [existente] = await db.query(
            'SELECT id FROM programacion_curso WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (existente.length > 0) {
            // Actualizar programación existente
            await this.actualizarProgramacion(idSolicitud, datosProgramacion);
            return { success: true, mensaje: 'Programación de curso propedéutico actualizada correctamente.' };
        } else {
            // Primera programación: crea registro y genera temas. 
            // (No avanza etapa aquí porque la captura de calificación se realiza en esta misma etapa)
            const conn = await db.getConnection();
            await conn.beginTransaction();
            try {
                await this.crearProgramacion(idSolicitud, datosProgramacion, conn);
                await SolicitudTemaService.generarTemasSiNoExisten(idSolicitud, conn);
                await conn.commit();
                return { success: true, mensaje: 'Curso propedéutico programado y temas de evaluación generados correctamente.' };
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }
        }
    }

    /**
     * Crea un nuevo registro de programación de curso.
     */
    static async crearProgramacion(idSolicitud, datosProgramacion, conn = db) {
        const { fechaInicio, fechaFin, aula, observaciones } = datosProgramacion;
        await conn.query(
            `INSERT INTO programacion_curso (idSolicitud, fechaInicio, fechaFin, aula, observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [idSolicitud, fechaInicio || null, fechaFin || null, aula || null, observaciones || null]
        );
    }

    /**
     * Actualiza un registro existente de programación de curso.
     */
    static async actualizarProgramacion(idSolicitud, datosProgramacion, conn = db) {
        const { fechaInicio, fechaFin, aula, observaciones } = datosProgramacion;
        await conn.query(
            `UPDATE programacion_curso 
             SET fechaInicio = ?, fechaFin = ?, aula = ?, observaciones = ? 
             WHERE idSolicitud = ?`,
            [fechaInicio || null, fechaFin || null, aula || null, observaciones || null, idSolicitud]
        );
    }

    /**
     * Obtiene la programación del curso propedéutico de una solicitud
     */
    static async getProgramacionPorSolicitud(idSolicitud) {
        const [resultados] = await db.query(
            'SELECT fechaInicio, fechaFin, aula, observaciones FROM programacion_curso WHERE idSolicitud = ?',
            [idSolicitud]
        );
        return resultados.length > 0 ? resultados[0] : null;
    }

    /**
     * Captura el resultado del curso propedéutico (calificación final y dictamen aprobado)
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
            
            if (solicitudes.length === 0 || solicitudes[0].nombre !== 'Curso Propedéutico') {
                throw new Error('Regresión de workflow impedida: La solicitud ya no se encuentra en la etapa de Curso Propedéutico.');
            }

            const [existente] = await conn.query(
                'SELECT id FROM resultado_curso WHERE idSolicitud = ?',
                [idSolicitud]
            );

            if (existente.length > 0) {
                await conn.query(
                    `UPDATE resultado_curso 
                     SET calificacion = ?, aprobado = ?, observaciones = ?, fechaCaptura = NOW()
                     WHERE idSolicitud = ?`,
                    [calificacion, aprobado ? 1 : 0, observaciones || null, idSolicitud]
                );
            } else {
                await conn.query(
                    `INSERT INTO resultado_curso (idSolicitud, calificacion, aprobado, observaciones, fechaCaptura)
                     VALUES (?, ?, ?, ?, NOW())`,
                    [idSolicitud, calificacion, aprobado ? 1 : 0, observaciones || null]
                );
            }

            // Avanzar a la siguiente etapa de forma centralizada según la modalidad configurada
            await WorkflowService.avanzarEtapa(idSolicitud, conn);

            await conn.commit();
            return { success: true, mensaje: 'Resultado capturado y etapa avanzada correctamente.' };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = ProgramacionCursoService;
