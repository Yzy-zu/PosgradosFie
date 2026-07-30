const moduloCurso = {
    async ejecutar(soliData, accion) {
        const idSolicitud = soliData.idSolicitud || soliData.id;
        const datosCurso = await moduloCursoAPI.obtenerDatos(idSolicitud);
        moduloCursoRenderer.renderizar(soliData, datosCurso);
    }
};
