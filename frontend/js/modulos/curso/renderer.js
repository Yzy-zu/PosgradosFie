const moduloCursoRenderer = {
    renderizar(soliData, datosCurso) {
        const container = document.getElementById('admision-dinamico-container');
        if (!container) return;

        let htmlDetalles = '';
        if (datosCurso && datosCurso.existe && datosCurso.fechaInicio) {
            const isEn = typeof getIdiomaActual === 'function' && getIdiomaActual() === 'en';
            const langCode = isEn ? 'en-US' : 'es-ES';
            const fechaIniFmt = new Date(datosCurso.fechaInicio).toLocaleDateString(langCode, { day: 'numeric', month: 'short', year: 'numeric' });
            const fechaFinFmt = datosCurso.fechaFin ? new Date(datosCurso.fechaFin).toLocaleDateString(langCode, { day: 'numeric', month: 'short', year: 'numeric' }) : (typeof t === 'function' ? t('exam_sin_asignar') : 'Por definir');

            htmlDetalles = `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; box-shadow: var(--shadow-sm); margin-top: 20px;">
                    <h4 style="margin-bottom: 15px; color: var(--color-text); font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-chalkboard-user" style="color: var(--color-primary); font-size: 22px;"></i>
                        ${typeof t === 'function' ? t('curso_detalles_titulo') : 'Detalles de tu Curso Propedéutico'}
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="background: var(--color-bg); padding: 14px; border-radius: 10px; border: 1px solid var(--color-border);">
                            <span style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block;">${typeof t === 'function' ? t('curso_periodo') : 'Período del Curso'}</span>
                            <strong style="font-size: 15px; color: var(--color-text); display: block; margin-top: 4px;">${fechaIniFmt} - ${fechaFinFmt}</strong>
                        </div>
                        <div style="background: var(--color-bg); padding: 14px; border-radius: 10px; border: 1px solid var(--color-border);">
                            <span style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block;">${typeof t === 'function' ? t('curso_aula') : 'Aula / Salón'}</span>
                            <strong style="font-size: 15px; color: var(--color-text); display: block; margin-top: 4px;">${datosCurso.aula || (typeof t === 'function' ? t('exam_sin_asignar') : 'Sin asignar')}</strong>
                        </div>
                    </div>
                    ${datosCurso.observaciones ? `
                        <div style="background: var(--color-bg); padding: 14px; border-radius: 10px; border-left: 4px solid var(--color-primary);">
                            <span style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block;">${typeof t === 'function' ? t('curso_obs_docente') : 'Observaciones del Docente'}</span>
                            <span style="font-size: 13px; color: var(--color-text); margin-top: 4px; display: block;">${datosCurso.observaciones}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            htmlDetalles = `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; box-shadow: var(--shadow-sm); margin-top: 20px;">
                    <h4 style="margin-bottom: 10px; color: var(--color-text); font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-chalkboard-user" style="color: var(--color-primary); font-size: 22px;"></i>
                        ${typeof t === 'function' ? t('curso_seguimiento_titulo') : 'Seguimiento de Curso Propedéutico'}
                    </h4>
                    <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 0;">
                        ${typeof t === 'function' ? t('curso_seguimiento_desc') : 'Has sido registrado en la modalidad de Curso Propedéutico. Consulta tus horarios, aula y materiales con el docente en este panel en cuanto queden publicados.'}
                    </p>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="status-banner status-aprobado" style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="status-banner-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                    <div>
                        <div class="status-banner-title">${typeof t === 'function' ? t('curso_activo_banner') : 'Curso Propedéutico Activo'}</div>
                        <div class="status-banner-sub">${typeof t === 'function' ? t('doc_etapa_actual') : 'Etapa actual'}: <strong>${soliData.etapaNombre || (typeof t === 'function' ? t('mod_curso_propedeutico') : 'Curso Propedéutico')}</strong></div>
                    </div>
                </div>
                <div><span class="status-banner-badge">${typeof t === 'function' ? t('curso_en_curso') : 'EN CURSO'}</span></div>
            </div>
            ${htmlDetalles}
        `;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloCursoRenderer;
}
