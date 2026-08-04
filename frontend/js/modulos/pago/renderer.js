const moduloPagoRenderer = {
    /**
     * Renderiza el panel de pago en #admision-modulo-dinamico.
     * @param {object} soliData  - datos de la solicitud hidratada
     * @param {object} pagoData  - respuesta de GET /api/pagos/:id
     */
    renderizar(soliData, pagoData) {
        const contenedor = document.getElementById('admision-dinamico-container');
        if (!contenedor) return;

        const idSolicitud = soliData.idSolicitud || soliData.id;
        const estado = pagoData?.estado || 'PENDIENTE';
        const existe = pagoData?.existe || false;

        // Colores y textos por estado
        const estadoConfig = {
            PENDIENTE:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icono: 'fa-clock',         texto: 'En espera de verificación' },
            APROBADO:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icono: 'fa-circle-check',  texto: 'Pago verificado y aprobado' },
            RECHAZADO:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icono: 'fa-circle-xmark',  texto: 'Comprobante rechazado' },
        };
        const cfg = estadoConfig[estado] || estadoConfig.PENDIENTE;

        let bannerHtml = '';
        if (existe) {
            bannerHtml = `
            <div style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:10px;background:${cfg.bg};border:1px solid ${cfg.color};margin-bottom:22px;">
                <i class="fa-solid ${cfg.icono}" style="font-size:26px;color:${cfg.color};flex-shrink:0;"></i>
                <div>
                    <div style="font-weight:700;color:${cfg.color};font-size:15px;">${cfg.texto}</div>
                    ${pagoData.referencia ? `<div style="font-size:13px;color:var(--color-text-muted);margin-top:2px;">Referencia: <strong>${pagoData.referencia}</strong></div>` : ''}
                    ${estado === 'RECHAZADO' && pagoData.observaciones ? `<div style="font-size:13px;color:#ef4444;margin-top:4px;"><i class="fa-solid fa-triangle-exclamation"></i> ${pagoData.observaciones}</div>` : ''}
                </div>
            </div>`;
        }

        // El formulario de subida se muestra si no hay pago o si fue rechazado
        const mostrarFormulario = !existe || estado === 'RECHAZADO';

        const formularioHtml = mostrarFormulario ? `
        <form id="form-pago" enctype="multipart/form-data">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
                <div>
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--color-text-muted);">Monto pagado (opcional)</label>
                    <input type="number" name="monto" step="0.01" placeholder="Ej: 350.00"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);font-size:14px;">
                </div>
                <div>
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--color-text-muted);">Referencia bancaria (opcional)</label>
                    <input type="text" name="referencia" placeholder="Ej: REF-20260803"
                        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);font-size:14px;">
                </div>
            </div>
            <div style="margin-bottom:22px;">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--color-text-muted);">Comprobante de pago <span style="color:var(--color-primary);">*</span></label>
                <label for="input-comprobante" style="display:flex;align-items:center;gap:12px;padding:18px 20px;border:2px dashed var(--color-border);border-radius:10px;cursor:pointer;transition:border-color 0.2s;" id="label-comprobante">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size:24px;color:var(--color-primary);"></i>
                    <div>
                        <div style="font-weight:600;color:var(--color-text);">Seleccionar archivo</div>
                        <div style="font-size:12px;color:var(--color-text-muted);">PDF, JPG o PNG — máx. 5 MB</div>
                    </div>
                </label>
                <input type="file" id="input-comprobante" name="comprobante" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" onchange="moduloPagoRenderer.onFileChange(this)">
                <div id="pago-file-name" style="margin-top:8px;font-size:13px;color:var(--color-text-muted);"></div>
            </div>
            <button type="button" onclick="moduloPagoRenderer.enviarComprobante(${idSolicitud})"
                style="width:100%;padding:13px;border-radius:8px;background:var(--color-primary);color:#fff;font-weight:700;font-size:15px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;">
                <i class="fa-solid fa-paper-plane"></i>
                ${estado === 'RECHAZADO' ? 'Volver a enviar comprobante' : 'Enviar comprobante de pago'}
            </button>
        </form>` : `
        <div style="text-align:center;padding:30px;color:var(--color-text-muted);">
            <i class="fa-solid fa-hourglass-half" style="font-size:40px;margin-bottom:14px;opacity:0.4;"></i>
            <div style="font-size:15px;">Tu comprobante está siendo revisado por el coordinador.</div>
            <div style="font-size:13px;margin-top:6px;">Recibirás una notificación cuando sea verificado.</div>
        </div>`;

        contenedor.innerHTML = `
        <div class="premium-panel" style="border-top: 4px solid var(--color-primary);">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;">
                <div style="width:44px;height:44px;border-radius:50%;background:rgba(138,28,36,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid fa-receipt" style="color:var(--color-primary);font-size:20px;"></i>
                </div>
                <div>
                    <h3 style="margin:0;font-size:18px;font-weight:700;color:var(--color-text);">Verificación de Pago</h3>
                    <p style="margin:4px 0 0;font-size:13px;color:var(--color-text-muted);">Sube el comprobante del pago del examen o curso propedéutico para continuar tu proceso.</p>
                </div>
            </div>
            ${bannerHtml}
            ${formularioHtml}
        </div>`;
    },

    onFileChange(input) {
        const label = document.getElementById('pago-file-name');
        if (label) {
            label.textContent = input.files[0] ? `📎 ${input.files[0].name}` : '';
        }
    },

    async enviarComprobante(idSolicitud) {
        const fileInput = document.getElementById('input-comprobante');
        if (!fileInput || !fileInput.files[0]) {
            Swal.fire('Archivo requerido', 'Debes adjuntar el comprobante de pago antes de enviar.', 'warning');
            return;
        }

        const formData = new FormData(document.getElementById('form-pago'));

        mostrarLoader();
        const resultado = await moduloPagoAPI.subirComprobante(idSolicitud, formData);
        ocultarLoader();

        if (resultado && resultado.success) {
            Swal.fire({ icon: 'success', title: '¡Comprobante enviado!', text: resultado.mensaje, timer: 2500, showConfirmButton: false });
            // Recargar el módulo para mostrar el estado actualizado
            const pagoActualizado = await moduloPagoAPI.obtenerEstado(idSolicitud);
            this.renderizar({ idSolicitud }, pagoActualizado);
        } else {
            Swal.fire('Error', resultado?.mensaje || 'No se pudo enviar el comprobante.', 'error');
        }
    }
};
