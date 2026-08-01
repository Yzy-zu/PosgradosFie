const db = require('../database/db');
const WorkflowService = require('./workflowService');

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
            // Primera programación: crea registro y avanza de etapa en el workflow
            await this.crearProgramacion(idSolicitud, datosProgramacion);
            await WorkflowService.avanzarEtapa(idSolicitud);
            return { success: true, mensaje: 'Curso propedéutico programado y etapa avanzada correctamente.' };
        }
    }

    /**
     * Crea un nuevo registro de programación de curso.
     */
    static async crearProgramacion(idSolicitud, datosProgramacion) {
        const { fechaInicio, fechaFin, aula, observaciones } = datosProgramacion;
        await db.query(
            `INSERT INTO programacion_curso (idSolicitud, fechaInicio, fechaFin, aula, observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [idSolicitud, fechaInicio || null, fechaFin || null, aula || null, observaciones || null]
        );
    }

    /**
     * Actualiza un registro existente de programación de curso.
     */
    static async actualizarProgramacion(idSolicitud, datosProgramacion) {
        const { fechaInicio, fechaFin, aula, observaciones } = datosProgramacion;
        await db.query(
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
        const { calificacion, aprobado, observaciones } = datosCaptura;
        
        const [existente] = await db.query(
            'SELECT id FROM resultado_curso WHERE idSolicitud = ?',
            [idSolicitud]
        );

        if (existente.length > 0) {
            await db.query(
                `UPDATE resultado_curso 
                 SET calificacion = ?, aprobado = ?, observaciones = ?, fechaCaptura = NOW()
                 WHERE idSolicitud = ?`,
                [calificacion !== undefined && calificacion !== null ? calificacion : null, aprobado ? 1 : 0, observaciones || null, idSolicitud]
            );
        } else {
            await db.query(
                `INSERT INTO resultado_curso (idSolicitud, calificacion, aprobado, observaciones, fechaCaptura)
                 VALUES (?, ?, ?, ?, NOW())`,
                [idSolicitud, calificacion !== undefined && calificacion !== null ? calificacion : null, aprobado ? 1 : 0, observaciones || null]
            );
        }

        // Al capturar el resultado del curso propedéutico, avanzamos la solicitud a la etapa de Resultado (Etapa 6)
        const [etapasResultado] = await db.query("SELECT id FROM etapa_proceso WHERE nombre = 'Resultado' LIMIT 1");
        const idEtapaResultado = etapasResultado.length > 0 ? etapasResultado[0].id : 6;

        await db.query('UPDATE solicitud SET idEtapaActual = ? WHERE id = ?', [idEtapaResultado, idSolicitud]);

        return { success: true, mensaje: 'Resultado de propedéutico capturado y etapa avanzada a Resultado correctamente.' };
    }
}

module.exports = ProgramacionCursoService;
