const moduloPromedioAPI = {
    async obtenerDatos(idSolicitud, codigoModalidad = 'PROMEDIO') {
        try {
            const res = await fetch(`/api/solicitud/modalidad/codigo/${codigoModalidad}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloPromedioAPI:", e);
            return null;
        }
    }
};
