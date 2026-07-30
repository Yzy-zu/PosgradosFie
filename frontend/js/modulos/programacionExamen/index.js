const moduloProgramacionExamen = {
    async ejecutar(soliData, accion) {
        const idSolicitud = soliData.idSolicitud || soliData.id;
        const datosExamen = await moduloProgramacionExamenAPI.obtenerDatos(idSolicitud);
        moduloProgramacionExamenRenderer.renderizar(soliData, datosExamen);
    }
};
