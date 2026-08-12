const moduloDocumentosRenderer = {
    renderizar(soliData, dataExp) {
        const esEtapaAvanzada = soliData.etapaOrden && soliData.etapaOrden >= 2;
        if (['EN_REVISION', 'RECHAZADO', 'APROBADO'].includes(soliData.estado) || esEtapaAvanzada) {
            if (typeof bloquearInterfazPorRevision === 'function') {
                const estadoMostrar = (soliData.estado === 'PENDIENTE' && esEtapaAvanzada) ? 'APROBADO' : soliData.estado;
                bloquearInterfazPorRevision(estadoMostrar, soliData);
            }
        } else {
            const encabezado = document.getElementById('encabezado-documentos');
            const stepper = document.querySelector('.stepper-wrapper');
            const banner = document.getElementById('banner-revision');
            if (banner) banner.style.display = 'none';
            if (encabezado) encabezado.style.display = 'block';
            if (stepper) stepper.style.display = 'flex';

            // leer sessionStorage para mantener estado tras recarga
            const idSoli = soliData.id;
            let estacionGuardada = parseInt(sessionStorage.getItem(`estacion_actual_soli_${idSoli}`));
            if (isNaN(estacionGuardada)) {
                estacionGuardada = soliData.etapaOrden ? (soliData.etapaOrden - 1) : 0;
            }
            if (typeof cambiarEstacion === 'function' && estacionGuardada > 0) {
                const maxEstacion = typeof totalEstaciones !== 'undefined' && totalEstaciones > 0 ? totalEstaciones : 3;
                cambiarEstacion(Math.min(estacionGuardada, maxEstacion));
            }
        }
    }
};
