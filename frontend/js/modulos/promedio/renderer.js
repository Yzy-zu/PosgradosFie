const moduloPromedioRenderer = {
    renderizar(soliData, datosPromedio) {
        const banner = document.getElementById('banner-revision');
        const encabezado = document.getElementById('encabezado-documentos');
        const stepper = document.querySelector('.stepper-wrapper');

        if (encabezado) encabezado.style.display = 'none';
        if (stepper) stepper.style.display = 'none';
        document.querySelectorAll('.station-panel').forEach(p => p.style.display = 'none');
        const panel0 = document.getElementById('panel-estacion-0');
        if (panel0) panel0.style.display = 'none';

        if (banner) {
            banner.style.cssText = 'display:block; background:transparent; border:none; shadow:none; padding:0; margin-bottom: 20px;';

            banner.innerHTML = `
                <div class="status-banner status-aprobado">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="status-banner-icon"><i class="fa-solid fa-calculator"></i></div>
                        <div>
                            <div class="status-banner-title">Evaluación por Promedio</div>
                            <div class="status-banner-sub">Etapa actual: <strong>${soliData.etapaNombre || 'Validación de Promedio'}</strong></div>
                        </div>
                    </div>
                    <div><span class="status-banner-badge">EN REVISIÓN</span></div>
                </div>
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; margin-top: 20px;">
                    <h4 style="margin-bottom: 10px; color: var(--color-text); font-weight: 700;">
                        <i class="fa-solid fa-award" style="color: var(--color-primary); margin-right: 8px;"></i>
                        Dictamen de Promedio Académico
                    </h4>
                    <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 0;">
                        Tu certificado de estudios e historial de calificaciones está siendo verificado por el comité académico.
                    </p>
                </div>
                <div id="docs-dinamicos-container" style="margin-top: 20px; padding-bottom: 80px;"></div>
            `;

            if (typeof cargarDocsLecturaAspirante === 'function') {
                cargarDocsLecturaAspirante(soliData);
            }
        }
    }
};
