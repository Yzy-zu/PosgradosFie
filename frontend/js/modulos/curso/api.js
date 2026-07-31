const moduloCursoAPI = {
    async obtenerDatos(idSolicitud, codigoModalidad = 'PROPEDEUTICO') {
        try {
            const res = await fetch(`/api/solicitud/modalidad/codigo/${codigoModalidad}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloCursoAPI:", e);
            return null;
        }
    }
};
