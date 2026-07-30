const moduloProgramacionExamen = {
    // Para el aspirante
    ejecutarAspirante(soliData) {
        if (typeof moduloProgramacionExamenAPI !== 'undefined' && typeof moduloProgramacionExamenRenderer !== 'undefined') {
            moduloProgramacionExamenAPI.obtenerDatos(soliData.id)
                .then(datosExamen => {
                    moduloProgramacionExamenRenderer.renderizar(soliData, datosExamen);
                });
        }
    },
    
    // Para el docente (Orquestado dinámicamente)
    ejecutar(soliData, accionData) {
        if (typeof moduloProgramacionExamenDocenteRenderer !== 'undefined') {
            moduloProgramacionExamenDocenteRenderer.renderizar(soliData);
        } else {
            console.error("moduloProgramacionExamenDocenteRenderer no está cargado.");
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloProgramacionExamen;
}
