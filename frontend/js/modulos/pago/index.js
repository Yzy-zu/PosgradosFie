const moduloPago = {
    /**
     * Punto de entrada del módulo.
     * Se llama desde MODULOS_REGISTRY cuando la etapa activa es PAGO.
     * Cubre tanto la acción del aspirante (SUBIR_COMPROBANTE_PAGO)
     * como la señal al coordinador (VERIFICAR_PAGO — la UI del coord está en su propio panel).
     */
    async ejecutar(soliData, accion) {
        const idSolicitud = soliData.idSolicitud || soliData.id;

        // Navegar automáticamente a la sección de Admisión donde vive el módulo dinámico
        if (typeof switchView === 'function') {
            switchView('admision');
        }

        const pagoData = await moduloPagoAPI.obtenerEstado(idSolicitud);
        moduloPagoRenderer.renderizar(soliData, pagoData);
    }
};
