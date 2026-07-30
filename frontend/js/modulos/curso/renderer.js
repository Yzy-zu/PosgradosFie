const moduloCursoRenderer = {
    renderizar(soliData, datosCurso) {
        const banner = document.getElementById('banner-revision');
        const encabezado = document.getElementById('encabezado-documentos');
        const stepper = document.querySelector('.stepper-wrapper');

        if (encabezado) encabezado.style.display = 'none';
        if (stepper) stepper.style.display = 'none';
        document.querySelectorAll('.station-panel').forEach(p => p.style.display = 'none');
        const panel0 = document.getElementById('panel-estacion-0');
        if (panel0) panel0.style.display = 'none';

        if (banner) {
            banner.style.cssText = 'display:block; background:transparent; border:none; box-shadow:none; padding:0; margin-bottom: 20px;';

            banner.innerHTML = `
                <div class="status-banner status-aprobado">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="status-banner-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                        <div>
                            <div class="status-banner-title">Curso Propedéutico Activo</div>
                            <div class="status-banner-sub">Etapa actual: <strong>${soliData.etapaNombre || 'Curso Propedéutico'}</strong></div>
                        </div>
                    </div>
                    <div><span class="status-banner-badge">EN CURSO</span></div>
                </div>
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; margin-top: 20px;">
                    <h4 style="margin-bottom: 10px; color: var(--color-text); font-weight: 700;">
                        <i class="fa-solid fa-chalkboard-user" style="color: var(--color-primary); margin-right: 8px;"></i>
                        Seguimiento de Curso Propedéutico
                    </h4>
                    <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 0;">
                        Has sido registrado en la modalidad de Curso Propedéutico. Consulta tus horarios y materiales con el docente asignado.
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
