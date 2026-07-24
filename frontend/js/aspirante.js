// Variables globales
let nivelAcademicoSeleccionado = null;
let estacionActual = 0;
let aspiranteData = null; // Almacenará los datos de la BD del aspirante
let currentSolicitudId = null;

// Conexión Socket.io
const socket = io();
socket.on('actualizacionGlobal', () => {
    // Recargar vista actual si hay un cambio en el sistema (ej. evaluación de docente)
    const currentHash = window.location.hash;
    if (currentHash === '#inicio' || currentHash === '') {
        if (typeof cargarNotificaciones === 'function') cargarNotificaciones();
    } else if (currentHash === '#documentos') {
        if (typeof bloquearInterfazPorRevision === 'function') bloquearInterfazPorRevision();
    } else if (currentHash === '#convocatorias') {
        if (typeof cargarConvocatorias === 'function') cargarConvocatorias();
    }
});

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
                if (lblCorreo) lblCorreo.innerText = usuario.correo;
                if (lblTelefono) lblTelefono.innerText = aspiranteData.telefono;

                // Cargar modalidades de admisión dinámicas
                cargarModalidadesAdmision();

                // Cargar notificaciones al iniciar sesión
                cargarNotificaciones();

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



/**
 * Control del cambio de paneles (Navegación lateral con Hash Router)
 */
function switchView(viewId) {
    if (window.location.hash !== `#${viewId}`) {
        window.location.hash = viewId;
        return; // El evento onhashchange se encargará de hacer el render
    }

    mostrarLoader();

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

    // Cargar notificaciones al abrir el dropdown, o mantenerlo en DOMContentLoaded
    // if (viewId === 'notificaciones') {
    //     cargarNotificaciones();
    // }

    setTimeout(() => {
        ocultarLoader();
    }, 300);
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
    const contenedor = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    if (!contenedor) return;

    // Estado de carga inicial
    contenedor.innerHTML = '<div style="text-align: center; padding: 20px; color: #7f8c8d;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>';

    let idUsuario = "";
    try {
        const usr = JSON.parse(sessionStorage.getItem('usuario'));
        if (usr && usr.id) idUsuario = usr.id;
    } catch (e) { }

    try {
        const res = await fetch(`/api/notificaciones?destino=aspirantes&idUsuario=${idUsuario}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (res.ok) {
            const notificaciones = await res.json();

            // Update Badge
            if (badge) {
                if (notificaciones.length > 0) {
                    badge.style.display = 'block';
                    badge.innerText = notificaciones.length;
                } else {
                    badge.style.display = 'none';
                }
            }

            if (!notificaciones || notificaciones.length === 0) {
                contenedor.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d; font-size: 13px;">No tienes notificaciones nuevas.</div>';
            } else {
                let html = '';
                notificaciones.forEach(notif => {
                    const isGeneral = notif.destino === 'todos';
                    const itemClass = isGeneral ? 'notif-general' : 'notif-specific';
                    const iconName = isGeneral ? 'fa-scroll' : 'fa-bell';
                    const remitente = notif.nombreRemitente ? `${notif.rolRemitente || 'ADMIN'} - ${notif.nombreRemitente}` : (isGeneral ? 'Comité Técnico' : 'Coordinación FIE');

                    const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                    const notifDataStr = encodeURIComponent(JSON.stringify(notif));

                    html += `
                    <div class="notification-item-modern ${itemClass}" style="cursor: pointer;" onclick="abrirNotificacion('${notifDataStr}')">
                        <div class="notif-icon">
                            <i class="fa-solid ${iconName}"></i>
                        </div>
                        <div style="flex: 1;">
                            <h4>${notif.nombre}</h4>
                            <p>${notif.mensaje.substring(0, 60)}${notif.mensaje.length > 60 ? '...' : ''}</p>
                            <div class="notif-meta">
                                <span><i class="fa-solid fa-user-tie"></i> ${remitente}</span>
                                <span>• ${formattedDate}</span>
                            </div>
                        </div>
                    </div>`;
                });
                contenedor.innerHTML = html;
            }
        } else {
            contenedor.innerHTML = '<div style="padding: 20px; text-align: center; color: #e67e22; font-size: 13px;"><i class="fa-solid fa-triangle-exclamation"></i> Error al cargar notificaciones.</div>';
        }
    } catch (e) {
        console.warn("Ocurrio un error al obtener notificaciones:", e);
        contenedor.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d; font-size: 13px;">Modo Offline: Avisos no disponibles.</div>';
    }
}

/**
 * Muestra u oculta el menú de notificaciones
 */
function toggleNotificationMenu(event) {
    event.stopPropagation(); // Evitar que se propague al document
    const menu = document.getElementById('notification-dropdown');
    const profileMenu = document.getElementById('profile-dropdown');

    // Si el menú de perfil está abierto, lo cerramos
    if (profileMenu && profileMenu.classList.contains('show')) {
        profileMenu.classList.remove('show');
    }

    if (menu) {
        menu.classList.toggle('show');
    }
}

// Cerrar los menús al hacer click fuera
document.addEventListener('click', function (event) {
    const notificationMenu = document.getElementById('notification-dropdown');
    const profileMenu = document.getElementById('profile-dropdown');

    if (notificationMenu && notificationMenu.classList.contains('show') && !event.target.closest('.notification-container')) {
        notificationMenu.classList.remove('show');
    }

    if (profileMenu && profileMenu.classList.contains('show') && !event.target.closest('.profile-container')) {
        profileMenu.classList.remove('show');
    }
});

/**
 * Muestra el modal con la notificación completa
 */
function abrirNotificacion(notifDataEnc) {
    try {
        const notif = JSON.parse(decodeURIComponent(notifDataEnc));
        document.getElementById('modal-notif-titulo').innerText = notif.nombre || 'Aviso';
        document.getElementById('modal-notif-cuerpo').innerText = notif.mensaje || '';

        // Formatear si tuviéramos fecha
        document.getElementById('modal-notif-fecha').innerHTML = `<i class="fa-regular fa-clock"></i> Notificación del Sistema`;

        const modal = document.getElementById('modal-notificacion');
        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error("Error al abrir notificación", error);
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
        Swal.fire({
            title: 'Atención',
            text: `Para postularte a la ${nombrePrograma} debes confirmar tus credenciales de registro. Redirigiendo...`,
            icon: 'info',
            confirmButtonColor: 'var(--color-info)'
        }).then(() => {
            // Guardamos temporalmente qué programa seleccionó
            sessionStorage.setItem('programaPendiente', nombrePrograma);
            // Lo mandamos al formulario de registro limpio (registro.html)
            window.location.href = "registro.html";
        });
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
        Swal.fire('Error', 'No se pudo cargar la información del aspirante. Intente recargar.', 'error');
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
            Swal.fire('Aviso', errData.mensaje, 'warning');
            return;
        } else {
            Swal.fire('Error', 'Hubo un error al crear la solicitud en el servidor.', 'error');
            return;
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Fallo de conexión al crear solicitud.', 'error');
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

            // Si es estación 3, también validar el checkbox legal
            if (estacion === 3) {
                const chkProtesta = document.getElementById('chk-protesta');
                if (chkProtesta && !chkProtesta.checked) {
                    allValid = false;
                }
            }

            const btn = document.getElementById(btnId);
            if (btn) btn.disabled = !allValid;
        }
    }
}

// Bloquear toda la UI de carga cuando el expediente esté bajo revisión
async function bloquearInterfazPorRevision() {
    // 1. Mostrar banner y ocultar encabezado normal
    const banner = document.getElementById('banner-revision');
    const encabezado = document.getElementById('encabezado-documentos');
    if (banner) {
        banner.style.display = 'block';
        banner.className = ''; // Quitamos la clase estática para evitar conflictos
        banner.style.background = 'transparent';
        banner.style.border = 'none';
        banner.style.boxShadow = 'none';
        banner.style.padding = '0';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 5px; margin-top: 15px; margin-bottom: 2px; flex-wrap: wrap;">
                <span class="badge" style="background-color: #3b82f6; color: white; margin-left: 0;">Bajo Revisión, permanece pendiente para cualquier modificacion acerca de tus documentos.</span>
            </div>
            <div id="docs-dinamicos-container" class="docs-revision-grid">
                <div style="text-align:center; padding: 20px; grid-column: 1 / -1; color:#777;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando tus documentos...
                </div>
            </div>
        `;
    }
    if (encabezado) encabezado.style.display = 'none';

    // 2. Ocultar el stepper
    const stepper = document.querySelector('.stepper-wrapper');
    if (stepper) stepper.style.display = 'none';

    // 3. Ocultar todos los paneles de estación de documentos
    document.querySelectorAll('.station-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    // 4. Asegurarse de ocultar panel 0 (Admisión general) si existe, u ocultar sus inputs
    const panel0 = document.getElementById('panel-estacion-0');
    if (panel0) panel0.style.display = 'none';

    // Cargar documentos desde la API para el panel dinámico
    if (aspiranteData && aspiranteData.id) {
        try {
            const res = await fetch(`/api/aspirante/${aspiranteData.id}/expediente`);
            if (res.ok) {
                const data = await res.json();
                const solicitudActiva = data.solicitudes.find(s => s.idSolicitud === currentSolicitudId);

                const container = document.getElementById('docs-dinamicos-container');
                if (container) {
                    if (solicitudActiva && solicitudActiva.documentos && solicitudActiva.documentos.length > 0) {
                        renderizarVistaDinamicaDocumentos(solicitudActiva.documentos, container);
                    } else {
                        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No se encontraron documentos adjuntos.</p>';
                    }
                }
            }
        } catch (error) {
            console.error("Error al cargar expediente dinámico:", error);
        }
    }
}

function renderizarVistaDinamicaDocumentos(documentos, container) {
    let html = '';

    documentos.forEach(doc => {
        let estadoClass = '';
        let badgeClass = '';
        let estadoTexto = '';
        let iconClass = 'fa-file-lines';

        const numIntentos = doc.intentos || 1;

        switch (doc.estadoValidacion) {
            case 'APROBADO':
                estadoClass = 'state-aprobado';
                badgeClass = 'status-aprobado';
                estadoTexto = '<i class="fa-solid fa-check-circle"></i> Aprobado';
                break;
            case 'RECHAZADO':
                estadoClass = 'state-rechazado';
                badgeClass = 'status-rechazado';
                estadoTexto = `<i class="fa-solid fa-circle-xmark"></i> Rechazado (${numIntentos}/3)`;
                break;
            default:
                estadoClass = 'state-pendiente';
                badgeClass = 'status-pendiente';
                estadoTexto = '<i class="fa-solid fa-clock"></i> Pendiente';
                break;
        }

        // Serializar los datos para el onClick
        const docDataStr = encodeURIComponent(JSON.stringify(doc));

        html += `
            <div class="doc-card-modern ${estadoClass}" onclick="abrirModalDoc('${docDataStr}')">
                <div class="doc-card-header">
                    <div class="doc-card-icon">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 class="doc-card-title">${doc.requisitoNombre || 'Documento adjunto'}</h4>
                    </div>
                </div>
                <div class="doc-card-footer">
                    <span class="status-badge ${badgeClass}">${estadoTexto}</span>
                    <span class="doc-card-action">Ver Detalles <i class="fa-solid fa-chevron-right" style="font-size:10px;"></i></span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function abrirModalDoc(docStr) {
    try {
        const doc = JSON.parse(decodeURIComponent(docStr));

        document.getElementById('modal-doc-titulo').innerText = 'Detalles del Documento';
        document.getElementById('modal-doc-requisito').innerText = doc.requisitoNombre || 'Documento adjunto';

        const numIntentos = doc.intentos || 1;
        const badge = document.getElementById('modal-doc-estado');
        badge.className = 'status-badge'; // reset

        const comentariosWrapper = document.getElementById('modal-doc-comentarios-wrapper');
        const comentariosTxt = document.getElementById('modal-doc-comentarios');
        const resubirContainer = document.getElementById('modal-doc-resubir-container');

        // Renderizar Historial Completo de Intentos y Comentarios
        if (doc.historial && doc.historial.length > 0) {
            let historialHtml = '';
            doc.historial.forEach((h, idx) => {
                const iconoState = h.estadoValidacion === 'APROBADO' ? 'fa-circle-check' : (h.estadoValidacion === 'RECHAZADO' ? 'fa-circle-xmark' : 'fa-clock');
                const colorState = h.estadoValidacion === 'APROBADO' ? '#10b981' : (h.estadoValidacion === 'RECHAZADO' ? '#ef4444' : '#f59e0b');
                const comTxt = (h.comentarios && h.comentarios.trim() !== '') ? h.comentarios : 'Sin observaciones por parte del evaluador en este intento.';

                historialHtml += `
                    <div style="margin-bottom: 12px; padding-bottom: 10px; ${idx < doc.historial.length - 1 ? 'border-bottom: 1px dashed #cbd5e1;' : ''}">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: ${colorState};">
                            <span><i class="fa-solid ${iconoState}"></i> Intento ${h.intentos} - ${h.estadoValidacion}</span>
                        </div>
                        <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.4; white-space: pre-wrap;">${comTxt}</p>
                    </div>
                `;
            });
            comentariosTxt.innerHTML = historialHtml;
        }

        if (doc.estadoValidacion === 'APROBADO') {
            badge.classList.add('status-aprobado');
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aprobado';
            if (comentariosWrapper) comentariosWrapper.style.borderLeftColor = '#10b981';
            if (resubirContainer) resubirContainer.style.display = 'none';

        } else if (doc.estadoValidacion === 'RECHAZADO') {
            badge.classList.add('status-rechazado');
            badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Rechazado (Intento ${numIntentos} de 3)`;
            if (comentariosWrapper) comentariosWrapper.style.borderLeftColor = '#ef4444';

            if (resubirContainer) {
                resubirContainer.style.display = 'block';
                if (numIntentos < 3) {
                    const reqNombreSanitized = encodeURIComponent(doc.requisitoNombre || 'Documento');
                    resubirContainer.innerHTML = `
                        <button onclick="iniciarReSubidaDocumento(${doc.idDocumento}, '${reqNombreSanitized}', ${numIntentos})" style="background-color: #8a1c24; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; font-size: 15px; box-shadow: 0 4px 10px rgba(138, 28, 36, 0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Volver a Intentar (Intento ${numIntentos + 1} de 3)
                        </button>
                    `;
                } else {
                    resubirContainer.innerHTML = `
                        <div style="background-color: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-ban"></i> Se ha alcanzado el límite máximo de 3 intentos para este documento.
                        </div>
                    `;
                }
            }

        } else {
            badge.classList.add('status-pendiente');
            badge.innerHTML = '<i class="fa-solid fa-clock"></i> En Revisión';
            if (comentariosWrapper) comentariosWrapper.style.borderLeftColor = '#f59e0b';
            if (resubirContainer) resubirContainer.style.display = 'none';
        }

        const enlace = document.getElementById('modal-doc-enlace');
        if (doc.rutaArchivo) {
            enlace.href = `/uploads/${doc.rutaArchivo}`;
            enlace.style.display = 'inline-flex';
        } else {
            enlace.style.display = 'none';
        }

        const modal = document.getElementById('modal-revision-doc');
        if (modal) modal.style.display = 'flex';

    } catch (e) {
        console.error("Error al abrir modal del documento", e);
    }
}

/**
 * Re-subida de documento rechazado con límite de 3 intentos
 */
async function iniciarReSubidaDocumento(idDoc, nombreReqEncoded, intentosActuales) {
    // 1. Cerrar el modal previo para evitar encimamiento visual
    cerrarModalDoc();

    const nombreReq = decodeURIComponent(nombreReqEncoded);
    const siguienteIntento = (intentosActuales || 1) + 1;

    if (intentosActuales >= 3) {
        Swal.fire({
            title: 'Límite alcanzado',
            text: 'Has alcanzado el límite máximo de 3 intentos para este documento.',
            icon: 'warning',
            confirmButtonColor: '#8a1c24'
        });
        return;
    }

    const { value: file } = await Swal.fire({
        title: `<i class="fa-solid fa-cloud-arrow-up" style="color: #8a1c24;"></i> Subir Corrección`,
        html: `
            <div style="text-align: left; font-size: 14px; color: #334155; margin-top: 10px;">
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 15px; margin-bottom: 15px;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block; letter-spacing: 0.5px;">Requisito A Corregir</span>
                    <strong style="font-size: 16px; color: #0f172a; display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        <i class="fa-solid fa-file-pdf" style="color: #ef4444; font-size: 20px;"></i> ${nombreReq}
                    </strong>
                </div>
                <p style="margin-bottom: 6px; color: #475569;">Estás realizando el <strong>Intento ${siguienteIntento} de 3</strong>.</p>
                <p style="font-size: 12px; color: #64748b; margin: 0;"><i class="fa-solid fa-circle-info"></i> Selecciona únicamente un archivo <strong>PDF (.pdf)</strong> corregido.</p>
            </div>
        `,
        input: 'file',
        inputAttributes: {
            'accept': 'application/pdf, .pdf',
            'aria-label': 'Selecciona tu archivo PDF corregido'
        },
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-cloud-arrow-up"></i> Enviar PDF',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8a1c24'
    });

    if (file) {
        // Validar que sea un archivo PDF
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            Swal.fire({
                title: 'Formato Inválido',
                text: 'Únicamente se permiten archivos en formato PDF (.pdf). Por favor convierte tu documento a PDF e inténtalo de nuevo.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        const formData = new FormData();
        formData.append('archivo', file);

        try {
            mostrarLoader();
            const res = await fetch(`/api/documentos/reemplazar/${idDoc}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await res.json();
            ocultarLoader();

            if (res.ok && data.success) {
                await Swal.fire({
                    title: '¡Documento Actualizado!',
                    text: data.mensaje || `Tu documento (${file.name}) ha sido enviado para revisión (Intento ${siguienteIntento} de 3).`,
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });

                // Recargar el panel dinámico para reflejar el nuevo estado en tiempo real
                bloquearInterfazPorRevision();
            } else {
                Swal.fire({
                    title: 'No se pudo subir',
                    text: data.mensaje || 'Error al reemplazar el archivo.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (e) {
            ocultarLoader();
            console.error("Error al re-subir documento:", e);
            Swal.fire({
                title: 'Error de comunicación',
                text: 'Ocurrió un fallo de red al conectarse con el servidor.',
                icon: 'error'
            });
        }
    }
}

function cerrarModalDoc() {
    const modal = document.getElementById('modal-revision-doc');
    if (modal) modal.style.display = 'none';
}

/**
 * Concluye el proceso de registro mostrando alertas personalizadas por nivel y enviando los últimos archivos
 */
async function finalizarProcesoEstaciones() {
    const confirmacion = await Swal.fire({
        title: 'Enviar Expediente',
        text: "¿Estás seguro de enviar tu expediente a revisión? Una vez enviado no podrás modificar ni borrar documentos.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-success)',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, enviar a revisión',
        cancelButtonText: 'Aún no'
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

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

        // Llamar al endpoint de EN_REVISION para bloquear el expediente
        try {
            await fetch(`/api/solicitud/enviar/${currentSolicitudId}`, {
                method: 'PUT'
            });
            // Activar bloqueo de interfaz sin recargar
            Swal.fire({
                title: '¡Felicidades!',
                text: 'Tu expediente completo ha sido enviado con éxito al comité de admisiones. Revisa tu vista de proceso para ver actualizaciones.',
                icon: 'success',
                confirmButtonColor: 'var(--color-success)'
            });

            // Forzar recarga de UI a EN_REVISION
            const soliRes = await fetch(`/api/solicitud/${currentSolicitudId}`);
            if (soliRes.ok) {
                const soliData = await soliRes.json();
                if (['EN_REVISION', 'RECHAZADO', 'APROBADO'].includes(soliData.estado)) {
                    bloquearInterfazPorRevision();
                }
            }
        } catch (e) {
            console.error("Error al enviar expediente a revisión en DB:", e);
        }
    }

    ocultarLoader();

    // Lo redirigimos a la vista de proceso en lugar de inicio
    switchView('proceso');
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
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Deseas cancelar todo el progreso de esta solicitud? No se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-danger)',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, cancelar solicitud',
        cancelButtonText: 'No, mantenerla'
    });

    if (!confirmacion.isConfirmed) return;
    if (!currentSolicitudId) return;

    try {
        const res = await fetch(`/api/solicitud/cancelar/${currentSolicitudId}`, {
            method: 'PUT'
        });

        if (res.ok) {
            Swal.fire('Cancelada', 'Solicitud cancelada. Eres libre de iniciar una nueva.', 'success');
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
            console.error('Error al cargar los requisitos de la convocatoria.');
            alert('Error al cargar los requisitos de la convocatoria.');
        }
    } catch (e) {
        console.error("Error cargando requisitos:", e);
        alert('Error de conexión al cargar requisitos.');
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

    // Bloquear si está en revisión, rechazado o aprobado
    if (['EN_REVISION', 'RECHAZADO', 'APROBADO'].includes(soliData.estado)) {
        bloquearInterfazPorRevision();
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
document.addEventListener('change', function (e) {
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
