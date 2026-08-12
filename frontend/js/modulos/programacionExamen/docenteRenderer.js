const moduloProgramacionExamenDocenteRenderer = {
    renderizar(soliData) {
        if (soliData.accionActiva === 'CAPTURAR_RESULTADO_EXAMEN') {
            this.renderizarCaptura(soliData);
        } else if (soliData.accionActiva === 'HABILITAR_CAPTURA_RESULTADO') {
            this.renderizarConfirmacion(soliData);
        } else {
            this.renderizarProgramacion(soliData);
        }
    },

    renderizarConfirmacion(soliData) {
        const modalTitulo = document.getElementById('modal-dinamico-titulo');
        const modalBody = document.getElementById('modal-dinamico-body');
        
        if (!modalTitulo || !modalBody) return;

        modalTitulo.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> Confirmar Aplicación de Examen';

        const divContainer = document.createElement('div');
        divContainer.className = 'modulo-confirmar-examen';
        
        divContainer.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px;">
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.6;">
                    El examen de <strong>${soliData.aspiranteNombre || 'el aspirante'}</strong> estaba programado. 
                    Por favor, confirme que el examen se aplicó correctamente para habilitar la captura de calificaciones.
                </p>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 25px;">
                <button type="button" class="modal-btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'">Cancelar</button>
                <button type="button" class="modal-btn-primary" id="btn-confirmar-aplicacion">Confirmar Aplicación</button>
            </div>
        `;

        modalBody.appendChild(divContainer);

        const btnConfirmar = divContainer.querySelector('#btn-confirmar-aplicacion');
        btnConfirmar.addEventListener('click', () => this.confirmarAplicacion(soliData.idSolicitud || soliData.id));
    },

    async confirmarAplicacion(idSolicitud) {
        if (!idSolicitud) return;
        try {
            const btn = document.getElementById('btn-confirmar-aplicacion');
            if (btn) { btn.disabled = true; btn.innerText = 'Confirmando...'; }
            const response = await fetch(`/api/programacion-examen/confirmar/${idSolicitud}`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Confirmado', text: data.mensaje, timer: 1500 });
                document.getElementById('modal-docente-dinamico').style.display = 'none';
                if (typeof cargarSolicitudesDocente === 'function') { cargarSolicitudesDocente(); }
                if (typeof cargarSolicitudesHistoricas === 'function') { cargarSolicitudesHistoricas(); }
            } else {
                throw new Error(data.mensaje || 'Error al confirmar la aplicación del examen.');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        } finally {
            const btn = document.getElementById('btn-confirmar-aplicacion');
            if (btn) { btn.disabled = false; btn.innerText = 'Confirmar Aplicación'; }
        }
    },

    renderizarProgramacion(soliData) {
        const modalTitulo = document.getElementById('modal-dinamico-titulo');
        const modalBody = document.getElementById('modal-dinamico-body');
        
        if (!modalTitulo || !modalBody) return;

        modalTitulo.innerHTML = soliData.modoReprogramar ? '<i class="fa-solid fa-pen-to-square"></i> Reprogramar Examen' : '<i class="fa-solid fa-calendar-check"></i> Programar Examen';

        // Crear contenedor para el módulo
        const divContainer = document.createElement('div');
        divContainer.className = 'modulo-programacion-examen';
        
        divContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p>${soliData.modoReprogramar ? 'Actualice' : 'Programe'} la fecha, hora y lugar del examen para el aspirante <strong>${soliData.aspiranteNombre || 'Seleccionado'}</strong>.</p>
            </div>
            
            <form id="form-programar-examen" onsubmit="event.preventDefault();">
                <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="flex: 1 1 200px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Fecha del Examen *</label>
                        <input type="date" id="prog-examen-fecha" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1 1 200px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Hora del Examen *</label>
                        <input type="time" id="prog-examen-hora" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Lugar (Aula, Link de Zoom, etc.) *</label>
                    <input type="text" id="prog-examen-lugar" class="form-control" placeholder="Ej: Aula 3, Edificio A" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Observaciones (Opcional)</label>
                    <textarea id="prog-examen-observaciones" class="form-control" rows="3" placeholder="Instrucciones adicionales para el aspirante" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="modal-btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'">Cancelar</button>
                    <button type="button" class="modal-btn-primary" id="btn-guardar-programacion">${soliData.modoReprogramar ? 'Actualizar Programación' : 'Guardar Programación'}</button>
                </div>
            </form>
        `;

        modalBody.appendChild(divContainer);

        // Pre-cargar datos si ya existían
        this.cargarDatosActualesProgramacion(soliData.idSolicitud || soliData.id);

        // Binding del botón guardar
        const btnGuardar = divContainer.querySelector('#btn-guardar-programacion');
        btnGuardar.addEventListener('click', () => this.guardarProgramacion(soliData.idSolicitud || soliData.id));
    },

    renderizarCaptura(soliData) {
        const modalTitulo = document.getElementById('modal-dinamico-titulo');
        const modalBody = document.getElementById('modal-dinamico-body');
        
        if (!modalTitulo || !modalBody) return;

        modalTitulo.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Capturar Resultado';

        // Crear contenedor para el módulo
        const divContainer = document.createElement('div');
        divContainer.className = 'modulo-capturar-examen';
        
        const posgradoHTML = soliData.posgradoNombre ? `<strong>Posgrado:</strong> ${soliData.posgradoNombre}<br>` : '';
        const especialidadHTML = (soliData.opcionNombre || soliData.opcionElegida) ? `<strong>Especialidad:</strong> ${soliData.opcionNombre || soliData.opcionElegida}<br>` : '';

        divContainer.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px;">
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.6;">
                    <strong>Aspirante:</strong> ${soliData.aspiranteNombre || ''}<br>
                    ${posgradoHTML}
                    ${especialidadHTML}
                </p>
                <p style="margin: 12px 0 0 0; font-size: 0.9rem; color: var(--color-text-muted);">
                    Ingrese la calificación final y el dictamen a continuación.
                </p>
            </div>
            
            <form id="form-capturar-examen" onsubmit="event.preventDefault();">
                <div id="contenedor-evaluacion-temas-${soliData.idSolicitud || soliData.id}"></div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Promedio Final</label>
                        <input type="text" id="cap-examen-calificacion" class="form-control" readonly placeholder="Se calcula automáticamente" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box; cursor: not-allowed; font-weight: bold;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Dictamen Final *</label>
                        <select id="cap-examen-aprobado" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                            <option value="">Seleccione...</option>
                            <option value="1">Aprobado</option>
                            <option value="0">No Aprobado</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Observaciones (Opcional)</label>
                    <textarea id="cap-examen-observaciones" class="form-control" rows="3" placeholder="Comentarios sobre el desempeño en el examen" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="modal-btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'">Cancelar</button>
                    <button type="button" class="modal-btn-primary" id="btn-guardar-captura">Guardar Resultado</button>
                </div>
            </form>
        `;

        modalBody.appendChild(divContainer);

        // Renderizar Evaluación por Temas
        if (typeof EvaluacionTemasHelper !== 'undefined') {
            EvaluacionTemasHelper.renderizar(soliData.idSolicitud || soliData.id, document.getElementById(`contenedor-evaluacion-temas-${soliData.idSolicitud || soliData.id}`));
        }

        // Binding del botón guardar
        const btnGuardar = divContainer.querySelector('#btn-guardar-captura');
        btnGuardar.addEventListener('click', () => this.guardarCaptura(soliData.idSolicitud || soliData.id));
    },

    async cargarDatosActualesProgramacion(idSolicitud) {
        if (!idSolicitud) return;
        const datos = await moduloProgramacionExamenAPI.obtenerDatos(idSolicitud);
        if (datos && datos.existe) {
            document.getElementById('prog-examen-fecha').value = datos.fecha ? datos.fecha.split('T')[0] : '';
            document.getElementById('prog-examen-hora').value = datos.hora || '';
            document.getElementById('prog-examen-lugar').value = datos.lugar || '';
            document.getElementById('prog-examen-observaciones').value = datos.observaciones || '';
        }
    },

    async guardarProgramacion(idSolicitud) {
        const fecha = document.getElementById('prog-examen-fecha').value;
        const hora = document.getElementById('prog-examen-hora').value;
        const lugar = document.getElementById('prog-examen-lugar').value;
        const observaciones = document.getElementById('prog-examen-observaciones').value;

        if (!fecha || !hora || !lugar) {
            Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Por favor complete fecha, hora y lugar.', confirmButtonColor: '#f59e0b' });
            return;
        }

        try {
            const btn = document.getElementById('btn-guardar-programacion');
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            await moduloProgramacionExamenAPI.guardarProgramacion(idSolicitud, {
                fecha, hora, lugar, observaciones
            });

            Swal.fire({ icon: 'success', title: 'Éxito', text: 'Examen programado con éxito.', timer: 1500, showConfirmButton: false });
            document.getElementById('modal-docente-dinamico').style.display = 'none';

            window.dispatchEvent(new CustomEvent('moduloCompletado', { detail: { accion: 'PROGRAMAR_EXAMEN' } }));
            
            if (typeof cargarTablaExamenesPorCodigo === 'function') {
                cargarTablaExamenesPorCodigo('EXAMEN');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Ocurrió un error al programar el examen', confirmButtonColor: '#ef4444' });
        } finally {
            const btn = document.getElementById('btn-guardar-programacion');
            if(btn) {
                btn.disabled = false;
                btn.innerText = 'Guardar Programación';
            }
        }
    },

    async guardarCaptura(idSolicitud) {
        const calificacionVal = document.getElementById('cap-examen-calificacion').value;
        const aprobadoVal = document.getElementById('cap-examen-aprobado').value;
        const observaciones = document.getElementById('cap-examen-observaciones').value;

        if (aprobadoVal === '') {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Por favor seleccione un dictamen final (Aprobado/No Aprobado).', confirmButtonColor: '#f59e0b' });
            return;
        }

        if (typeof EvaluacionTemasHelper !== 'undefined' && !EvaluacionTemasHelper.validarTodosEvaluados(idSolicitud)) {
            Swal.fire({ icon: 'warning', title: 'Evaluación Pendiente', text: 'Por favor, guarda la calificación de todos los temas antes de finalizar.', confirmButtonColor: '#f59e0b' });
            return;
        }

        const calificacion = calificacionVal ? parseInt(calificacionVal, 10) : null;
        const aprobado = aprobadoVal === '1';

        try {
            const btn = document.getElementById('btn-guardar-captura');
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            await moduloProgramacionExamenAPI.capturarResultado(idSolicitud, {
                calificacion, aprobado, observaciones
            });

            Swal.fire({ icon: 'success', title: 'Éxito', text: 'Resultado capturado con éxito.', timer: 1500, showConfirmButton: false });
            document.getElementById('modal-docente-dinamico').style.display = 'none';

            window.dispatchEvent(new CustomEvent('moduloCompletado', { detail: { accion: 'CAPTURAR_RESULTADO_EXAMEN' } }));
            
            if (typeof cargarTablaExamenesPorCodigo === 'function') {
                cargarTablaExamenesPorCodigo('EXAMEN');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Ocurrió un error al capturar resultado', confirmButtonColor: '#ef4444' });
        } finally {
            const btn = document.getElementById('btn-guardar-captura');
            if(btn) {
                btn.disabled = false;
                btn.innerText = 'Guardar Resultado';
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloProgramacionExamenDocenteRenderer;
}
