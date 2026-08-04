const moduloEntrevista = {
    /**
     * Ejecutado desde el panel del aspirante cuando la etapa activa es Entrevista.
     */
    ejecutarAspirante(soliData) {
        if (typeof moduloEntrevistaAPI !== 'undefined' && typeof moduloEntrevistaRenderer !== 'undefined') {
            moduloEntrevistaAPI.obtenerDatos(soliData.id)
                .then(datosEntrevista => {
                    moduloEntrevistaRenderer.renderizar(soliData, datosEntrevista);
                });
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloEntrevista;
}
