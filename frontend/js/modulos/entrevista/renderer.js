const moduloEntrevistaRenderer = {
    renderizar(soliData, datosEntrevista) {
        const container = document.getElementById('admision-dinamico-container');
        if (!container) return;

        let htmlDetalles = '';

        if (datosEntrevista && datosEntrevista.existe && datosEntrevista.fecha) {
            const isEn = typeof getIdiomaActual === 'function' && getIdiomaActual() === 'en';
            const langCode = isEn ? 'en-US' : 'es-MX';
            const fechaFmt = new Date(datosEntrevista.fecha + 'T00:00:00').toLocaleDateString(langCode, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

            const chips = [];
            if (datosEntrevista.docenteNombre && datosEntrevista.docenteNombre.trim()) {
                chips.push({ icon: 'fa-user-tie', label: 'Entrevistador', value: datosEntrevista.docenteNombre.trim() });
            }
            chips.push({ icon: 'fa-calendar-day', label: 'Fecha', value: fechaFmt });
            chips.push({ icon: 'fa-clock', label: 'Hora', value: datosEntrevista.hora || 'Por confirmar' });
            chips.push({ icon: 'fa-location-dot', label: 'Lugar', value: datosEntrevista.lugar || 'Por confirmar' });
            if (datosEntrevista.enlace && datosEntrevista.enlace.trim()) {
                chips.push({ icon: 'fa-video', label: 'Enlace', value: `<a href="${datosEntrevista.enlace}" target="_blank" rel="noopener" style="color:var(--color-primary)">Unirse a la videollamada</a>` });
            }

            const chipsHtml = chips.map(c => `
                <div style="background:var(--color-bg);padding:14px 18px;border-radius:12px;border:1px solid var(--color-border);display:flex;gap:12px;align-items:flex-start;">
                    <i class="fa-solid ${c.icon}" style="color:var(--color-primary);font-size:18px;margin-top:2px;flex-shrink:0;"></i>
                    <div>
                        <span style="font-size:11px;text-transform:uppercase;color:var(--color-text-muted);font-weight:700;display:block;">${c.label}</span>
                        <span style="font-size:14px;color:var(--color-text);font-weight:600;margin-top:3px;display:block;">${c.value}</span>
                    </div>
                </div>`).join('');

            htmlDetalles = `
                <div style="background:var(--color-card-bg);border:1px solid var(--color-border);border-radius:16px;padding:28px;box-shadow:var(--shadow-sm);">
                    <h4 style="margin:0 0 18px;color:var(--color-text);font-weight:700;display:flex;align-items:center;gap:10px;font-size:17px;">
                        <i class="fa-solid fa-handshake" style="color:var(--color-primary);font-size:22px;"></i>
                        Detalles de tu Entrevista de Admisión
                    </h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;">
                        ${chipsHtml}
                    </div>
                    <p style="margin:18px 0 0;font-size:13px;color:var(--color-text-muted);line-height:1.6;border-top:1px solid var(--color-border);padding-top:14px;">
                        <i class="fa-solid fa-circle-info" style="color:#3b82f6;margin-right:6px;"></i>
                        Preséntate puntualmente en el lugar indicado o conéctate al enlace. Lleva una identificación oficial.
                    </p>
                </div>`;
        } else {
            htmlDetalles = `
                <div style="background:var(--color-card-bg);border:1px solid var(--color-border);border-radius:16px;padding:28px;box-shadow:var(--shadow-sm);">
                    <h4 style="margin:0 0 10px;color:var(--color-text);font-weight:700;display:flex;align-items:center;gap:10px;font-size:17px;">
                        <i class="fa-solid fa-hourglass-half" style="color:#d97706;font-size:22px;"></i>
                        Agendando tu Entrevista
                    </h4>
                    <p style="margin:0;color:var(--color-text-muted);font-size:14px;line-height:1.7;">
                        Tus documentos de admisión han sido aprobados por el comité académico. 
                        El coordinador del programa está agendando la fecha, hora y evaluador para tu entrevista de admisión. 
                        <strong>Serás notificado en este panel en cuanto quede registrada.</strong>
                    </p>
                </div>`;
        }

        container.innerHTML = `
            <div class="status-banner status-aprobado" style="margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:15px;">
                    <div class="status-banner-icon"><i class="fa-solid fa-comments"></i></div>
                    <div>
                        <div class="status-banner-title">Proceso de Admisión — Doctorado</div>
                        <div class="status-banner-sub">Etapa actual: <strong>${soliData.etapaNombre || 'Entrevista de Admisión'}</strong></div>
                    </div>
                </div>
            </div>
            ${htmlDetalles}
        `;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloEntrevistaRenderer;
}
