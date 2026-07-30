const db = require('../database/db');
const WorkflowService = require('./workflowService');

class ProgramacionExamenService {

    static ACCION_PERMITIDA = 'PROGRAMAR_EXAMEN';

    /**
     * Valida si la solicitud está en la etapa que permite programar examen
     */
    static async verificarAccionActiva(idSolicitud) {
        const acciones = await WorkflowService.getAccionActual(idSolicitud);
        const accionValida = acciones.some(a => a.codigo === this.ACCION_PERMITIDA);
        
        if (!accionValida) {
            throw new Error(`La solicitud no se encuentra en una etapa que permita la acción: ${this.ACCION_PERMITIDA}`);
        }
    }

    /**
     * Valida que no exista ya una programación previa
     */
    static async verificarUnicaProgramacion(idSolicitud) {
        const [existe] = await db.query(
            'SELECT id FROM programacion_examen WHERE idSolicitud = ?',
            [idSolicitud]
        );
        if (existe.length > 0) {
            throw new Error('La solicitud ya tiene un examen programado. Debe actualizar el existente, no crear uno nuevo.');
        }
    }

    /**
     * Crea la programación del examen y avanza la etapa de la solicitud
     */
    static async crearProgramacion(idSolicitud, fecha, hora, lugar, observaciones) {
        // 1. Validar reglas de negocio arquitectónicas
        await this.verificarAccionActiva(idSolicitud);
        await this.verificarUnicaProgramacion(idSolicitud);

        // 2. Insertar programación
        const [resultado] = await db.query(
            `INSERT INTO programacion_examen 
            (idSolicitud, fecha, hora, lugar, observaciones) 
            VALUES (?, ?, ?, ?, ?)`,
            [idSolicitud, fecha, hora, lugar, observaciones || null]
        );

        // 3. Avanzar etapa (Mueve la solicitud a "Examen programado")
        // La actualización a "Captura de resultado" ocurrirá en el futuro cuando el docente ejecute HABILITAR_CAPTURA_RESULTADO
        await WorkflowService.avanzarEtapa(idSolicitud);

        return {
            idProgramacion: resultado.insertId,
            mensaje: 'Examen programado exitosamente y solicitud avanzada de etapa.'
        };
    }

    /**
     * Obtiene la programación de examen de una solicitud
     */
    static async obtenerProgramacion(idSolicitud) {
        const [resultados] = await db.query(
            'SELECT * FROM programacion_examen WHERE idSolicitud = ?',
            [idSolicitud]
        );
        
        if (resultados.length === 0) {
            return null;
        }
        
        return resultados[0];
    }

    /**
     * Actualiza la fecha/hora/lugar de un examen ya programado.
     * Solo debe permitirse si la solicitud sigue en la etapa "Examen Programado" (esperando aplicación).
     * Si ya avanzó a "Examen" (captura de resultados), se bloquea la edición.
     */
    static async actualizarProgramacion(idProgramacion, fecha, hora, lugar, observaciones) {
        // Obtener el idSolicitud asociado a esta programación
        const [prog] = await db.query('SELECT idSolicitud FROM programacion_examen WHERE id = ?', [idProgramacion]);
        
        if (prog.length === 0) {
            throw new Error('No se encontró el registro de programación del examen.');
        }
        
        const idSolicitud = prog[0].idSolicitud;

        // Validar que la solicitud aún esté esperando la aplicación (acción: HABILITAR_CAPTURA_RESULTADO)
        // NOTA: También podríamos dejar que editen si está en PROGRAMAR_EXAMEN (aunque lógicamente ya avanzó), 
        // pero la regla estricta es no permitir editar si ya pasó a evaluar.
        const acciones = await WorkflowService.getAccionActual(idSolicitud);
        const permiteEditar = acciones.some(a => a.codigo === 'HABILITAR_CAPTURA_RESULTADO' || a.codigo === this.ACCION_PERMITIDA);

        if (!permiteEditar) {
            throw new Error('No se puede actualizar el examen porque la solicitud ya ha avanzado a la etapa de evaluación o posterior.');
        }

        // Ejecutar actualización
        await db.query(
            `UPDATE programacion_examen 
             SET fecha = ?, hora = ?, lugar = ?, observaciones = ? 
             WHERE id = ?`,
            [fecha, hora, lugar, observaciones || null, idProgramacion]
        );

        return {
            mensaje: 'Programación actualizada correctamente.'
        };
    }

    /**
     * Elimina una programación (Cancela el examen programado)
     */
    static async cancelarProgramacion(idProgramacion) {
        // Obtener ID para validación
        const [prog] = await db.query('SELECT idSolicitud FROM programacion_examen WHERE id = ?', [idProgramacion]);
        if (prog.length === 0) {
            throw new Error('La programación no existe.');
        }
        
        const idSolicitud = prog[0].idSolicitud;
        const acciones = await WorkflowService.getAccionActual(idSolicitud);
        const permiteEditar = acciones.some(a => a.codigo === 'HABILITAR_CAPTURA_RESULTADO');

        if (!permiteEditar) {
            throw new Error('No se puede cancelar el examen porque ya está en evaluación o posterior.');
        }

        await db.query('DELETE FROM programacion_examen WHERE id = ?', [idProgramacion]);

        // ATENCIÓN ARQUITECTÓNICA: Si el examen se cancela, ¿la etapa debe regresar a "PROGRAMAR_EXAMEN"?
        // Por ahora, asumimos que cancelar es una operación poco común o que requiere intervención del admin,
        // pero si fuera necesario, WorkflowService debería tener un método "retrocederEtapa".
        
        return {
            mensaje: 'Programación de examen eliminada exitosamente.'
        };
    }
}

module.exports = ProgramacionExamenService;
