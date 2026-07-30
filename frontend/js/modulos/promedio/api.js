const moduloPromedioAPI = {
    async obtenerDatos(idSolicitud) {
        try {
            const res = await fetch(`/api/solicitud/modalidad/3`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloPromedioAPI:", e);
            return null;
        }
    }
};
