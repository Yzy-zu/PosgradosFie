const moduloProgramacionExamenRenderer = {
    renderizar(soliData, datosExamen) {
        const container = document.getElementById('admision-dinamico-container');
        if (!container) return;

        let htmlDetalles = '';
        if (datosExamen && datosExamen.existe && datosExamen.fecha) {
            const fechaFmt = new Date(datosExamen.fecha).toLocaleDateString();
            htmlDetalles = `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; box-shadow: var(--shadow-sm);">
                    <h4 style="margin-bottom: 15px; color: var(--color-text); font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-regular fa-calendar-check" style="color: var(--color-primary); font-size: 22px;"></i>
                        Detalles de tu Examen de Admisión
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="background: var(--color-bg); padding: 14px; border-radius: 10px; border: 1px solid var(--color-border);">
                            <span style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block;">Fecha y Hora</span>
                            <strong style="font-size: 15px; color: var(--color-text); display: block; margin-top: 4px;">${fechaFmt} ${datosExamen.hora ? '- ' + datosExamen.hora : ''}</strong>
                        </div>
                        <div style="background: var(--color-bg); padding: 14px; border-radius: 10px; border: 1px solid var(--color-border);">
                            <span style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block;">Lugar / Enlace</span>
                            <strong style="font-size: 15px; color: var(--color-text); display: block; margin-top: 4px;">${datosExamen.lugar || 'FIE / Aula Virtual'}</strong>
                        </div>
                    </div>
                    ${datosExamen.observaciones ? `
                        <div style="background: var(--color-bg); padding: 14px; border-radius: 10px; border-left: 4px solid var(--color-primary);">
                            <span style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block;">Observaciones</span>
                            <span style="font-size: 13px; color: var(--color-text); margin-top: 4px; display: block;">${datosExamen.observaciones}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            htmlDetalles = `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; box-shadow: var(--shadow-sm);">
                    <h4 style="margin-bottom: 10px; color: var(--color-text); font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-clock-rotate-left" style="color: #d97706; font-size: 22px;"></i>
                        Programación de Examen en Proceso
                    </h4>
                    <p style="margin-bottom: 0; color: var(--color-text-muted); font-size: 14px; line-height: 1.6;">
                        Tus documentos de admisión han sido aprobados por el comité. El evaluador asignado se encuentra agendando la fecha, hora y lugar de tu examen. Serás notificado en este panel en cuanto queden registrados.
                    </p>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="status-banner status-aprobado" style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="status-banner-icon"><i class="fa-solid fa-layer-group"></i></div>
                    <div>
                        <div class="status-banner-title">Módulo Activo</div>
                        <div class="status-banner-sub">Etapa actual: <strong>${soliData.etapaNombre || 'Programación de Examen'}</strong></div>
                    </div>
                </div>
            </div>
            ${htmlDetalles}
        `;
    }
};
