const db = require('../database/db');
const WorkflowService = require('./workflowService');

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
            // Primera programación: sí avanza de etapa a "Examen Programado"
            await this.crearProgramacion(idSolicitud, datosProgramacion);
            await WorkflowService.avanzarEtapa(idSolicitud);
            return { success: true, mensaje: 'Examen programado y etapa avanzada correctamente.' };
        }
    }

    /**
     * Crea un nuevo registro de programación de examen.
     */
    static async crearProgramacion(idSolicitud, datosProgramacion) {
        const { fecha, hora, lugar, observaciones } = datosProgramacion;
        await db.query(
            `INSERT INTO programacion_examen (idSolicitud, fecha, hora, lugar, observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [idSolicitud, fecha, hora, lugar, observaciones || null]
        );
    }

    /**
     * Actualiza un registro existente de programación de examen.
     */
    static async actualizarProgramacion(idSolicitud, datosProgramacion) {
        const { fecha, hora, lugar, observaciones } = datosProgramacion;
        await db.query(
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
        const { calificacion, aprobado, observaciones } = datosCaptura;
        
        // Se guarda en resultado_examen, NO en programacion_examen
        await db.query(
            `INSERT INTO resultado_examen (idSolicitud, calificacion, aprobado, observaciones, fechaCaptura)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
             calificacion = VALUES(calificacion), 
             aprobado = VALUES(aprobado), 
             observaciones = VALUES(observaciones),
             fechaCaptura = NOW()`,
            [idSolicitud, calificacion, aprobado ? 1 : 0, observaciones || null]
        );

        // Al capturar la calificación final del examen, avanzamos la solicitud directamente a la etapa de Resultado (etapa 6)
        const [etapasResultado] = await db.query("SELECT id FROM etapa_proceso WHERE nombre = 'Resultado' LIMIT 1");
        const idEtapaResultado = etapasResultado.length > 0 ? etapasResultado[0].id : 6;

        await db.query('UPDATE solicitud SET idEtapaActual = ? WHERE id = ?', [idEtapaResultado, idSolicitud]);

        return { success: true, mensaje: 'Resultado capturado y etapa avanzada a Resultado correctamente.' };
    }
}

module.exports = ProgramacionExamenService;
