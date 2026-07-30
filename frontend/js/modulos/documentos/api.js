const moduloDocumentosAPI = {
    async obtenerExpediente(idAspirante) {
        try {
            const res = await fetch(`/api/aspirante/${idAspirante}/expediente`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Error en moduloDocumentosAPI:", e);
            return null;
        }
    }
};
