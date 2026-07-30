const moduloProgramacionExamenDocenteRenderer = {
    renderizar(soliData) {
        const modalTitulo = document.getElementById('modal-dinamico-titulo');
        const modalBody = document.getElementById('modal-dinamico-body');
        
        if (!modalTitulo || !modalBody) return;

        modalTitulo.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Programar Examen';

        // Crear contenedor para el módulo
        const divContainer = document.createElement('div');
        divContainer.className = 'modulo-programacion-examen';
        
        divContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p>Programe la fecha, hora y lugar del examen para el aspirante <strong>${soliData.aspiranteNombre || 'Seleccionado'}</strong>.</p>
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
                    <button type="button" class="btn-primary" id="btn-guardar-programacion" style="padding: 10px 20px; border-radius: 6px; font-weight: 600; border: none;">Guardar Programación</button>
                </div>
            </form>
        `;

        modalBody.appendChild(divContainer);

        // Pre-cargar datos si ya existían (opcional, por si queremos permitir edición)
        this.cargarDatosActuales(soliData.idSolicitud || soliData.id);

        // Binding del botón guardar
        const btnGuardar = divContainer.querySelector('#btn-guardar-programacion');
        btnGuardar.addEventListener('click', () => this.guardarProgramacion(soliData.idSolicitud || soliData.id));
    },

    async cargarDatosActuales(idSolicitud) {
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
            alert("Por favor complete fecha, hora y lugar.");
            return;
        }

        try {
            const btn = document.getElementById('btn-guardar-programacion');
            btn.disabled = true;
            btn.innerText = 'Guardando...';

            await moduloProgramacionExamenAPI.guardarProgramacion(idSolicitud, {
                fecha, hora, lugar, observaciones
            });

            alert("Examen programado con éxito.");
            document.getElementById('modal-docente-dinamico').style.display = 'none';

            // Disparar evento para que el orquestador recargue la tabla si lo desea
            window.dispatchEvent(new CustomEvent('moduloCompletado', { detail: { accion: 'PROGRAMAR_EXAMEN' } }));
            
            // Recargar la tabla si estamos en docente
            if (typeof cargarTablaExamenesAPI === 'function') {
                cargarTablaExamenesAPI('en_examen');
            }
        } catch (error) {
            alert(error.message);
        } finally {
            const btn = document.getElementById('btn-guardar-programacion');
            if(btn) {
                btn.disabled = false;
                btn.innerText = 'Guardar Programación';
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloProgramacionExamenDocenteRenderer;
}
