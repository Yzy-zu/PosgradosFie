const moduloPromedioRenderer = {
    renderizar(soliData, datosPromedio) {
        const container = document.getElementById('admision-dinamico-container');
        if (!container) return;

        const etapa = soliData.etapaNombre || (typeof t === 'function' ? t('mod_promedio') : 'Validación de Promedio');
        const estado = soliData.estado || 'EN_REVISION';
        const dictamen = (datosPromedio && datosPromedio.dictamen) ? datosPromedio.dictamen : null;
        
        const esValidado = (dictamen && dictamen.promedioValido === 1) || estado === 'APROBADO';
        const esRechazado = (dictamen && dictamen.promedioValido === 0) || estado === 'RECHAZADO';

        if (esValidado) {
            // 1. ESTADO APROBADO
            const promedioMostrar = (dictamen && dictamen.promedio !== null && dictamen.promedio !== undefined) ? dictamen.promedio : (soliData.promedioCapturado || soliData.promedio || (typeof t === 'function' ? t('doc_aprobado') : 'Aprobado'));
            const obsHtml = (dictamen && dictamen.observaciones) ? `
                <div style="margin-top: 20px; background: rgba(0,0,0,0.1); padding: 15px; border-radius: 8px;">
                    <strong style="font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 5px;">${typeof t === 'function' ? t('exam_obs_comite') : 'Observaciones del Comité'}</strong>
                    <span style="font-size: 14px;">${dictamen.observaciones}</span>
                </div>
            ` : '';

            container.innerHTML = `
                <div class="status-banner status-aprobado" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="status-banner-icon"><i class="fa-solid fa-calculator"></i></div>
                        <div>
                            <div class="status-banner-title">${typeof t === 'function' ? t('prom_evaluacion_titulo') : 'Evaluación por Promedio FIE'}</div>
                            <div class="status-banner-sub">${typeof t === 'function' ? t('doc_etapa_actual') : 'Etapa actual'}: <strong>${etapa}</strong></div>
                        </div>
                    </div>
                    <div><span class="status-banner-badge" style="background: #10b981; color: white;">${typeof t === 'function' ? t('prom_validado') : 'VALIDADO'}</span></div>
                </div>

                <div class="premium-panel" style="margin-bottom: 25px; position: relative; overflow: hidden; border-top: 4px solid #10b981;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <span style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-circle-check"></i> ${typeof t === 'function' ? t('prom_validado') : 'Dictamen Aprobado'}
                        </span>
                    </div>

                    <h4 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: var(--color-text); display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i> ${typeof t === 'function' ? t('prom_felicidades') : '¡Felicidades, tu promedio ha sido validado!'}
                    </h4>
                    <p style="margin-bottom: 20px; color: var(--color-text-muted); font-size: 14px; line-height: 1.5;">${typeof t === 'function' ? t('prom_felicidades_desc') : 'Tu certificado de estudios e historial académico han sido auditados y aprobados por el comité de posgrados.'}</p>
                    
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 160px;">
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; color: var(--color-text-muted); margin-bottom: 6px;">${typeof t === 'function' ? t('prom_verificado') : 'Promedio Verificado'}</span>
                            <strong style="font-size: 32px; font-weight: 800; color: var(--color-text); line-height: 1;">${promedioMostrar}</strong>
                        </div>
                        <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 160px;">
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; color: var(--color-text-muted); margin-bottom: 6px;">${typeof t === 'function' ? t('prom_dictamen') : 'Dictamen'}</span>
                            <div style="font-size: 20px; font-weight: 800; color: #10b981; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-circle-check"></i> ${typeof t === 'function' ? t('prom_valido') : 'Promedio Válido'}
                            </div>
                        </div>
                    </div>
                    ${dictamen && dictamen.observaciones ? `
                    <div style="margin-top: 20px; background: var(--color-bg); border-left: 3px solid #10b981; padding: 14px 18px; border-radius: 8px; border: 1px solid var(--color-border); border-left-width: 3px;">
                        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px;">
                            ${typeof t === 'function' ? t('exam_obs_comite') : 'Observaciones del Comité'}
                        </div>
                        <div style="font-size: 14px; color: var(--color-text);">${dictamen.observaciones}</div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else if (esRechazado) {
            // 2. ESTADO RECHAZADO
            const promedioMostrar = (dictamen && dictamen.promedio !== null && dictamen.promedio !== undefined) ? dictamen.promedio : (soliData.promedioCapturado || soliData.promedio || 'N/A');

            container.innerHTML = `
                <div class="status-banner status-rechazado" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="status-banner-icon"><i class="fa-solid fa-calculator"></i></div>
                        <div>
                            <div class="status-banner-title">${typeof t === 'function' ? t('prom_evaluacion_titulo') : 'Evaluación por Promedio FIE'}</div>
                            <div class="status-banner-sub">${typeof t === 'function' ? t('doc_etapa_actual') : 'Etapa actual'}: <strong>${etapa}</strong></div>
                        </div>
                    </div>
                    <div><span class="status-banner-badge" style="background: #ef4444; color: white;">${typeof t === 'function' ? t('doc_rechazado') : 'RECHAZADO'}</span></div>
                </div>

                <div class="premium-panel" style="margin-bottom: 25px; position: relative; overflow: hidden; border-top: 4px solid #ef4444;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <span style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-circle-xmark"></i> ${typeof t === 'function' ? t('doc_rechazado') : 'Dictamen No Válido'}
                        </span>
                    </div>

                    <h4 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: var(--color-text); display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> ${typeof t === 'function' ? t('prom_no_valido_titulo') : 'Dictamen de Promedio No Válido'}
                    </h4>
                    <p style="margin-bottom: 20px; color: var(--color-text-muted); font-size: 14px; line-height: 1.5;">${typeof t === 'function' ? t('prom_no_valido_desc') : 'El comité académico ha auditado tu expediente y determinado que el promedio acreditado no cumple con el requisito estipulado para este programa.'}</p>
                    
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 160px;">
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; color: var(--color-text-muted); margin-bottom: 6px;">${typeof t === 'function' ? t('prom_auditado') : 'Promedio Auditado'}</span>
                            <strong style="font-size: 32px; font-weight: 800; color: var(--color-text); line-height: 1;">${promedioMostrar}</strong>
                        </div>
                        <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 160px;">
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; color: var(--color-text-muted); margin-bottom: 6px;">${typeof t === 'function' ? t('prom_dictamen') : 'Dictamen'}</span>
                            <div style="font-size: 20px; font-weight: 800; color: #ef4444; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-circle-xmark"></i> ${typeof t === 'function' ? t('prom_no_valido') : 'No Válido'}
                            </div>
                        </div>
                    </div>
                    ${dictamen && dictamen.observaciones ? `
                    <div style="margin-top: 20px; background: var(--color-bg); border-left: 3px solid #ef4444; padding: 14px 18px; border-radius: 8px; border: 1px solid var(--color-border); border-left-width: 3px;">
                        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px;">
                            ${typeof t === 'function' ? t('exam_obs_comite') : 'Motivo del Dictamen / Observaciones'}
                        </div>
                        <div style="font-size: 14px; color: var(--color-text);">${dictamen.observaciones}</div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            // 3. ESTADO EN CURSO
            container.innerHTML = `
                <div class="status-banner status-aprobado" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="status-banner-icon"><i class="fa-solid fa-calculator"></i></div>
                        <div>
                            <div class="status-banner-title">${typeof t === 'function' ? t('prom_evaluacion_titulo') : 'Evaluación por Promedio FIE'}</div>
                            <div class="status-banner-sub">${typeof t === 'function' ? t('doc_etapa_actual') : 'Etapa actual'}: <strong>${etapa}</strong></div>
                        </div>
                    </div>
                    <div><span class="status-banner-badge">${estado}</span></div>
                </div>
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 25px; margin-top: 20px;">
                    <h4 style="margin-bottom: 10px; color: var(--color-text); font-weight: 700;">
                        <i class="fa-solid fa-award" style="color: var(--color-primary); margin-right: 8px;"></i>
                        ${typeof t === 'function' ? t('prom_en_curso_titulo') : 'Dictamen de Promedio Académico en Curso'}
                    </h4>
                    <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 0;">
                        ${typeof t === 'function' ? t('prom_en_curso_desc') : 'Tu certificado de estudios e historial de calificaciones está siendo verificado por el comité académico de posgrados.'}
                    </p>
                </div>
            `;
        }
    },

    renderizarModalDocente({ idSolicitud, datosDetalle, onGuardar }) {
        const body = document.getElementById('modal-dinamico-body');
        if (!body) return;

        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const sol = datosDetalle.solicitud || {};
        const docs = datosDetalle.documentos || {};
        const dictamen = datosDetalle.dictamen || {};

        const promedioCapturado = sol.promedioCapturado || 'N/A';
        const certificado = docs.certificado;
        const titulo = docs.titulo;
        const cedula = docs.cedula;

        const esValidoActualmente = dictamen.promedioValido === 1;

        body.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--color-border); padding-bottom: 15px;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: var(--color-text); font-weight: 700;">
                        <i class="fa-solid fa-calculator" style="color: var(--color-primary); margin-right: 8px;"></i>
                        Auditoría de Promedio — FIE
                    </h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--color-text-muted);">
                        ${sol.aspiranteNombre || 'Aspirante'} (${sol.programa || 'Posgrado'})
                    </p>
                </div>
                <button type="button" onclick="cerrarModalDinamico()" style="background: transparent; border: none; font-size: 18px; color: var(--color-text-muted); cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- Resumen Académico del Aspirante -->
            <div style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                    <div>
                        <span style="color: var(--color-text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700;">Licenciatura:</span>
                        <div style="color: var(--color-text); font-weight: 600;">${sol.licenciatura || 'No especificada'}</div>
                    </div>
                    <div>
                        <span style="color: var(--color-text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700;">Institución:</span>
                        <div style="color: var(--color-text); font-weight: 600;">${sol.institucionLicenciatura || 'No especificada'}</div>
                    </div>
                    <div style="grid-column: 1/-1; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                        <span style="font-weight: 600; color: var(--color-text);">Promedio Declarado por Aspirante:</span>
                        <span style="font-size: 18px; font-weight: 800; color: var(--color-primary);">${promedioCapturado}</span>
                    </div>
                </div>
            </div>

            <!-- Documentos de Cotejo -->
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 13px; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 10px; font-weight: 700;">
                    Documentos Oficiales de Respaldo:
                </h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <!-- Certificado Oficial -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-file-pdf" style="color: #ef4444; font-size: 18px;"></i>
                            <div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--color-text);">Certificado Oficial de Calificaciones</div>
                                <div style="font-size: 11px; color: var(--color-text-muted);">${certificado ? `Estado: ${certificado.estadoValidacion}` : 'No adjuntado'}</div>
                            </div>
                        </div>
                        ${certificado ? `
                            <button type="button" onclick="abrirArchivoSeguro('${certificado.rutaArchivo}')" class="btn-secondary btn-sm" style="padding: 5px 12px; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-card-bg); color: var(--color-text); cursor: pointer;">
                                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Ver Certificado
                            </button>
                        ` : '<span style="font-size: 12px; color: #ef4444; font-weight: 600;">Faltante</span>'}
                    </div>

                    <!-- Título de Licenciatura -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-graduation-cap" style="color: var(--color-primary); font-size: 18px;"></i>
                            <div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--color-text);">Título de Licenciatura</div>
                                <div style="font-size: 11px; color: var(--color-text-muted);">${titulo ? `Estado: ${titulo.estadoValidacion}` : 'No adjuntado'}</div>
                            </div>
                        </div>
                        ${titulo ? `
                            <button type="button" onclick="abrirArchivoSeguro('${titulo.rutaArchivo}')" class="btn-secondary btn-sm" style="padding: 5px 12px; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-card-bg); color: var(--color-text); cursor: pointer;">
                                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Ver Título
                            </button>
                        ` : '<span style="font-size: 12px; color: var(--color-text-muted);">No disponible</span>'}
                    </div>

                    ${cedula ? `
                    <!-- Cédula Profesional -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-id-card" style="color: #10b981; font-size: 18px;"></i>
                            <div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--color-text);">Cédula Profesional</div>
                                <div style="font-size: 11px; color: var(--color-text-muted);">Estado: ${cedula.estadoValidacion}</div>
                            </div>
                        </div>
                        <button type="button" onclick="abrirArchivoSeguro('${cedula.rutaArchivo}')" class="btn-secondary btn-sm" style="padding: 5px 12px; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-card-bg); color: var(--color-text); cursor: pointer;">
                            <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Ver Cédula
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Formulario de Dictamen -->
            <form id="form-dictamen-promedio" style="border-top: 1px solid var(--color-border); padding-top: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-text); margin-bottom: 6px;">
                            Promedio Verificado en Certificado:
                        </label>
                        <input type="number" step="0.01" min="0" max="10" id="input-promedio-verificado" class="form-control" value="${dictamen.promedio !== undefined && dictamen.promedio !== null ? dictamen.promedio : (promedioCapturado !== 'N/A' ? promedioCapturado : '')}" placeholder="ej. 8.50" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-input-bg); color: var(--color-text); width: 100%;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-text); margin-bottom: 6px;">
                            Dictamen del Promedio:
                        </label>
                        <select id="select-promedio-valido" class="form-select" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-input-bg); color: var(--color-text); width: 100%;">
                            <option value="1" ${esValidoActualmente || !dictamen.id ? 'selected' : ''}>✓ Promedio Válido (Aprobado)</option>
                            <option value="0" ${dictamen.id && !esValidoActualmente ? 'selected' : ''}>✕ Promedio No Válido (Rechazado)</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-text); margin-bottom: 6px;">
                        Observaciones / Notas del Dictamen:
                    </label>
                    <textarea id="textarea-promedio-observaciones" rows="3" class="form-control" placeholder="Escribe aquí aclaraciones sobre el promedio o certificado..." style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-input-bg); color: var(--color-text); width: 100%; resize: vertical;">${dictamen.observaciones || ''}</textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" onclick="cerrarModalDinamico()" class="modal-btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="modal-btn-primary">
                        <i class="fa-solid fa-floppy-disk me-1"></i> Guardar Dictamen
                    </button>
                </div>
            </form>
        `;

        document.getElementById('form-dictamen-promedio').addEventListener('submit', (e) => {
            e.preventDefault();
            const promedioVerificado = document.getElementById('input-promedio-verificado').value;
            const promedioValido = document.getElementById('select-promedio-valido').value;
            const observaciones = document.getElementById('textarea-promedio-observaciones').value;

            if (onGuardar) {
                onGuardar({
                    idSolicitud,
                    promedio: promedioVerificado,
                    promedioValido: parseInt(promedioValido),
                    observaciones
                });
            }
        });
    }
};
