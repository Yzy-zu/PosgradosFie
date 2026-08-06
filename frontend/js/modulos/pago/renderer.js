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
            PENDIENTE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icono: 'fa-clock', texto: typeof t === 'function' ? t('pago_estado_pendiente') : 'En espera de verificación' },
            APROBADO: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icono: 'fa-circle-check', texto: typeof t === 'function' ? t('pago_estado_aprobado') : 'Pago verificado y aprobado' },
            RECHAZADO: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icono: 'fa-circle-xmark', texto: typeof t === 'function' ? t('pago_estado_rechazado') : 'Comprobante rechazado' },
        };
        const cfg = estadoConfig[estado] || estadoConfig.PENDIENTE;

        let bannerHtml = '';
        if (existe) {
            bannerHtml = `
            <div style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:10px;background:${cfg.bg};border:1px solid ${cfg.color};margin-bottom:22px;">
                <i class="fa-solid ${cfg.icono}" style="font-size:26px;color:${cfg.color};flex-shrink:0;"></i>
                <div>
                    <div style="font-weight:700;color:${cfg.color};font-size:15px;">${cfg.texto}</div>
                    ${pagoData.referencia ? `<div style="font-size:13px;color:var(--color-text-muted);margin-top:2px;"><i class="fa-solid fa-comment-dots" style="margin-right:4px;"></i> ${typeof t === 'function' ? t('pago_txt_comentarios') : 'Comentarios:'} <strong>${pagoData.referencia}</strong></div>` : ''}
                    ${estado === 'RECHAZADO' && pagoData.observaciones ? `<div style="font-size:13px;color:#ef4444;margin-top:4px;"><i class="fa-solid fa-triangle-exclamation"></i> ${pagoData.observaciones}</div>` : ''}
                </div>
            </div>`;
        }

        // El formulario de subida se muestra si no hay pago o si fue rechazado
        const mostrarFormulario = !existe || estado === 'RECHAZADO';

        const formularioHtml = mostrarFormulario ? `
        <form id="form-pago" enctype="multipart/form-data">
            <div style="margin-bottom:18px;">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--color-text-muted);">${typeof t === 'function' ? t('pago_comentarios_label') : 'Comentarios / Notas adicionales (opcional)'}</label>
                <textarea name="comentarios" rows="3" placeholder="${typeof t === 'function' ? t('pago_comentarios_ph') : 'Ingresa alguna observación o nota sobre tu pago...'}"
                    style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);font-size:14px;resize:vertical;font-family:inherit;"></textarea>
            </div>
            <div style="margin-bottom:22px;">
                <div class="file-box" id="pago-file-box">
                    <label><i class="fa-solid fa-file-invoice-dollar"></i> ${typeof t === 'function' ? t('pago_comprobante_label') : 'Comprobante de pago'} <span style="color:red;">*</span></label>
                    <input type="file" id="input-comprobante" name="comprobante" accept=".pdf,.jpg,.jpeg,.png" onchange="moduloPagoRenderer.onFileChange(this)">
                    <div id="pago-file-name" style="position:relative;z-index:2;pointer-events:none;"></div>
                </div>
                <div style="font-size:12px;color:var(--color-text-muted);margin-top:8px;text-align:center;">${typeof t === 'function' ? t('pago_archivo_reglas') : 'PDF, JPG o PNG — máx. 5 MB'}</div>
            </div>
            <button type="button" onclick="moduloPagoRenderer.enviarComprobante(${idSolicitud})"
                style="width:100%;padding:13px;border-radius:8px;background:var(--color-primary);color:#fff;font-weight:700;font-size:15px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;">
                <i class="fa-solid fa-paper-plane"></i>
                ${estado === 'RECHAZADO' ? (typeof t === 'function' ? t('pago_btn_reenviar') : 'Volver a enviar comprobante') : (typeof t === 'function' ? t('pago_btn_enviar') : 'Enviar comprobante de pago')}
            </button>
        </form>` : `
        <div style="text-align:center;padding:30px;color:var(--color-text-muted);">
            <i class="fa-solid fa-hourglass-half" style="font-size:40px;margin-bottom:14px;opacity:0.4;"></i>
            <div style="font-size:15px;">${typeof t === 'function' ? t('pago_msg_revisando') : 'Tu comprobante está siendo revisado por el coordinador.'}</div>
            <div style="font-size:13px;margin-top:6px;">${typeof t === 'function' ? t('pago_msg_notificacion') : 'Recibirás una notificación cuando sea verificado.'}</div>
        </div>`;

        contenedor.innerHTML = `
        <div class="premium-panel" style="border-top: 4px solid var(--color-primary);">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;">
                <div style="width:44px;height:44px;border-radius:50%;background:rgba(138,28,36,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid fa-receipt" style="color:var(--color-primary);font-size:20px;"></i>
                </div>
                <div>
                    <h3 style="margin:0;font-size:18px;font-weight:700;color:var(--color-text);">${typeof t === 'function' ? t('pago_verificacion_titulo') : 'Verificación de Pago'}</h3>
                    <p style="margin:4px 0 0;font-size:13px;color:var(--color-text-muted);">${typeof t === 'function' ? t('pago_verificacion_desc') : 'Sube el comprobante del pago de tu modalidad de admision para continuar tu proceso.'}</p>
                </div>
            </div>
            ${bannerHtml}
            ${formularioHtml}
        </div>`;
    },

    onFileChange(input) {
        const fileBox = document.getElementById('pago-file-box');
        const label = document.getElementById('pago-file-name');
        if (input.files && input.files[0]) {
            if (fileBox) fileBox.classList.add('file-selected');
            if (label) {
                label.innerHTML = `
                    <div class="file-name-display" style="color: var(--color-success); font-weight: 700; margin-top: 12px; font-size: 14px;">
                        <i class="fa-solid fa-circle-check"></i> ${typeof t === 'function' ? t('pago_archivo_seleccionado') : 'Archivo seleccionado:'}<br><span style="font-weight: 500;">${input.files[0].name}</span>
                    </div>
                `;
            }
        } else {
            if (fileBox) fileBox.classList.remove('file-selected');
            if (label) label.innerHTML = '';
        }
    },

    async enviarComprobante(idSolicitud) {
        const fileInput = document.getElementById('input-comprobante');
        if (!fileInput || !fileInput.files[0]) {
            Swal.fire(
                typeof t === 'function' ? t('pago_alerta_requerido_titulo') : 'Archivo requerido', 
                typeof t === 'function' ? t('pago_alerta_requerido_msg') : 'Debes adjuntar el comprobante de pago antes de enviar.', 
                'warning'
            );
            return;
        }

        const formData = new FormData(document.getElementById('form-pago'));

        mostrarLoader();
        const resultado = await moduloPagoAPI.subirComprobante(idSolicitud, formData);
        ocultarLoader();

        if (resultado && resultado.success) {
            Swal.fire({ 
                icon: 'success', 
                title: typeof t === 'function' ? t('pago_alerta_exito_titulo') : '¡Comprobante enviado!', 
                text: resultado.mensaje, 
                timer: 2500, 
                showConfirmButton: false 
            });
            // Recargar el módulo para mostrar el estado actualizado
            const pagoActualizado = await moduloPagoAPI.obtenerEstado(idSolicitud);
            this.renderizar({ idSolicitud }, pagoActualizado);
        } else {
            Swal.fire(
                typeof t === 'function' ? t('pago_alerta_error_titulo') : 'Error', 
                resultado?.mensaje || (typeof t === 'function' ? t('pago_alerta_error_msg') : 'No se pudo enviar el comprobante.'), 
                'error'
            );
        }
    }
};
