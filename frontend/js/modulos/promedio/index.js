const moduloPromedio = {
    async ejecutar(soliData, accion) {
        const idSolicitud = soliData.idSolicitud || soliData.id;
        const datosPromedio = await moduloPromedioAPI.obtenerDetalle(idSolicitud);
        moduloPromedioRenderer.renderizar(soliData, datosPromedio);
    },

    async auditarPromedio(idSolicitud, onSuccessCallback) {
        try {
            mostrarLoader();
            const datosDetalle = await moduloPromedioAPI.obtenerDetalle(idSolicitud);
            ocultarLoader();

            if (!datosDetalle || !datosDetalle.success) {
                Swal.fire('Error', 'No se pudieron cargar los datos de la solicitud.', 'error');
                return;
            }

            const modal = document.getElementById('modal-docente-dinamico');
            if (modal) modal.style.display = 'flex';

            moduloPromedioRenderer.renderizarModalDocente({
                idSolicitud,
                datosDetalle,
                onGuardar: async (payload) => {
                    mostrarLoader();
                    const resultado = await moduloPromedioAPI.guardarDictamen(payload);
                    ocultarLoader();

                    if (resultado && resultado.success) {
                        cerrarModalDinamico();
                        Swal.fire({
                            icon: 'success',
                            title: '¡Dictamen Guardado!',
                            text: resultado.mensaje || 'Se ha actualizado el dictamen de promedio exitosamente.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        if (typeof onSuccessCallback === 'function') {
                            onSuccessCallback();
                        }
                    } else {
                        Swal.fire('Error', resultado.mensaje || 'No se pudo guardar el dictamen.', 'error');
                    }
                }
            });
        } catch (e) {
            ocultarLoader();
            console.error("Error en moduloPromedio.auditarPromedio:", e);
            Swal.fire('Error', 'Ocurrió un error inesperado al abrir la auditoría.', 'error');
        }
    }
};
