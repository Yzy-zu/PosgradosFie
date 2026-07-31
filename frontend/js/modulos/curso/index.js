const moduloCurso = {
    async ejecutar(soliData, accion) {
        // Si viene con bandera docente o acción de programación/captura
        if (soliData.esDocente || soliData.accionActiva || soliData.modoReprogramar || soliData.modoCapturar) {
            if (typeof moduloCursoDocenteRenderer !== 'undefined') {
                moduloCursoDocenteRenderer.renderizar(soliData);
            }
        } else {
            const idSolicitud = soliData.idSolicitud || soliData.id;
            const datosCurso = await moduloCursoAPI.obtenerDatosProgramacion(idSolicitud);
            if (typeof moduloCursoRenderer !== 'undefined') {
                moduloCursoRenderer.renderizar(soliData, datosCurso);
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloCurso;
}
