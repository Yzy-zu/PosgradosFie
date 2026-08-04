const moduloCursoDocenteRenderer = {
    renderizar(soliData) {
        if (soliData.accionActiva === 'CAPTURAR_RESULTADO_PROPEDEUTICO' || soliData.accionActiva === 'CAPTURAR_RESULTADO_CURSO' || soliData.modoCapturar) {
            this.renderizarCaptura(soliData);
        } else {
            this.renderizarProgramacion(soliData);
        }
    },

    renderizarProgramacion(soliData) {
        const modalTitulo = document.getElementById('modal-dinamico-titulo');
        const modalBody = document.getElementById('modal-dinamico-body');
        
        if (!modalTitulo || !modalBody) return;

        modalTitulo.innerHTML = soliData.modoReprogramar 
            ? '<i class="fa-solid fa-pen-to-square"></i> Reprogramar Curso Propedéutico' 
            : '<i class="fa-solid fa-calendar-check"></i> Programar Curso Propedéutico';

        const divContainer = document.createElement('div');
        divContainer.className = 'modulo-programacion-curso';
        
        divContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p>${soliData.modoReprogramar ? 'Actualice' : 'Programe'} las fechas y el aula del curso propedéutico para el aspirante <strong>${soliData.aspiranteNombre || 'Seleccionado'}</strong>.</p>
            </div>
            
            <form id="form-programar-curso" onsubmit="event.preventDefault();">
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Fecha de Inicio *</label>
                        <input type="date" id="prog-curso-fecha-inicio" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Fecha de Fin *</label>
                        <input type="date" id="prog-curso-fecha-fin" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Aula / Salón *</label>
                    <input type="text" id="prog-curso-aula" class="form-control" placeholder="Ej: Laboratorio 2, Edificio B" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Observaciones (Opcional)</label>
                    <textarea id="prog-curso-observaciones" class="form-control" rows="3" placeholder="Instrucciones adicionales para el aspirante" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="modal-btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'">Cancelar</button>
                    <button type="button" class="modal-btn-primary" id="btn-guardar-programacion-curso">${soliData.modoReprogramar ? 'Actualizar Programación' : 'Guardar Programación'}</button>
                </div>
            </form>
        `;

        modalBody.appendChild(divContainer);

        // Pre-cargar datos si ya existían
        this.cargarDatosActualesProgramacion(soliData.idSolicitud || soliData.id);

        // Binding del botón guardar
        const btnGuardar = divContainer.querySelector('#btn-guardar-programacion-curso');
        btnGuardar.addEventListener('click', () => this.guardarProgramacion(soliData.idSolicitud || soliData.id));
    },

    renderizarCaptura(soliData) {
        const modalTitulo = document.getElementById('modal-dinamico-titulo');
        const modalBody = document.getElementById('modal-dinamico-body');
        
        if (!modalTitulo || !modalBody) return;

        modalTitulo.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Capturar Resultado de Curso Propedéutico';

        const divContainer = document.createElement('div');
        divContainer.className = 'modulo-capturar-curso';
        
        divContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p>Ingrese la calificación final y el dictamen para el aspirante <strong>${soliData.aspiranteNombre || 'Seleccionado'}</strong>.</p>
            </div>
            
            <form id="form-capturar-curso" onsubmit="event.preventDefault();">
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Calificación (Opcional)</label>
                        <input type="number" id="cap-curso-calificacion" class="form-control" step="0.01" min="0" max="100" placeholder="Ej: 90.00" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Dictamen Final *</label>
                        <select id="cap-curso-aprobado" class="form-control" required style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box;">
                            <option value="">Seleccione...</option>
                            <option value="1">Aprobado</option>
                            <option value="0">No Aprobado</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--color-text-muted); font-size: 0.9rem;">Observaciones (Opcional)</label>
                    <textarea id="cap-curso-observaciones" class="form-control" rows="3" placeholder="Comentarios sobre el desempeño en el propedéutico" style="width: 100%; padding: 10px 12px; background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="modal-btn-secondary" onclick="document.getElementById('modal-docente-dinamico').style.display='none'">Cancelar</button>
                    <button type="button" class="modal-btn-primary" id="btn-guardar-captura-curso">Guardar Resultado</button>
                </div>
            </form>
        `;

        modalBody.appendChild(divContainer);

        const btnGuardar = divContainer.querySelector('#btn-guardar-captura-curso');
        btnGuardar.addEventListener('click', () => this.guardarCaptura(soliData.idSolicitud || soliData.id));
    },

    async cargarDatosActualesProgramacion(idSolicitud) {
        if (!idSolicitud) return;
        const datos = await moduloCursoAPI.obtenerDatosProgramacion(idSolicitud);
        if (datos && datos.existe) {
            document.getElementById('prog-curso-fecha-inicio').value = datos.fechaInicio ? datos.fechaInicio.split('T')[0] : '';
            document.getElementById('prog-curso-fecha-fin').value = datos.fechaFin ? datos.fechaFin.split('T')[0] : '';
            document.getElementById('prog-curso-aula').value = datos.aula || '';
            document.getElementById('prog-curso-observaciones').value = datos.observaciones || '';
        }
    },

    async guardarProgramacion(idSolicitud) {
        const fechaInicio = document.getElementById('prog-curso-fecha-inicio').value;
        const fechaFin = document.getElementById('prog-curso-fecha-fin').value;
        const aula = document.getElementById('prog-curso-aula').value;
        const observaciones = document.getElementById('prog-curso-observaciones').value;

        if (!fechaInicio || !fechaFin || !aula) {
            Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Por favor complete fecha de inicio, fecha de fin y aula.', confirmButtonColor: '#f59e0b' });
            return;
        }

        try {
            const btn = document.getElementById('btn-guardar-programacion-curso');
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            await moduloCursoAPI.guardarProgramacion(idSolicitud, {
                fechaInicio, fechaFin, aula, observaciones
            });

            Swal.fire({ icon: 'success', title: 'Éxito', text: 'Curso propedéutico programado con éxito.', timer: 1500, showConfirmButton: false });
            document.getElementById('modal-docente-dinamico').style.display = 'none';

            window.dispatchEvent(new CustomEvent('moduloCompletado', { detail: { accion: 'PROGRAMAR_CURSO' } }));
            
            if (typeof cargarTablaPropedeuticoPorCodigo === 'function') {
                cargarTablaPropedeuticoPorCodigo('PROPEDEUTICO');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Ocurrió un error al programar el curso', confirmButtonColor: '#ef4444' });
        } finally {
            const btn = document.getElementById('btn-guardar-programacion-curso');
            if(btn) {
                btn.disabled = false;
                btn.innerText = 'Guardar Programación';
            }
        }
    },

    async guardarCaptura(idSolicitud) {
        const calificacionVal = document.getElementById('cap-curso-calificacion').value;
        const aprobadoVal = document.getElementById('cap-curso-aprobado').value;
        const observaciones = document.getElementById('cap-curso-observaciones').value;

        if (aprobadoVal === '') {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Por favor seleccione un dictamen final (Aprobado/No Aprobado).', confirmButtonColor: '#f59e0b' });
            return;
        }

        const calificacion = calificacionVal !== '' ? parseFloat(calificacionVal) : null;
        const aprobado = aprobadoVal === '1';

        try {
            const btn = document.getElementById('btn-guardar-captura-curso');
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            await moduloCursoAPI.capturarResultado(idSolicitud, {
                calificacion, aprobado, observaciones
            });

            Swal.fire({ icon: 'success', title: 'Éxito', text: 'Resultado de propedéutico capturado con éxito.', timer: 1500, showConfirmButton: false });
            document.getElementById('modal-docente-dinamico').style.display = 'none';

            window.dispatchEvent(new CustomEvent('moduloCompletado', { detail: { accion: 'CAPTURAR_RESULTADO_CURSO' } }));
            
            if (typeof cargarTablaPropedeuticoPorCodigo === 'function') {
                cargarTablaPropedeuticoPorCodigo('PROPEDEUTICO');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Ocurrió un error al capturar resultado', confirmButtonColor: '#ef4444' });
        } finally {
            const btn = document.getElementById('btn-guardar-captura-curso');
            if(btn) {
                btn.disabled = false;
                btn.innerText = 'Guardar Resultado';
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloCursoDocenteRenderer;
}
