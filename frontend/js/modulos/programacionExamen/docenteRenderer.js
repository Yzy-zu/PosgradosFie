const moduloProgramacionExamenDocenteRenderer = {
    renderizar(soliData) {
        if (soliData.accionActiva === 'CAPTURAR_RESULTADO_EXAMEN' || soliData.accionActiva === 'HABILITAR_CAPTURA_RESULTADO') {
            this.renderizarCaptura(soliData);
        } else {
            this.renderizarProgramacion(soliData);
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
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Fecha del Examen *</label>
                        <input type="date" id="prog-examen-fecha" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1;">
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
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'" style="padding: 10px 20px; border-radius: 6px; font-weight: 600;">Cancelar</button>
                    <button type="button" class="btn-primary" id="btn-guardar-programacion" style="padding: 10px 20px; border-radius: 6px; font-weight: 600; border: none;">${soliData.modoReprogramar ? 'Actualizar Programación' : 'Guardar Programación'}</button>
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
        
        divContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p>Ingrese la calificación final y el dictamen para el aspirante <strong>${soliData.aspiranteNombre || 'Seleccionado'}</strong>.</p>
            </div>
            
            <form id="form-capturar-examen" onsubmit="event.preventDefault();">
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Calificación (Opcional)</label>
                        <input type="number" id="cap-examen-calificacion" class="form-control" step="0.01" min="0" max="100" placeholder="Ej: 85.50" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
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
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'" style="padding: 10px 20px; border-radius: 6px; font-weight: 600;">Cancelar</button>
                    <button type="button" class="btn-primary" id="btn-guardar-captura" style="padding: 10px 20px; border-radius: 6px; font-weight: 600; border: none;">Guardar Resultado</button>
                </div>
            </form>
        `;

        modalBody.appendChild(divContainer);

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

        const calificacion = calificacionVal ? parseFloat(calificacionVal) : null;
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
