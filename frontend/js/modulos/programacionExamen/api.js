const moduloProgramacionExamenAPI = {
    async obtenerDatos(idSolicitud) {
        try {
            const res = await fetch(`/api/programacion-examen/solicitud/${idSolicitud}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloProgramacionExamenAPI:", e);
            return null;
        }
    }
};
