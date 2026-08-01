const moduloProgramacionExamenAPI = {
    async obtenerDatos(idSolicitud) {
        try {
            const res = await fetch(`/api/programacion-examen/solicitud/${idSolicitud}`);
            if (!res.ok) return null;
            
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await res.json();
            } else {
                console.warn("Respuesta no es JSON válida");
                return null;
            }
        } catch (e) {
            console.error("Error en moduloProgramacionExamenAPI (obtenerDatos):", e);
            return null;
        }
    },

    async guardarProgramacion(idSolicitud, datos) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/programacion-examen/${idSolicitud}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.mensaje || 'Error al guardar programación');
            }
            return data;
        } catch (e) {
            console.error("Error en moduloProgramacionExamenAPI (guardarProgramacion):", e);
            throw e;
        }
    },

    async capturarResultado(idSolicitud, datos) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/programacion-examen/capturar/${idSolicitud}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datos)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.mensaje || 'Error al capturar resultado');
            }
            return data;
        } catch (e) {
            console.error("Error en moduloProgramacionExamenAPI (capturarResultado):", e);
            throw e;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloProgramacionExamenAPI;
}
