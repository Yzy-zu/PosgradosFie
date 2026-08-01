const moduloPromedioAPI = {
    async obtenerLista(codigoModalidad = 'PROMEDIO') {
        try {
            const res = await fetch(`/api/solicitud/modalidad/codigo/${codigoModalidad}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("Error en moduloPromedioAPI.obtenerLista:", e);
            return [];
        }
    },

    async obtenerDetalle(idSolicitud) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/validacion-promedio/${idSolicitud}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloPromedioAPI.obtenerDetalle:", e);
            return null;
        }
    },

    async guardarDictamen(payload) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/validacion-promedio/guardar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (e) {
            console.error("Error en moduloPromedioAPI.guardarDictamen:", e);
            return { success: false, mensaje: 'Error de conexión con el servidor.' };
        }
    }
};
