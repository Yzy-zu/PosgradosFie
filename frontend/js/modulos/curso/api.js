const moduloCursoAPI = {
    async obtenerDatos(idSolicitud, codigoModalidad = 'PROPEDEUTICO') {
        try {
            const res = await fetch(`/api/solicitud/modalidad/codigo/${codigoModalidad}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloCursoAPI (obtenerDatos):", e);
            return null;
        }
    },

    async obtenerDatosProgramacion(idSolicitud) {
        try {
            const res = await fetch(`/api/programacion-curso/solicitud/${idSolicitud}`);
            if (!res.ok) return null;
            
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await res.json();
            } else {
                console.warn("Respuesta no es JSON válida");
                return null;
            }
        } catch (e) {
            console.error("Error en moduloCursoAPI (obtenerDatosProgramacion):", e);
            return null;
        }
    },

    async guardarProgramacion(idSolicitud, datos) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/programacion-curso/${idSolicitud}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.mensaje || 'Error al guardar programación del curso propedéutico');
            }
            return data;
        } catch (e) {
            console.error("Error en moduloCursoAPI (guardarProgramacion):", e);
            throw e;
        }
    },

    async capturarResultado(idSolicitud, datos) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/programacion-curso/capturar/${idSolicitud}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.mensaje || 'Error al capturar resultado del curso propedéutico');
            }
            return data;
        } catch (e) {
            console.error("Error en moduloCursoAPI (capturarResultado):", e);
            throw e;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloCursoAPI;
}
