const moduloPagoAPI = {
    async obtenerEstado(idSolicitud) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/pagos/${idSolicitud}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error('Error en moduloPagoAPI.obtenerEstado:', e);
            return null;
        }
    },

    async subirComprobante(idSolicitud, formData) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/pagos/subir/${idSolicitud}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData  // multipart/form-data — NO poner Content-Type manual
            });
            return await res.json();
        } catch (e) {
            console.error('Error en moduloPagoAPI.subirComprobante:', e);
            return { success: false, mensaje: 'Error de conexión con el servidor.' };
        }
    }
};
