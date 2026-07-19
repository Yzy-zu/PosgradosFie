// Variables globales
let nivelAcademicoSeleccionado = null;
let estacionActual = 0;
let aspiranteData = null; // Almacenará los datos de la BD del aspirante
let currentSolicitudId = null;

// Comprobación de Sesión y Estado de Registro al inicializar la página
document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem('token');
    const usuarioStr = sessionStorage.getItem('usuario');
    const programaElegido = sessionStorage.getItem('programaPendiente');

    if (!token || !usuarioStr) {
        // Redirigir al login si se accede directamente a aspirante.html sin sesión
        window.location.href = "login.html";
        return;
    }

    const usuario = JSON.parse(usuarioStr);
    const saludo = document.getElementById('saludo-usuario');

    // Obtener datos del aspirante real
    try {
        const resAspirantes = await fetch('/api/aspirante');
        if (resAspirantes.ok) {
            const listaAspirantes = await resAspirantes.json();
            // Buscar aspirante por idUsuario
            aspiranteData = listaAspirantes.find(a => a.idUsuario === usuario.id);

            if (aspiranteData) {
                if (saludo) saludo.innerText = `Hola Bienvenid@, ${aspiranteData.nombre} ${aspiranteData.primerApellido}`;

                // Actualizar menú de perfil
                const lblNombre = document.getElementById('perfil-nombre');
                const lblCorreo = document.getElementById('perfil-correo');
                const lblTelefono = document.getElementById('perfil-telefono');

                if (lblNombre) lblNombre.innerText = `${aspiranteData.nombre} ${aspiranteData.primerApellido} ${aspiranteData.segundoApellido}`;
                if (lblCorreo) lblCorreo.innerText = aspiranteData.correo;
                if (lblTelefono) lblTelefono.innerText = aspiranteData.telefono;

                // Cargar modalidades de admisión dinámicas
                cargarModalidadesAdmision();

                // --- RESTAURAR SESION DE SOLICITUD (HIDRATACIÓN) ---
                try {
                    const resSoli = await fetch(`/api/solicitud/activa/${aspiranteData.id}`);
                    if (resSoli.ok) {
                        const soliData = await resSoli.json();
                        if (soliData.existe) {
                            // Hidratamos la UI del usuario desde el Backend
                            hidratarUI(soliData);
                            
                            // Render initial route
                            const currentHash = window.location.hash.replace('#', '');
                            if (!currentHash) {
                                window.location.hash = soliData.estacion_actual > 0 ? 'documentos' : 'inicio';
                            } else {
                                switchView(currentHash);
                            }
                            
                            // Ocultamos el loader inicial si hubiera
                            ocultarLoader();
                            return; // Salimos para no ejecutar el código de abajo
                        }
                    }
                } catch (e) {
                    console.error("Error al buscar solicitud activa:", e);
                }
                // -------------------------------------

            } else {
                if (saludo) saludo.innerText = `Hola Bienvenid@, Aspirante`;
            }
        }
    } catch (e) {
        console.error("Error obteniendo datos del aspirante:", e);
    }

    // Activar módulos si venía de un redireccionamiento y no se reanudó nada arriba
    if (programaElegido) {
        activarModulosPostRegistro(programaElegido);
    }

    // Render initial route if not handled by hydration return
    const fallbackHash = window.location.hash.replace('#', '');
    if (!fallbackHash) {
        window.location.hash = 'inicio';
    } else {
        switchView(fallbackHash);
    }
});

// ==== MANEJO DE ESTADO Y UX (GLOBAL LOADER) ====
function mostrarLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('active');
}

function ocultarLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('active');
}

/**
 * Control del cambio de paneles (Navegación lateral con Hash Router)
 */
function switchView(viewId) {
    if (window.location.hash !== `#${viewId}`) {
        window.location.hash = viewId;
        return; // El evento onhashchange se encargará de hacer el render
    }

    // Ocultar todas las secciones de contenido
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('fade-in');
    });

    // Mostrar la sección seleccionada con fade-in
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        // Forzar un reflow para que la animación se reinicie
        void targetSection.offsetWidth;
        targetSection.classList.add('fade-in');
    }

    // Actualizar estados visuales en la barra de navegación lateral
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetNavLink = document.getElementById(`nav-${viewId}`);
    if (targetNavLink) {
        targetNavLink.classList.add('active');
    }

    // Cargar notificaciones si se abre esa vista
    if (viewId === 'notificaciones') {
        cargarNotificaciones();
    }
}

// Router Event Listener
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'inicio';
    switchView(hash);
});

/**
 * Carga las notificaciones desde la API
 */
async function cargarNotificaciones() {
    const contenedor = document.getElementById('contenedor-notificaciones');
    if (!contenedor) return;

    // Estado de carga inicial
    contenedor.innerHTML = '<div class="card"><p>Cargando notificaciones...</p></div>';

    try {
        const res = await fetch('/api/notificaciones', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (res.ok) {
            const notificaciones = await res.json();
            if (!notificaciones || notificaciones.length === 0) {
                contenedor.innerHTML = '<div class="card"><p>No tienes notificaciones nuevas.</p></div>';
            } else {
                let html = '';
                notificaciones.forEach(notif => {
                    html += `
                    <div class="card" style="margin-bottom: 10px;">
                        <p><strong><i class="fa-solid fa-bell" style="color: #8a1c24;"></i> ${notif.nombre}:</strong> ${notif.mensaje}</p>
                    </div>`;
                });
                contenedor.innerHTML = html;
            }
        } else {
            // Error o endpoint no existe
            contenedor.innerHTML = '<div class="card"><p><strong><i class="fa-solid fa-triangle-exclamation" style="color: #e67e22;"></i> Sistema FIE:</strong> Las notificaciones no están disponibles por el momento.</p></div>';
        }
    } catch (e) {
        // Fallback por si la API aún no está implementada por el backend
        console.warn("Ocurrio un error al obtener notificaciones:", e);
        contenedor.innerHTML = '<div class="card"><p><strong><i class="fa-solid fa-triangle-exclamation" style="color: #e67e22;"></i> Sistema FIE:</strong> Recuerda verificar las fechas límite del calendario de admisiones. (Modo Offline)</p></div>';
    }
}

/**
 * Flujo: Al dar clic en Maestría o Doctorado desde el panel principal deslogueado
 */
function seleccionarPrograma(nombrePrograma) {
    const token = sessionStorage.getItem('token');
    const usuario = sessionStorage.getItem('usuario');

    // SI NO HA INICIADO SESIÓN (Es un aspirante nuevo o sin credenciales activas)
    if (!token || !usuario) {
        alert(`Para postularte a la ${nombrePrograma} debes confirmar tus credenciales de registro. Redirigiendo...`);

        // Guardamos temporalmente qué programa seleccionó
        sessionStorage.setItem('programaPendiente', nombrePrograma);

        // Lo mandamos al formulario de registro limpio (registro.html)
        window.location.href = "registro.html";
    } else {
        // SI YA TIENE CUENTA E INICIÓ SESIÓN: Desbloquea y activa los módulos en el acto
        sessionStorage.setItem('programaPendiente', nombrePrograma);
        activarModulosPostRegistro(nombrePrograma);
    }
}

/**
 * Modifica la lista de convocatorias e inyecta la lógica adaptativa según el nivel (Maestría / Doctorado)
 */
async function activarModulosPostRegistro(nombrePrograma) {
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'none';
        navDocumentos.classList.add('hidden');
    }

    const panelSeleccion = document.getElementById('seleccion-programa');
    const panelListaAbierta = document.getElementById('lista-programas-abiertos');
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas-programas');

    if (panelSeleccion) panelSeleccion.style.display = 'none';
    if (panelListaAbierta) panelListaAbierta.style.display = 'block';

    if (contenedorTarjetas) {
        contenedorTarjetas.innerHTML = "<p>Cargando convocatorias...</p>";
        let htmlConvocatorias = '';
        let nivel = nombrePrograma.includes('Doctorado') ? 'DOCTORADO' : 'MAESTRIA';
        nivelAcademicoSeleccionado = nivel === 'DOCTORADO' ? 'Doctorado' : 'Maestría';

        try {
            const respuesta = await fetch('/api/convocatorias');
            if (respuesta.ok) {
                const convocatorias = await respuesta.json();
                const activas = convocatorias.filter(c => c.estado === 'Activa' && c.tipo === nivel);

                htmlConvocatorias = `<h3>Oferta Académica Desbloqueada: ${nivel === 'DOCTORADO' ? 'Doctorados' : 'Maestrías'} FIE</h3><br>`;
                if (activas.length === 0) {
                    htmlConvocatorias += `<p style="color: #555;">No hay convocatorias abiertas en este momento para este nivel.</p>`;
                } else {
                    activas.forEach(c => {
                        // Formatear fechas
                        const fechaCierre = new Date(c.fecha_fin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

                        htmlConvocatorias += `
                            <div class="convocatoria-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                                <h4>${c.nombre}</h4>
                                <p style="margin: 5px 0; color: #555; font-size: 0.95rem;"><strong>${c.posgrado_nombre || ''}</strong></p>
                                <p style="margin: 5px 0; color: #555;">${c.descripcion || 'Sin descripción disponible.'}</p>
                                <p style="font-size: 14px; color: #8a1c24; margin-bottom: 10px;"><strong>Estado:</strong> Abierta | <strong>Cierre:</strong> ${fechaCierre}</p>
                                <button class="btn-primary" style="width:auto; padding:6px 15px; font-size:13px;" onclick="prepararFlujoEstaciones('${nivelAcademicoSeleccionado}', ${c.id})">Iniciar Proceso de Registro</button>
                            </div>
                        `;
                    });
                }
            } else {
                htmlConvocatorias = `<p>Error al cargar convocatorias.</p>`;
            }
        } catch (error) {
            console.error("Error al obtener convocatorias:", error);
            htmlConvocatorias = `<p>Error de conexión al cargar convocatorias.</p>`;
        }

        contenedorTarjetas.innerHTML = htmlConvocatorias;
    }

    // Ejecutar actualización de gráficas inicial si existen los elementos
    if (document.getElementById('grafica-pastel')) {
        actualizarGraficaProceso();
    }
}

/**
 * Reconfigura los textos y despliega los formularios correctos según la herencia de datos
 */
async function prepararFlujoEstaciones(nivel, idConvocatoria) {
    if (!aspiranteData) {
        alert("No se pudo cargar la información del aspirante. Intente recargar.");
        return;
    }

    // Crear Solicitud en la base de datos
    try {
        const respuestaSoli = await fetch('/api/solicitud/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idAspi: aspiranteData.id,
                idC: idConvocatoria
            })
        });

        if (respuestaSoli.ok) {
            const dataSoli = await respuestaSoli.json();
            currentSolicitudId = dataSoli.idSolicitud;
            bloquearConvocatorias();
        } else if (respuestaSoli.status === 409) {
            const errData = await respuestaSoli.json();
            alert(errData.mensaje);
            return;
        } else {
            alert("Hubo un error al crear la solicitud en el servidor.");
            return;
        }
    } catch (e) {
        console.error(e);
        alert("Fallo de conexión al crear solicitud.");
        return;
    }

    if (idConvocatoria) sessionStorage.setItem('idConvocatoriaPendiente', idConvocatoria);
    nivelAcademicoSeleccionado = nivel;

    // Mostrar pestaña de Documentos ahora que ya seleccionó convocatoria
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block';
        navDocumentos.classList.remove('hidden');
    }

    // Elementos generales
    const titulo = document.getElementById('titulo-flujo-documentos');
    const boxCostos = document.getElementById('box-costos-desglose');

    if (nivel === "Doctorado") {
        if (titulo) titulo.innerText = "Continuidad de Expediente Académico: Doctorado FIE";

        // Ajustar labels del Stepper
        if (document.getElementById('lbl-step-1')) document.getElementById('lbl-step-1').innerText = "CV (Heredado)";
        if (document.getElementById('lbl-step-2')) document.getElementById('lbl-step-2').innerText = "Propuesta Proyecto";
        if (document.getElementById('lbl-step-3')) document.getElementById('lbl-step-3').innerText = "Idioma / Cartas";
        if (document.getElementById('lbl-step-4')) document.getElementById('lbl-step-4').innerText = "Entrevista Sínodo";

        // Cambiar paneles visibles dentro de las estaciones
        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'none';
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'block';
        if (document.getElementById('grid-maestria-2')) document.getElementById('grid-maestria-2').style.display = 'none';
        if (document.getElementById('grid-doctorado-2')) document.getElementById('grid-doctorado-2').style.display = 'block';
        if (document.getElementById('grid-maestria-3')) document.getElementById('grid-maestria-3').style.display = 'none';
        if (document.getElementById('grid-doctorado-3')) document.getElementById('grid-doctorado-3').style.display = 'block';
        if (document.getElementById('grid-maestria-4')) document.getElementById('grid-maestria-4').style.display = 'none';
        if (document.getElementById('grid-doctorado-4')) document.getElementById('grid-doctorado-4').style.display = 'block';

        if (boxCostos) {
            boxCostos.innerHTML = `
                <h4>Aranceles y Conceptos de Pago (Doctorado)</h4>
                <div class="costo-linea"><span style="color:#27ae60;">✓ Exención por Continuidad FIE:</span> <strong>$ 0.00 MXN</strong></div>
                <small style="color:#777;">Al ser egresado directo del posgrado FIE, los derechos de examen interno quedan exentos.</small>
            `;
        }

        if (document.getElementById('btn-next-0')) {
            document.getElementById('btn-next-0').disabled = true;
        }
    } else {
        // Restaurar estado inicial de Maestría
        if (titulo) titulo.innerText = "Seguimiento de Trámites y Requisitos de Ingreso";
        if (document.getElementById('lbl-step-1')) document.getElementById('lbl-step-1').innerText = "Personales";
        if (document.getElementById('lbl-step-2')) document.getElementById('lbl-step-2').innerText = "Académicos";
        if (document.getElementById('lbl-step-3')) document.getElementById('lbl-step-3').innerText = "Cartas";
        if (document.getElementById('lbl-step-4')) document.getElementById('lbl-step-4').innerText = "CENEVAL";

        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'block';
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'none';
        if (document.getElementById('grid-maestria-2')) document.getElementById('grid-maestria-2').style.display = 'flex';
        if (document.getElementById('grid-doctorado-2')) document.getElementById('grid-doctorado-2').style.display = 'none';
        if (document.getElementById('grid-maestria-3')) document.getElementById('grid-maestria-3').style.display = 'flex';
        if (document.getElementById('grid-doctorado-3')) document.getElementById('grid-doctorado-3').style.display = 'none';
        if (document.getElementById('grid-maestria-4')) document.getElementById('grid-maestria-4').style.display = 'block';
        if (document.getElementById('grid-doctorado-4')) document.getElementById('grid-doctorado-4').style.display = 'none';

        if (document.getElementById('btn-next-0')) {
            document.getElementById('btn-next-0').disabled = false;
        }
        actualizarCostosAdmision();
    }

    // Cargar Requisitos Documentales para la estación 1 basados en la convocatoria
    if (idConvocatoria) {
        cargarRequisitosDocumentales(idConvocatoria);
    }

    // Redirigir a la vista de documentos
    switchView('documentos');
}

/**
 * LÓGICA DE LAS ESTACIONES (STEPPER) - NAVEGACIÓN
 */
function cambiarEstacion(nuevaEstacion) {
    // Ocultar panel actual y mostrar el nuevo
    document.getElementById(`panel-estacion-${estacionActual}`).classList.remove('active-panel');
    document.getElementById(`panel-estacion-${nuevaEstacion}`).classList.add('active-panel');

    // Manejar el estado visual en la barra de progreso (Nodos)
    document.getElementById(`node-${estacionActual}`).classList.remove('active');
    document.getElementById(`node-${estacionActual}`).classList.add('completed');
    document.getElementById(`node-${nuevaEstacion}`).classList.add('active');

    estacionActual = nuevaEstacion;
}

/**
 * Avanza estación e intenta subir los documentos al backend
 */
async function avanzarEstacion(nuevaEstacion) {
    const boton = document.getElementById(`btn-next-${estacionActual}`);
    if (boton) boton.disabled = true; // Deshabilitar temporalmente para evitar doble click

    // Interceptar si es la estación 0 para guardar la modalidad de admisión
    if (estacionActual === 0 && currentSolicitudId) {
        const inputModalidad = document.querySelector('input[name="modalidad"]:checked');
        if (inputModalidad) {
            try {
                const res = await fetch(`/api/solicitud/modalidad/${currentSolicitudId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipoAdmision: inputModalidad.value })
                });
                if (!res.ok) {
                    console.error("Error al guardar la modalidad en la base de datos.");
                }
            } catch (e) {
                console.error("Error de conexión al guardar modalidad:", e);
            }
        }
    }

    const form = document.getElementById(`form-estacion-${estacionActual}`);
    mostrarLoader();

    if (form && currentSolicitudId) {
        const formData = new FormData(form);
        // Iterar sobre los archivos seleccionados en este form
        for (let [name, file] of formData.entries()) {
            if (file && file.size > 0) {
                const subidaData = new FormData();
                subidaData.append('idSoli', currentSolicitudId);
                // El name del input ahora es el idRequisito dinámico
                subidaData.append('idRequisito', name); 
                subidaData.append('archivo', file);

                try {
                    const res = await fetch('/api/documentos', {
                        method: 'POST',
                        body: subidaData
                    });

                    if (!res.ok) {
                        console.error(`Error al subir documento ${name}`);
                    }
                } catch (e) {
                    console.error("Error en petición de subida:", e);
                }
            }
        }
    }

    // Guardar progreso (estacion_actual) en la base de datos
    if (currentSolicitudId) {
        try {
            await fetch(`/api/solicitud/estacion/${currentSolicitudId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estacion_actual: nuevaEstacion })
            });
        } catch (e) {
            console.error("Error al actualizar la estación en DB:", e);
        }
    }

    ocultarLoader();
    if (boton) boton.disabled = false;
    cambiarEstacion(nuevaEstacion);
}

/**
 * Actualización Dinámica (Estación 0) - Muestra el botón de Detalles y pinta la tarjeta seleccionada
 */
function actualizarCostosAdmision() {
    const inputs = document.querySelectorAll('input[name="modalidad"]');
    
    inputs.forEach(input => {
        const card = input.closest('.radio-card');
        const strongText = card.querySelector('strong');
        
        if (input.checked) {
            // Estilo seleccionado (sólido)
            card.style.backgroundColor = '#8a1c24';
            card.style.borderColor = '#8a1c24';
            card.style.borderStyle = 'solid';
            if (strongText) strongText.style.color = '#ffffff';
        } else {
            // Estilo normal (punteado)
            card.style.backgroundColor = '#f8f9fa';
            card.style.borderColor = '#8a1c24';
            card.style.borderStyle = 'dashed';
            if (strongText) strongText.style.color = '#8a1c24';
        }
    });

    // Mostrar el contenedor de detalles de admisión
    const detallesBox = document.getElementById('contenedor-detalles-admision');
    if (detallesBox) {
        detallesBox.style.display = 'block';
    }
}

function mostrarDetallesAdmision() {
    const inputs = document.querySelector('input[name="modalidad"]:checked');
    if (inputs) {
        alert("Aquí irán los detalles (Costos, descripción, fechas) de la modalidad: " + inputs.value);
    }
}

/**
 * Valida de forma dinámica los archivos requeridos para habilitar el botón final
 */
function verificarArchivosEstacion(estacion) {
    if (estacion === 0) {
        if (nivelAcademicoSeleccionado === "Doctorado") {
            const grado = document.getElementById('file-grado-maestria').files.length > 0;
            document.getElementById('btn-next-0').disabled = !grado;
        }
        return;
    }

    if (estacion >= 1 && estacion <= 3) {
        let containerId = '';
        let btnId = '';
        if (estacion === 1) { containerId = 'grid-dinamico-identidad'; btnId = 'btn-next-1'; }
        else if (estacion === 2) { containerId = 'grid-dinamico-academico'; btnId = 'btn-next-2'; }
        else if (estacion === 3) { containerId = 'grid-dinamico-evaluacion'; btnId = 'btn-finalizar'; }

        const contenedor = document.getElementById(containerId);
        if (contenedor) {
            const inputsRequeridos = contenedor.querySelectorAll('input[type="file"][required]');
            let allValid = true;
            inputsRequeridos.forEach(input => {
                if (input.files.length === 0) {
                    allValid = false;
                }
            });
            const btn = document.getElementById(btnId);
            if (btn) btn.disabled = !allValid;
        }
    }
}

/**
 * Concluye el proceso de registro mostrando alertas personalizadas por nivel y enviando los últimos archivos
 */
async function finalizarProcesoEstaciones() {
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) btnFinalizar.disabled = true;

    mostrarLoader();

    // Subir todos los documentos de la estación 3 (Última Estación)
    const form = document.getElementById(`form-estacion-3`);
    if (form && currentSolicitudId) {
        const formData = new FormData(form);
        for (let [name, file] of formData.entries()) {
            if (file && file.size > 0) {
                const subidaData = new FormData();
                subidaData.append('idSoli', currentSolicitudId);
                subidaData.append('idRequisito', name);
                subidaData.append('archivo', file);
                try {
                    const res = await fetch('/api/documentos', {
                        method: 'POST',
                        body: subidaData
                    });
                    if (!res.ok) {
                        console.error(`Error al subir documento ID Requisito: ${name}`);
                    }
                } catch (e) {
                    console.error("Error subiendo estación 3", e);
                }
            }
        }

        // Guardar progreso finalizado en la base de datos (Estación 4 = COMPLETADO)
        try {
            await fetch(`/api/solicitud/estacion/${currentSolicitudId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estacion_actual: 4 })
            });
        } catch (e) {
            console.error("Error al actualizar la estación en DB:", e);
        }
    }

    ocultarLoader();

    if (nivelAcademicoSeleccionado === "Doctorado") {
        alert("¡Expediente de Doctorado Integrado con Éxito! Tu documentación ha sido enviada al comité de admisiones.");
    } else {
        alert("¡Felicidades! Tu expediente completo ha sido enviado con éxito al comité de admisiones del Posgrado FIE.");
    }

    // Aquí idealmente actualizamos el estado en la base de datos a EN_REVISION si tuviéramos un endpoint
    switchView('inicio');
}

// Base de datos local simulada para el estatus de los documentos del alumno
let estadosDocumentos = {
    acta: 'pendiente',
    ine: 'pendiente',
    certificado: 'pendiente',
    cartas: 'pendiente',
    ceneval: 'pendiente'
};

/**
 * Cambia el estado de un documento concreto y dispara el rediseño de la gráfica
 */
function cambiarEstadoDocumento(documento, nuevoEstado) {
    estadosDocumentos[documento] = nuevoEstado;
    actualizarGraficaProceso();
}

/**
 * Procesa matemáticamente las proporciones y redibuja la gráfica mediante CSS dinámico
 */
function actualizarGraficaProceso() {
    let totalDocs = 5;
    let aprobados = 0;
    let rechazados = 0;
    let pendientes = 0;

    for (let doc in estadosDocumentos) {
        if (estadosDocumentos[doc] === 'aprobado') aprobados++;
        else if (estadosDocumentos[doc] === 'rechazado') rechazados++;
        else pendientes++;
    }

    if (document.getElementById('lbl-aprobados')) document.getElementById('lbl-aprobados').innerText = aprobados;
    if (document.getElementById('lbl-rechazados')) document.getElementById('lbl-rechazados').innerText = rechazados;
    if (document.getElementById('lbl-pendientes')) document.getElementById('lbl-pendientes').innerText = pendientes;

    let porcAprobado = (aprobados / totalDocs) * 100;
    let porcRechazado = (rechazados / totalDocs) * 100;

    let finAprobados = porcAprobado;
    let finRechazados = finAprobados + porcRechazado;

    const grafica = document.getElementById('grafica-pastel');
    if (grafica) {
        grafica.style.background = `conic-gradient(
            #27ae60 0% ${finAprobados}%, 
            #c0392b ${finAprobados}% ${finRechazados}%, 
            #7f8c8d ${finRechazados}% 100%
        )`;
    }

    const txtPorcentaje = document.getElementById('txt-porcentaje');
    if (txtPorcentaje) {
        txtPorcentaje.innerText = `${Math.round(porcAprobado)}%`;
    }
}

/**
 * Limpieza de sesión total
 */
function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Función para regresar a la selección de Maestría/Doctorado sin reiniciar sesión
function regresarAConvocatorias() {


    // 1. Volvemos a mostrar el contenedor con las dos tarjetas originales
    document.getElementById('seleccion-programa').style.display = 'flex';

    // 2. Ocultamos la lista detallada y el botón de regreso
    document.getElementById('lista-programas-abiertos').style.display = 'none';

    // 3. Ocultar la pestaña de documentos si nos regresamos
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'none';
        navDocumentos.classList.add('hidden');
    }
}
function toggleProfileMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('show');
}

// Cierra el menú si se hace clic fuera de él
window.addEventListener('click', function () {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
});
// --- NUEVAS FUNCIONES DE SEGURIDAD Y CANCELACION ---

function bloquearConvocatorias() {
    const seleccion = document.getElementById('seleccion-programa');
    const lista = document.getElementById('lista-programas-abiertos');
    const bloqueo = document.getElementById('bloqueo-convocatoria');

    if (seleccion) seleccion.style.display = 'none';
    if (lista) lista.style.display = 'none';
    if (bloqueo) bloqueo.style.display = 'block';
}

async function cancelarSolicitudActual() {
    if (!confirm("¿Estás seguro que deseas cancelar todo el progreso de esta solicitud? No se puede deshacer.")) return;
    if (!currentSolicitudId) return;

    try {
        const res = await fetch(`/api/solicitud/cancelar/${currentSolicitudId}`, {
            method: 'PUT'
        });

        if (res.ok) {
            alert("Solicitud cancelada. Eres libre de iniciar una nueva.");
            currentSolicitudId = null;
            sessionStorage.removeItem('idConvocatoriaPendiente');
            sessionStorage.removeItem('programaPendiente');

            // Desbloquear la UI
            const seleccion = document.getElementById('seleccion-programa');
            const bloqueo = document.getElementById('bloqueo-convocatoria');
            if (seleccion) seleccion.style.display = 'flex';
            if (bloqueo) bloqueo.style.display = 'none';

            // Ocultar sección de documentos
            document.getElementById('nav-documentos').classList.add('hidden');

            // Regresar a la vista de convocatorias
            switchView('convocatorias');
        } else {
            alert("Hubo un error al cancelar la solicitud.");
        }
    } catch (e) {
        console.error(e);
        alert("Error de red al intentar cancelar.");
    }
}

async function cargarModalidadesAdmision() {
    const contenedor = document.getElementById('opciones-admision-maestria');
    if (!contenedor) return;

    try {
        const res = await fetch('/api/solicitud/modalidades');
        if (res.ok) {
            const modalidades = await res.json();
            contenedor.innerHTML = '';
            
            modalidades.forEach((mod, index) => {
                const titulo = mod.replace(/_/g, ' ').replace(/\w\S*/g, w => (w.replace(/^\w/, c => c.toUpperCase())));
                const checkedStr = index === 0 ? 'checked' : '';
                
                contenedor.innerHTML += `
                    <label class="radio-card" style="display:block; flex: 1 1 220px; min-width: 220px; position:relative; padding:20px; border-radius:10px; border:2px dashed #8a1c24; cursor:pointer; text-align:center; background-color:#f8f9fa; margin: 10px;">
                        <input type="radio" name="modalidad" value="${mod}" ${checkedStr} onchange="actualizarCostosAdmision()" style="position:absolute; opacity:0; width:0; height:0;">
                        <div class="radio-content" style="pointer-events:none;">
                            <strong style="display:block; font-size:16px; color:#8a1c24; margin-bottom:5px;">${index + 1}. ${titulo}</strong>
                        </div>
                    </label>
                `;
            });
            actualizarCostosAdmision();
        } else {
            contenedor.innerHTML = '<p style="color: red;">Error al cargar las modalidades de admisión.</p>';
        }
    } catch (e) {
        console.error("Error cargando modalidades:", e);
    }
}


async function cargarRequisitosDocumentales(idConvocatoria) {
    const contenedor = document.getElementById('contenedor-requisitos-dinamicos');
    if (!contenedor) return;

    try {
        const res = await fetch(`/api/convocatorias/${idConvocatoria}/requisitos`);
        if (res.ok) {
            const requisitos = await res.json();
            const gridIdentidad = document.getElementById('grid-dinamico-identidad');
            const gridAcademico = document.getElementById('grid-dinamico-academico');
            const gridEvaluacion = document.getElementById('grid-dinamico-evaluacion');
            
            if (gridIdentidad) gridIdentidad.innerHTML = '';
            if (gridAcademico) gridAcademico.innerHTML = '';
            if (gridEvaluacion) gridEvaluacion.innerHTML = '';
            
            if (requisitos.length === 0) {
                if (gridIdentidad) gridIdentidad.innerHTML = '<p style="color: #666; font-style: italic;">No hay requisitos configurados.</p>';
                return;
            }

            requisitos.forEach(req => {
                const isRequired = req.obligatorio ? '*' : '';
                const requiredAttr = req.obligatorio ? 'required' : '';
                
                const htmlReq = `
                    <div class="file-box">
                        <label><i class="fa-solid fa-file-arrow-up"></i> ${req.descripcion} <span style="color:red;">${isRequired}</span></label>
                        <input type="file" name="${req.id}" accept=".pdf" onchange="verificarArchivosEstacion(estacionActual)" ${requiredAttr}>
                    </div>
                `;

                if (req.categoria === 'IDENTIDAD' || req.categoria === 'GENERAL') {
                    if (gridIdentidad) gridIdentidad.innerHTML += htmlReq;
                } else if (req.categoria === 'ACADEMICO') {
                    if (gridAcademico) gridAcademico.innerHTML += htmlReq;
                } else if (req.categoria === 'EVALUACION') {
                    if (gridEvaluacion) gridEvaluacion.innerHTML += htmlReq;
                }
            });
            
            // Re-ejecutar verificación en caso de que todo sea opcional
            verificarArchivosEstacion(1);
            verificarArchivosEstacion(2);
            verificarArchivosEstacion(3);
        } else {
            contenedor.innerHTML = '<p style="color: red;">Error al cargar los requisitos de la convocatoria.</p>';
        }
    } catch (e) {
        console.error("Error cargando requisitos:", e);
        contenedor.innerHTML = '<p style="color: red;">Error de conexión al cargar requisitos.</p>';
    }
}

/**
 * Hidrata la UI con el progreso guardado en la base de datos (Backend como fuente de verdad)
 */
function hidratarUI(soliData) {
    currentSolicitudId = soliData.idSolicitud || soliData.id;
    nivelAcademicoSeleccionado = soliData.nivel === 'DOCTORADO' ? 'Doctorado' : 'Maestría';
    const estacionGuardada = soliData.estacion_actual || 0;

    // Desbloquear navegación
    bloquearConvocatorias();
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block';
        navDocumentos.classList.remove('hidden');
    }

    // Configurar paneles según el nivel
    configurarPanelesNivel(nivelAcademicoSeleccionado, soliData.idConvocatoria);

    // Mover a la estación donde se quedó
    if (estacionGuardada > 0) {
        cambiarEstacion(Math.min(estacionGuardada, 3));
    }
}

/**
 * Extrae la lógica de pintar paneles para reusarla sin llamar a /crear
 */
function configurarPanelesNivel(nivel, idConvocatoria) {
    if (idConvocatoria) sessionStorage.setItem('idConvocatoriaPendiente', idConvocatoria);

    const titulo = document.getElementById('titulo-flujo-documentos');
    const boxCostos = document.getElementById('box-costos-desglose');

    if (nivel === "Doctorado") {
        if (titulo) titulo.innerText = "Integración de Expediente: Doctorado FIE";
        if (document.getElementById('lbl-step-1')) document.getElementById('lbl-step-1').innerText = "Identidad y Generales";
        if (document.getElementById('lbl-step-2')) document.getElementById('lbl-step-2').innerText = "Académicos";
        if (document.getElementById('lbl-step-3')) document.getElementById('lbl-step-3').innerText = "Evaluación / Cartas";

        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'none';
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'block';

        if (boxCostos) {
            boxCostos.innerHTML = `<h4>Aranceles y Conceptos de Pago (Doctorado)</h4><div class="costo-linea"><span style="color:#27ae60;">✓ Exención por Continuidad FIE:</span> <strong>$ 0.00 MXN</strong></div><small style="color:#777;">Al ser egresado directo del posgrado FIE, los derechos de examen interno quedan exentos.</small>`;
        }
        if (document.getElementById('btn-next-0')) document.getElementById('btn-next-0').disabled = true;
    } else {
        if (titulo) titulo.innerText = "Integración de Expediente: Maestría FIE";
        if (document.getElementById('lbl-step-1')) document.getElementById('lbl-step-1').innerText = "Identidad y Generales";
        if (document.getElementById('lbl-step-2')) document.getElementById('lbl-step-2').innerText = "Académicos";
        if (document.getElementById('lbl-step-3')) document.getElementById('lbl-step-3').innerText = "Evaluación / Cartas";

        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'none';
        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'block';

        if (boxCostos) {
            boxCostos.innerHTML = `<h4>Aranceles y Conceptos de Pago (Maestría)</h4><div class="costo-linea"><span>Examen de Admisión Institucional:</span> <strong>$ 1,200.00 MXN</strong></div><div class="costo-linea"><span>Curso Propedéutico:</span> <strong>$ 2,500.00 MXN</strong></div>`;
        }
        if (document.getElementById('btn-next-0')) document.getElementById('btn-next-0').disabled = false;
        actualizarCostosAdmision();
    }

    if (idConvocatoria) cargarRequisitosDocumentales(idConvocatoria);
}

// ==== MANEJO DE UI PARA INPUTS DE ARCHIVOS ====
document.addEventListener('change', function(e) {
    if (e.target && e.target.type === 'file') {
        const fileBox = e.target.closest('.file-box');
        if (fileBox) {
            const files = e.target.files;
            
            // Eliminar nombre de archivo previo si existe
            const existingDisplay = fileBox.querySelector('.file-name-display');
            if (existingDisplay) {
                existingDisplay.remove();
            }

            if (files && files.length > 0) {
                const fileName = files[0].name;
                
                // Crear el elemento para mostrar el nombre
                const displayDiv = document.createElement('div');
                displayDiv.className = 'file-name-display';
                displayDiv.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${fileName}`;
                
                fileBox.appendChild(displayDiv);
                fileBox.classList.add('file-selected');
            } else {
                fileBox.classList.remove('file-selected');
            }
        }
    }
});
