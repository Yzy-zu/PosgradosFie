/**
 * ExamenAPI
 * 
 * Infraestructura para interactuar con la API del módulo de Programación de Examen.
 * Preparado para conectarse con la UI (formularios/modales) en el futuro.
 */

const ExamenAPI = {
    BASE_URL: '/api/examen/programacion',

    /**
     * Obtiene el token de autenticación actual
     */
    getToken: () => sessionStorage.getItem('token') || localStorage.getItem('token'),

    /**
     * Configuración base para las peticiones fetch
     */
    getHeaders: function() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    },

    /**
     * Programa un nuevo examen para una solicitud
     * @param {Object} data - { idSolicitud, fecha, hora, lugar, observaciones }
     */
    programar: async function(data) {
        try {
            const response = await fetch(this.BASE_URL, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.mensaje || 'Error al programar el examen');
            return result;
        } catch (error) {
            console.error('ExamenAPI.programar:', error);
            throw error;
        }
    },

    /**
     * Obtiene la programación actual de un examen
     * @param {number} idSolicitud 
     */
    obtener: async function(idSolicitud) {
        try {
            const response = await fetch(`${this.BASE_URL}/${idSolicitud}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.mensaje || 'Error al obtener la programación');
            return result;
        } catch (error) {
            console.error('ExamenAPI.obtener:', error);
            throw error;
        }
    },

    /**
     * Actualiza una programación existente
     * @param {number} idProgramacion 
     * @param {Object} data - { fecha, hora, lugar, observaciones }
     */
    actualizar: async function(idProgramacion, data) {
        try {
            const response = await fetch(`${this.BASE_URL}/${idProgramacion}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.mensaje || 'Error al actualizar el examen');
            return result;
        } catch (error) {
            console.error('ExamenAPI.actualizar:', error);
            throw error;
        }
    },

    /**
     * Cancela/elimina una programación
     * @param {number} idProgramacion 
     */
    cancelar: async function(idProgramacion) {
        try {
            const response = await fetch(`${this.BASE_URL}/${idProgramacion}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.mensaje || 'Error al cancelar el examen');
            return result;
        } catch (error) {
            console.error('ExamenAPI.cancelar:', error);
            throw error;
        }
    }
};

// Exportar globalmente para que los archivos principales (ej. docente.js) puedan consumirlo
window.ExamenAPI = ExamenAPI;
