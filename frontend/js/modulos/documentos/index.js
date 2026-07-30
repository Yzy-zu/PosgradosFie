const moduloDocumentos = {
    async ejecutar(soliData, accion) {
        let dataExp = null;
        if (soliData && (soliData.idAspi || soliData.id)) {
            dataExp = await moduloDocumentosAPI.obtenerExpediente(soliData.idAspi || soliData.id);
        }
        moduloDocumentosRenderer.renderizar(soliData, dataExp);
    }
};
