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
    
    // Función auxiliar para iniciales
    const getIniciales = (nombre, apellido) => {
        let inits = "";
        if (nombre) inits += nombre.charAt(0).toUpperCase();
        if (apellido) inits += apellido.charAt(0).toUpperCase();
        return inits || "U";
    };

    // Obtener datos del aspirante real
    try {
        const resAspirantes = await fetch('/api/aspirante');
        if (resAspirantes.ok) {
            const listaAspirantes = await resAspirantes.json();
            // Buscar aspirante por idUsuario
            aspiranteData = listaAspirantes.find(a => a.idUsuario === usuario.id);

            if (aspiranteData) {
                const nombreCompleto = `${aspiranteData.nombre} ${aspiranteData.primerApellido}`;
                window.nombreAspiranteCompleto = nombreCompleto;
                const iniciales = getIniciales(aspiranteData.nombre, aspiranteData.primerApellido);

                // Topbar
                const topbarNombre = document.getElementById('topbar-nombre-usuario');
                const topbarIniciales = document.getElementById('topbar-iniciales');
                if (topbarNombre) topbarNombre.innerText = nombreCompleto;
                if (topbarIniciales) topbarIniciales.innerText = iniciales;

                // Sidebar
                const sidebarNombre = document.getElementById('sidebar-nombre');
                const sidebarIniciales = document.getElementById('sidebar-iniciales');
                if (sidebarNombre) sidebarNombre.innerText = nombreCompleto;
                if (sidebarIniciales) sidebarIniciales.innerText = iniciales;

                // Menú Perfil Antiguo (Dropdown)
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

    // Controlar título/saludo en la barra superior
    const topbarGreeting = document.querySelector('.topbar-greeting');
    const topbarSubtitulo = document.getElementById('topbar-subtitulo');
    const topbarNombre = document.getElementById('topbar-nombre-usuario');

    if (topbarGreeting && topbarNombre) {
        topbarGreeting.style.display = 'flex';
        if (viewId === 'inicio') {
            if (topbarSubtitulo) topbarSubtitulo.style.display = 'block';
            topbarNombre.innerText = window.nombreAspiranteCompleto || 'Cargando...';
        } else {
            if (topbarSubtitulo) topbarSubtitulo.style.display = 'none';
            const titulos = {
                'proceso': 'Proceso',
                'convocatorias': 'Convocatorias',
                'documentos': 'Documentos'
            };
            topbarNombre.innerText = titulos[viewId] || (viewId.charAt(0).toUpperCase() + viewId.slice(1));
        }
    }

    // Controlar la visibilidad del toast de revisión (solo visible en documentos)
    const toast = document.getElementById('revision-toast');
    if (toast) {
        if (viewId === 'documentos') {
            toast.style.display = 'flex';
        } else {
            toast.style.display = 'none';
        }
    }

    // Actualizar estados visuales en la barra de navegación lateral
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetNavLink = document.getElementById(`nav-${viewId}`);
    if (targetNavLink) {
        targetNavLink.classList.add('active');
    }

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
                contenedor.innerHTML = '<div class="messages-empty-state"><i class="fa-solid fa-inbox fa-2x mb-2 opacity-50"></i>No tienes mensajes.</div>';
            } else {
                // Agrupar por remitente
                const grupos = {};
                notificaciones.forEach(notif => {
                    const isGeneral = notif.destino === 'todos';
                    const remitente = notif.nombreRemitente ? `${notif.rolRemitente || 'ADMIN'} - ${notif.nombreRemitente}` : (isGeneral ? 'Comité Técnico' : 'Administración Posgrados');

                    if (!grupos[remitente]) {
                        grupos[remitente] = {
                            remitente: remitente,
                            isGeneral: isGeneral,
                            mensajes: []
                        };
                    }
                    grupos[remitente].mensajes.push(notif);
                });

                // Ordenar mensajes de cada grupo (más viejo al más nuevo para leer como chat)
                Object.values(grupos).forEach(grupo => {
                    grupo.mensajes.sort((a, b) => new Date(a.creado_en || 0) - new Date(b.creado_en || 0));
                });

                // Guardar globalmente para no pasar todo por HTML
                window.mensajesAgrupados = grupos;

                let html = '';
                Object.values(grupos).forEach(grupo => {
                    const ultMsg = grupo.mensajes[grupo.mensajes.length - 1]; // Último mensaje
                    const bgClass = grupo.isGeneral ? 'bg-primary' : 'bg-info';

                    const dateObj = ultMsg.creado_en ? new Date(ultMsg.creado_en) : new Date();
                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                    const remitenteKey = encodeURIComponent(grupo.remitente);

                    html += `
                    <div class="chat-item p-3 border-bottom" style="cursor: pointer; display: flex; gap: 10px; align-items: center;" onclick="abrirNotificacion('${remitenteKey}', this)">
                        <div class="chat-avatar ${bgClass} text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div class="chat-details" style="flex: 1; overflow: hidden;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                                <div style="font-weight: bold; font-size: 13px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${grupo.remitente}</div>
                                <div style="font-size: 11px; color: #94a3b8; flex-shrink: 0;">${formattedDate}</div>
                            </div>
                            <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${ultMsg.nombre}</strong> - ${ultMsg.mensaje}</div>
                        </div>
                    </div>`;
                });
                contenedor.innerHTML = html;
            }

        } else {
            contenedor.innerHTML = '<div class="messages-empty-state text-danger"><i class="fa-solid fa-triangle-exclamation mb-2"></i> Error al cargar.</div>';
        }
    } catch (e) {
        console.warn("Ocurrio un error al obtener mensajes:", e);
        contenedor.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d; font-size: 13px;">Modo Offline: Avisos no disponibles.</div>';
    }
}

/**
 * Muestra u oculta el menú de perfil
 */
function toggleProfileMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('profile-dropdown');
    const notifMenu = document.getElementById('notification-dropdown');

    // Si el menú de notificaciones está abierto, lo cerramos
    if (notifMenu && notifMenu.classList.contains('show')) {
        notifMenu.classList.remove('show');
    }

    if (menu) {
        menu.classList.toggle('show');
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
function abrirNotificacion(remitenteKey, element) {
    try {
        const remitenteName = decodeURIComponent(remitenteKey);
        const grupo = window.mensajesAgrupados ? window.mensajesAgrupados[remitenteName] : null;

        if (!grupo) return;

        // Marcar activo en la lista
        document.querySelectorAll('#notification-list .chat-item').forEach(el => el.style.background = 'transparent');
        if (element) element.style.background = '#e2e8f0';

        // Mostrar paneles
        document.getElementById('messages-empty-pane').style.display = 'none';
        const readPane = document.getElementById('messages-read-pane');
        readPane.style.display = 'flex';

        document.getElementById('messages-read-title').innerText = grupo.remitente;

        const body = document.getElementById('messages-read-body');
        let chatHtml = '';

        let lastDateStr = '';
        grupo.mensajes.forEach(notif => {
            const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
            const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            let editadoHtml = '';
            if (notif.editado_en && notif.creado_en && notif.editado_en !== notif.creado_en) {
                const editDate = new Date(notif.editado_en);
                if (Math.abs(editDate - dateObj) > 5000) {
                    editadoHtml = `<span class="ms-1 text-muted fst-italic">(Editado)</span>`;
                }
            }

            // Si cambió de día, ponemos un separador de fecha
            if (dateStr !== lastDateStr) {
                chatHtml += `
                    <div style="text-align: center; margin-bottom: 15px; margin-top: 15px;">
                        <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #64748b; font-weight: bold;">${dateStr}</span>
                    </div>
                `;
                lastDateStr = dateStr;
            }

            chatHtml += `
                <div style="background: white; padding: 12px 15px; border-radius: 18px 18px 18px 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-size: 14px; color: #1c1e21; max-width: 90%; margin-bottom: 10px; word-wrap: break-word; align-self: flex-start;">
                    <div style="font-weight: bold; color: var(--color-primary); margin-bottom: 5px; font-size: 12px;">${notif.nombre}</div>
                    ${notif.mensaje}
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 5px; text-align: right;">${timeStr} ${editadoHtml}</div>
                </div>
            `;
        });

        body.innerHTML = chatHtml;

        // Auto scroll al final del chat
        setTimeout(() => {
            body.scrollTop = body.scrollHeight;
        }, 50);

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
                window.convocatoriasDisponibles = activas;

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

    const conv = window.convocatoriasDisponibles ? window.convocatoriasDisponibles.find(c => c.id === idConvocatoria) : null;
    let idOpcionSeleccionada = null;

    if (conv && conv.opciones && conv.opciones.length > 0) {
        // Filtrar solo opciones activas
        const opcionesActivas = conv.opciones.filter(o => o.opcionConvocatoriaActiva && o.opcionPosgradoActiva);
        if (opcionesActivas.length > 0) {
            const inputOptions = {};
            opcionesActivas.forEach(opt => {
                inputOptions[opt.idConvocatoriaOpcion] = opt.nombre;
            });

            const { value: opcionElegida } = await Swal.fire({
                title: 'Selecciona una Opción',
                text: 'Esta convocatoria tiene múltiples líneas de investigación o especialidades. Por favor elige una:',
                input: 'select',
                inputOptions: inputOptions,
                inputPlaceholder: 'Selecciona una opción',
                showCancelButton: true,
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                        if (value) {
                            resolve();
                        } else {
                            resolve('Debes seleccionar una opción para continuar.');
                        }
                    });
                }
            });

            if (!opcionElegida) {
                return;
            }
            idOpcionSeleccionada = opcionElegida;
        }
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
                idC: idConvocatoria,
                idConvocatoriaOpcion: idOpcionSeleccionada
            })
        });

        if (respuestaSoli.ok) {
            const dataSoli = await respuestaSoli.json();
            currentSolicitudId = dataSoli.idSolicitud;

            // Re-hidratar la UI para traer toda la info de la solicitud y de la convocatoria
            try {
                const resReFetch = await fetch(`/api/solicitud/activa/${aspiranteData.id}`);
                if (resReFetch.ok) {
                    const newSoliData = await resReFetch.json();
                    if (newSoliData.existe) {
                        hidratarUI(newSoliData);
                    }
                }
            } catch (err) {
                bloquearConvocatorias();
            }

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

    // Configurar paneles según nivel (lógica centralizada en configurarPanelesNivel)
    configurarPanelesNivel(nivel, idConvocatoria);

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
        Swal.fire({
            title: 'Detalles de Modalidad',
            text: `Modalidad seleccionada: ${inputs.value.replace(/_/g, ' ')}`,
            icon: 'info',
            confirmButtonColor: '#8a1c24'
        });
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
    const banner = document.getElementById('banner-revision');
    const encabezado = document.getElementById('encabezado-documentos');

    // 1. Inyectar el toast flotante en el body (si no existe ya)
    if (!document.getElementById('revision-toast')) {
        const toast = document.createElement('div');
        toast.id = 'revision-toast';
        toast.className = 'revision-toast-flotante';
        toast.innerHTML = `
            <div class="revision-toast-icon">
                <i class="fa-solid fa-lock"></i>
            </div>
            <div class="revision-toast-body">
                <span class="revision-toast-title">Expediente bajo revisión</span>
                <span class="revision-toast-sub">Serás notificado si se requiere alguna corrección</span>
            </div>
            <span class="revision-toast-badge">EN REVISIÓN</span>
        `;
        document.body.appendChild(toast);
    }

    // Asegurar que el toast solo se muestre si la pestaña actual es documentos
    const toast = document.getElementById('revision-toast');
    if (toast) {
        const currentView = window.location.hash.replace('#', '') || 'inicio';
        if (currentView === 'documentos') {
            toast.style.display = 'flex';
        } else {
            toast.style.display = 'none';
        }
    }

    // 2. Convertir el banner-revision en contenedor de progreso + docs (sin el banner viejo)
    if (banner) {
        banner.style.cssText = 'display:block; background:transparent; border:none; box-shadow:none; padding:0;';
        banner.innerHTML = `
            <div class="progress-card-v2">
                <span class="progress-card-v2-label">Documentos aprobados</span>
                <div class="progress-card-v2-track">
                    <div id="barra-progreso-fill" class="progress-card-v2-fill" style="width: 0%;"></div>
                </div>
                <span id="txt-conteo-aprobados" class="progress-card-v2-count">0 / 0</span>
            </div>

            <div class="docs-scroll-card">
                <div class="docs-scroll-inner" id="docs-dinamicos-container">
                    <div style="text-align:center; padding: 30px; color:#94a3b8;">
                        <i class="fa-solid fa-spinner fa-spin"></i> Cargando tus documentos...
                    </div>
                </div>
            </div>
        `;
    }

    if (encabezado) encabezado.style.display = 'none';

    // 3. Ocultar el stepper
    const stepper = document.querySelector('.stepper-wrapper');
    if (stepper) stepper.style.display = 'none';

    // 4. Ocultar todos los paneles de estación
    document.querySelectorAll('.station-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    // 5. Ocultar panel 0 explícitamente
    const panel0 = document.getElementById('panel-estacion-0');
    if (panel0) panel0.style.display = 'none';

    // 6. Cargar documentos desde la API para el panel dinámico
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
                        container.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8;">No se encontraron documentos adjuntos.</p>';
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

    // Actualizar Barra de Progreso
    const aprobados = documentos.filter(d => d.estadoValidacion === 'APROBADO').length;
    const total = documentos.length;
    const porcentaje = total > 0 ? (aprobados / total) * 100 : 0;

    const fillBar = document.getElementById('barra-progreso-fill');
    const txtCount = document.getElementById('txt-conteo-aprobados');
    if (fillBar) fillBar.style.width = `${porcentaje}%`;
    if (txtCount) txtCount.innerText = `${aprobados} / ${total}`;

    // Agrupar por Categorías
    const grupos = {
        'IDENTIDAD Y GENERALES': [],
        'ANTECEDENTES ACADÉMICOS': [],
        'EVALUACIÓN Y OTROS': []
    };

    documentos.forEach(doc => {
        const reqLower = (doc.requisitoNombre || '').toLowerCase();
        if (reqLower.includes('acta') || reqLower.includes('curp') || reqLower.includes('identificación') || reqLower.includes('ine') || reqLower.includes('fotograf') || reqLower.includes('domicilio')) {
            grupos['IDENTIDAD Y GENERALES'].push(doc);
        } else if (reqLower.includes('título') || reqLower.includes('titulo') || reqLower.includes('cédula') || reqLower.includes('cedula') || reqLower.includes('idioma') || reqLower.includes('certificado') || reqLower.includes('grado')) {
            grupos['ANTECEDENTES ACADÉMICOS'].push(doc);
        } else {
            grupos['EVALUACIÓN Y OTROS'].push(doc);
        }
    });

    // Helper fecha
    const formatearFecha = (raw) => {
        if (!raw) return 'Subido recientemente';
        try {
            const date = new Date(raw);
            if (isNaN(date.getTime())) return `Subido el ${raw.split('T')[0]}`;
            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return `Subido el ${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
        } catch (e) {
            return 'Subido recientemente';
        }
    };

    for (const [catNombre, docsGrupo] of Object.entries(grupos)) {
        if (docsGrupo.length === 0) continue;

        html += `<div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; margin-top: 18px;">${catNombre}</div>`;
        html += `<div class="docs-grid-v2">`;

        docsGrupo.forEach(doc => {
            let badgeHtml = '';
            let iconBg = '#eef2ff';
            let iconColor = '#6366f1';
            let iconClass = 'fa-file-lines';

            const reqLower = (doc.requisitoNombre || '').toLowerCase();
            if (reqLower.includes('acta') || reqLower.includes('ine') || reqLower.includes('identificación')) {
                iconClass = 'fa-address-card';
                iconBg = '#eef2ff';
                iconColor = '#6366f1';
            } else if (reqLower.includes('curp')) {
                iconClass = 'fa-id-badge';
                iconBg = '#eef2ff';
                iconColor = '#6366f1';
            } else if (reqLower.includes('título') || reqLower.includes('titulo') || reqLower.includes('grado')) {
                iconClass = 'fa-graduation-cap';
                iconBg = '#fefce8';
                iconColor = '#ca8a04';
            } else if (reqLower.includes('cédula') || reqLower.includes('cedula') || reqLower.includes('certificado')) {
                iconClass = 'fa-certificate';
                iconBg = '#fefce8';
                iconColor = '#ca8a04';
            } else if (reqLower.includes('idioma')) {
                iconClass = 'fa-language';
                iconBg = '#fefce8';
                iconColor = '#ca8a04';
            }

            const numIntentos = doc.intentos || 1;

            switch (doc.estadoValidacion) {
                case 'APROBADO':
                    badgeHtml = `<span class="doc-badge-aprobado">APROBADO</span>`;
                    break;
                case 'RECHAZADO':
                    badgeHtml = `<span class="doc-badge-rechazado">RECHAZADO (${numIntentos}/3)</span>`;
                    break;
                default:
                    badgeHtml = `<span class="doc-badge-pendiente">PENDIENTE</span>`;
                    break;
            }

            const docDataStr = encodeURIComponent(JSON.stringify(doc));
            const fechaTxt = formatearFecha(doc.fechaSubida || doc.creadoEn || doc.fecha_actualizacion);

            html += `
                <div class="doc-card-v2" onclick="abrirModalDoc('${docDataStr}')">
                    <div class="doc-card-v2-header">
                        <div class="doc-card-v2-icon" style="background: ${iconBg}; color: ${iconColor};">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div>
                            <div class="doc-card-v2-title">${doc.requisitoNombre || 'Documento adjunto'}</div>
                            <div class="doc-card-v2-date">${fechaTxt}</div>
                        </div>
                    </div>
                    <div class="doc-card-v2-footer">
                        ${badgeHtml}
                        <span class="doc-action-ver">Ver</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    }

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
                const colorState = h.estadoValidacion === 'APROBADO' ? '#10b981' : (h.estadoValidacion === 'RECHAZADO' ? '#ef4444' : '#f59e0b');
                const comTxt = (h.comentarios && h.comentarios.trim() !== '') ? h.comentarios : 'Sin observaciones por parte del evaluador en esta solicitud.';

                historialHtml += `
                    <div style="margin-bottom: 12px; padding-bottom: 10px; ${idx < doc.historial.length - 1 ? 'border-bottom: 1px dashed #cbd5e1;' : ''}">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 2px; color: #000;">
                            <span>Solicitud ${h.intentos} - ${h.estadoValidacion}</span>
                        </div>
                        <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.4; white-space: pre-wrap;">${comTxt}</p>
                    </div>
                `;
            });
            comentariosTxt.innerHTML = historialHtml;
        }

        if (doc.estadoValidacion === 'APROBADO') {
            badge.classList.add('status-aprobado');
            badge.innerHTML = '<i class="fa-solid"></i> Aprobado';
            if (resubirContainer) resubirContainer.style.display = 'none';

        } else if (doc.estadoValidacion === 'RECHAZADO') {
            badge.classList.add('status-rechazado');
            badge.innerHTML = `<i class="fa-solid"></i> Rechazado en la Solicitud ${numIntentos}`;

            if (resubirContainer) {
                resubirContainer.style.display = 'block';
                if (numIntentos < 3) {
                    const reqNombreSanitized = encodeURIComponent(doc.requisitoNombre || 'Documento');
                    resubirContainer.innerHTML = `
                        <button onclick="iniciarReSubidaDocumento(${doc.idDocumento}, '${reqNombreSanitized}', ${numIntentos})" style="background-color: #8a1c24; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; font-size: 15px; box-shadow: 0 4px 10px rgba(138, 28, 36, 0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Re-subir (Será tu Intento ${numIntentos + 1} de 3)
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

/**
 * Actualiza la gráfica de proceso con datos reales del expediente
 * @param {number} aprobados - Documentos aprobados
 * @param {number} rechazados - Documentos rechazados
 * @param {number} total - Total de documentos
 */
function actualizarGraficaProceso(aprobados = 0, rechazados = 0, total = 5) {
    const pendientes = total - aprobados - rechazados;

    if (document.getElementById('lbl-aprobados')) document.getElementById('lbl-aprobados').innerText = aprobados;
    if (document.getElementById('lbl-rechazados')) document.getElementById('lbl-rechazados').innerText = rechazados;
    if (document.getElementById('lbl-pendientes')) document.getElementById('lbl-pendientes').innerText = pendientes;

    const porcAprobado = total > 0 ? (aprobados / total) * 100 : 0;
    const porcRechazado = total > 0 ? (rechazados / total) * 100 : 0;
    const finAprobados = porcAprobado;
    const finRechazados = finAprobados + porcRechazado;

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

function bloquearConvocatorias(soliData = null) {
    const seleccion = document.getElementById('seleccion-programa');
    const lista = document.getElementById('lista-programas-abiertos');
    const bloqueo = document.getElementById('bloqueo-convocatoria');

    if (seleccion) seleccion.style.display = 'none';
    if (lista) lista.style.display = 'none';
    if (bloqueo) {
        bloqueo.style.display = 'block';

        // Si pasamos los datos, dibujamos la tarjeta con info
        if (soliData && soliData.convocatoriaTitulo) {
            // Función robusta para formatear fechas y evitar el "1899" o "0000-00-00"
            const formatDateSafe = (dateStr) => {
                if (!dateStr || dateStr.startsWith('0000-00-00')) return 'Por definir';
                const d = new Date(dateStr);
                if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'Por definir';

                const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
            };

            const titulo = soliData.convocatoriaTitulo || 'Convocatoria Activa';
            const nivel = soliData.nivel === 'DOCTORADO' ? 'Doctorado' : 'Maestría';
            const opcionElegida = soliData.opcionElegida ? soliData.opcionElegida : 'Programa General';
            // Lógica condicional: Las maestrías típicamente no tienen entrevistas formales obligatorias
            let entrevistasHtml = '';
            if (nivel === 'Doctorado') {
                const entInicio = formatDateSafe(soliData.fechaEntrevistaInicio);
                const entFin = formatDateSafe(soliData.fechaEntrevistaFin);
                const entRango = (entInicio !== 'Por definir') ? `${entInicio} ${entFin !== 'Por definir' ? 'al ' + entFin : ''}` : 'Por definir';

                entrevistasHtml = `<li><i class="fa-solid fa-comments" style="color:var(--color-guinda); margin-right:8px; width:16px;"></i> Entrevistas: <strong>${entRango}</strong></li>`;
            }

            const infoHtml = `
                <style>
                    .slide-view {
                        grid-area: 1 / 1;
                        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
                    }
                </style>
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; text-align: center; width: 100%; margin: 20px 0; box-shadow: var(--shadow-sm); font-family: 'Inter', Arial, sans-serif; overflow: hidden;">
                    
                    <div style="background: #fcf0f1; border: 1px solid #f3d8da; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-lock" style="font-size: 24px; color: var(--color-guinda);"></i>
                    </div>
                    
                    <h3 style="font-size: 22px; font-weight: 700; color: var(--color-primary); margin-bottom: 20px;">Trámite de Admisión en Curso</h3>
                    
                    <!-- CONTENEDOR SLIDER HORIZONTAL -->
                    <div style="display: grid; width: 100%;">
                        
                        <!-- VISTA A: Resumen -->
                        <div id="view-a" class="slide-view" style="transform: translateX(0); opacity: 1;">
                            <p style="font-size: 15px; color: var(--color-text); line-height: 1.6; margin-bottom: 25px; max-width: 800px; margin-left: auto; margin-right: auto;">
                                Actualmente estás participando en el proceso de selección institucional para el:<br>
                                <strong style="color: var(--color-primary); font-size: 16px; display: inline-block; margin-top: 8px;">Programa de ${nivel} en Ciencias en Ingeniería Eléctrica</strong><br>
                                <span style="font-size: 14px; color: #64748b;">Opción seleccionada: <strong>${opcionElegida}</strong></span>
                            </p>
                            
                            <button class="btn-primary" onclick="switchView('documentos')" style="padding: 12px 30px; border-radius: 6px; font-size: 15px; font-weight: 500; margin-bottom: 25px; min-width: 250px;">
                                <i class="fa-solid" style="margin-right: 8px;"></i> Continuar mi Trámite
                            </button>
                            
                            <div>
                                <button onclick="mostrarVistaDetalles()" style="background: none; border: none; color: var(--color-guinda); font-size: 14px; font-weight: 600; cursor: pointer; padding: 5px;">
                                    Ver fechas y detalles del proceso <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>
                                </button>
                            </div>
                        </div>

                        <!-- VISTA B: Detalles -->
                        <div id="view-b" class="slide-view" style="transform: translateX(100%); opacity: 0; pointer-events: none; text-align: left;">
                            <div style="display: flex; gap: 30px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; justify-content: center;">
                                <div><i class="fa-solid fa-clock" style="color:var(--color-primary);"></i> Duración: <strong>${soliData.duracion || '4'} semestres</strong></div>
                                <div><i class="fa-solid fa-globe" style="color:var(--color-primary);"></i> Modalidad: <strong>${soliData.modalidad || 'Escolarizada'}</strong></div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; gap: 15px; text-align: left; width: 100%; margin-bottom: 25px;">
                                <div style="background: var(--color-bg); border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-circle-check" style="color:var(--color-guinda);"></i> Apertura</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-primary); font-weight: 600;">${formatDateSafe(soliData.fecha_inicio)}</div>
                                </div>
                                <div style="background: var(--color-bg); border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-file-arrow-up" style="color:var(--color-guinda);"></i> Documentos</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-primary); font-weight: 600;">${formatDateSafe(soliData.fechaFinDocumentos)}</div>
                                </div>
                                ${nivel === 'Doctorado' ? `
                                <div style="background: var(--color-bg); border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-comments" style="color:var(--color-guinda);"></i> Entrevistas</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-primary); font-weight: 600;">${formatDateSafe(soliData.fechaEntrevistaInicio)}</div>
                                </div>` : ''}
                                <div style="background: var(--color-bg); border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-bullhorn" style="color:var(--color-guinda);"></i> Resultados</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-primary); font-weight: 600;">${formatDateSafe(soliData.fecha_resultados)}</div>
                                </div>
                                <div style="background: var(--color-bg); border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-calendar-days" style="color:var(--color-guinda);"></i> Semestre</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-primary); font-weight: 600;">${formatDateSafe(soliData.fechaInicioEscolar)}</div>
                                </div>
                            </div>

                            <div style="text-align: center;">
                                <button onclick="ocultarVistaDetalles()" style="background: none; border: none; color: var(--color-guinda); font-size: 14px; font-weight: 600; cursor: pointer; padding: 5px;">
                                    <i class="fa-solid fa-arrow-left" style="margin-right: 5px;"></i> Volver al resumen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            let infoContainer = document.getElementById('bloqueo-info-convocatoria');
            if (!infoContainer) {
                infoContainer = document.createElement('div');
                infoContainer.id = 'bloqueo-info-convocatoria';
                // Insertamos antes del boton de regresar a mis documentos
                const btn = bloqueo.querySelector('button');
                bloqueo.insertBefore(infoContainer, btn);
            }
            infoContainer.innerHTML = infoHtml;
        }
    }
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
            Swal.fire('Error', 'Hubo un error al cancelar la solicitud.', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Error de red al intentar cancelar.', 'error');
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
            Swal.fire('Error', 'Error al cargar los requisitos de la convocatoria.', 'error');
        }
    } catch (e) {
        console.error("Error cargando requisitos:", e);
        Swal.fire('Error', 'Error de conexión al cargar requisitos.', 'error');
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
    bloquearConvocatorias(soliData);
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
        if (titulo) titulo.innerText = "Expediente: Doctorado FIE";
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
        if (titulo) titulo.innerText = "Expediente: Maestría FIE";
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

/* ==========================================================================
   Slider de Vista Convocatoria (Vista A / Vista B)
   ========================================================================== */

/**
 * Muestra la vista B (detalles) del slider de convocatoria activa
 */
function mostrarVistaDetalles() {
    const viewA = document.getElementById('view-a');
    const viewB = document.getElementById('view-b');
    if (!viewA || !viewB) return;
    viewA.style.transform = 'translateX(-100%)';
    viewA.style.opacity = '0';
    viewA.style.pointerEvents = 'none';
    viewB.style.transform = 'translateX(0)';
    viewB.style.opacity = '1';
    viewB.style.pointerEvents = 'auto';
}

/**
 * Muestra la vista A (resumen) del slider de convocatoria activa
 */
function ocultarVistaDetalles() {
    const viewA = document.getElementById('view-a');
    const viewB = document.getElementById('view-b');
    if (!viewA || !viewB) return;
    viewB.style.transform = 'translateX(100%)';
    viewB.style.opacity = '0';
    viewB.style.pointerEvents = 'none';
    viewA.style.transform = 'translateX(0)';
    viewA.style.opacity = '1';
    viewA.style.pointerEvents = 'auto';
}

/* ==========================================================================
   Carousel Logic (Aspirante Inicio)
   ========================================================================== */
let currentSlide = 0;
let totalSlides = 0;
let carouselTrack = null;
let carouselIndicators = [];
let autoSlideInterval;

function updateCarousel() {
    if (!carouselTrack) return;
    carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    carouselIndicators.forEach((ind, index) => {
        if (index === currentSlide) ind.classList.add('active');
        else ind.classList.remove('active');
    });
}

function moveCarousel(direction) {
    if (totalSlides === 0) return;
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    updateCarousel();
    resetAutoSlide();
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
    resetAutoSlide();
}

function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        moveCarousel(1);
    }, 5000);
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Iniciar carrusel después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    carouselTrack = document.getElementById('inicio-carousel-track');
    carouselIndicators = Array.from(document.querySelectorAll('#inicio-carousel-indicators .indicator'));
    totalSlides = document.querySelectorAll('.carousel-slide').length;

    if (carouselTrack && totalSlides > 0) {
        startAutoSlide();
    }
});

// ==========================================
// FUNCIONES DEL PANEL LATERAL DE AJUSTES
// ==========================================
function abrirDrawerAjustes() {
    document.getElementById('settings-drawer').classList.add('open');
    document.getElementById('settings-drawer-overlay').classList.add('show');
}

function cerrarDrawerAjustes() {
    document.getElementById('settings-drawer').classList.remove('open');
    document.getElementById('settings-drawer-overlay').classList.remove('show');
}
