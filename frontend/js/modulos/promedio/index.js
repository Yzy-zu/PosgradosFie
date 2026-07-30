const moduloPromedio = {
    async ejecutar(soliData, accion) {
        const idSolicitud = soliData.idSolicitud || soliData.id;
        const datosPromedio = await moduloPromedioAPI.obtenerDatos(idSolicitud);
        moduloPromedioRenderer.renderizar(soliData, datosPromedio);
    }
};
