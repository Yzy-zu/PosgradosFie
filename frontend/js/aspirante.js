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

// Manejo y persistencia de estado de la barra lateral (Sidebar)
// Bug 5 Fix: toggleSidebar() es la versión canónica definida en utils.js
// Se elimina la definición local para evitar duplicación.

function restaurarEstadoSidebar() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        if (sidebar) sidebar.classList.add('collapsed');
        if (mainContent) mainContent.classList.add('expanded');
    }
}

// Comprobación de Sesión y Estado de Registro al inicializar la página
document.addEventListener("DOMContentLoaded", async function () {
    restaurarEstadoSidebar();

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
    // Bug 1 Fix: usar /api/aspirante/me en lugar de descargar toda la tabla
    try {
        const resAspirantes = await fetch('/api/aspirante/me');
        if (resAspirantes.ok) {
            aspiranteData = await resAspirantes.json();

            if (aspiranteData && aspiranteData.id) {
                // Función auxiliar para capitalizar nombres
                const capitalizarNombre = (str) => {
                    if (!str) return "";
                    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                };
                const nombreCapitalizado = capitalizarNombre(aspiranteData.nombre);
                const apellidoCapitalizado = capitalizarNombre(aspiranteData.primerApellido);
                const nombreCompleto = `${nombreCapitalizado} ${apellidoCapitalizado}`;
                window.nombreAspiranteCompleto = nombreCompleto;
                const iniciales = getIniciales(nombreCapitalizado, apellidoCapitalizado);

                // Topbar
                const topbarNombre = document.getElementById('topbar-nombre-usuario');
                const topbarIniciales = document.getElementById('topbar-iniciales');
                const topbarFirstName = document.getElementById('topbar-first-name');
                if (topbarNombre) topbarNombre.innerText = nombreCompleto;
                if (topbarIniciales) topbarIniciales.innerText = iniciales;
                if (topbarFirstName) topbarFirstName.innerText = nombreCapitalizado.split(' ')[0];

                // Sidebar
                const sidebarNombre = document.getElementById('sidebar-nombre');
                const sidebarIniciales = document.getElementById('sidebar-iniciales');
                if (sidebarNombre) sidebarNombre.innerText = nombreCompleto;
                if (sidebarIniciales) sidebarIniciales.innerText = iniciales;

                // Menú Perfil Antiguo removido, ya no es necesario inyectar datos al dropdown


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
    if (viewId === 'documentos' && !currentSolicitudId) {
        // Redirigir a inicio o convocatorias si intenta forzar la URL sin tener una solicitud activa
        Swal.fire('Acceso Denegado', 'Debes seleccionar una convocatoria primero.', 'warning');
        window.location.hash = 'convocatorias';
        return;
    }

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

    // Controlar título/saludo en la barra superior
    const topbarGreeting = document.querySelector('.topbar-greeting');
    const topbarSubtitulo = document.getElementById('topbar-subtitulo');
    const topbarNombre = document.getElementById('topbar-nombre-usuario');

    if (topbarGreeting && topbarNombre) {
        topbarGreeting.style.display = 'flex';
        if (viewId === 'inicio') {
            if (topbarSubtitulo) topbarSubtitulo.style.display = 'block';
            topbarNombre.innerText = window.nombreAspiranteCompleto || 'Cargando...';
            cargarStatsInicio();
        } else {
            if (topbarSubtitulo) topbarSubtitulo.style.display = 'none';
            const titulos = {
                'proceso': typeof t === 'function' ? t('sb_proceso') : 'Proceso',
                'convocatorias': typeof t === 'function' ? t('sb_convocatorias') : 'Convocatorias',
                'documentos': typeof t === 'function' ? t('sb_documentos') : 'Documentos'
            };
            topbarNombre.innerText = titulos[viewId] || (viewId.charAt(0).toUpperCase() + viewId.slice(1));
            // Bug 6 Fix: cargar datos reales para la gráfica de proceso
            if (viewId === 'proceso') {
                cargarDatosProceso();
            }
        }
    }

    // Controlar la visibilidad del banner flotante de revisión (solo visible en documentos)
    const floatingBanner = document.getElementById('revision-floating-banner');
    if (floatingBanner) {
        if (viewId === 'documentos') {
            floatingBanner.style.display = 'flex';
        } else {
            floatingBanner.style.display = 'none';
        }
    }

    // Actualizar estados visuales en la barra de navegación lateral
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetNavLink = document.getElementById(`nav-${viewId}`);
    if (targetNavLink) {
        targetNavLink.classList.add('active');
    }
}

// Router Event Listener
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'inicio';
    switchView(hash);
});

/**
 * Carga las estadísticas reales de la API para el dashboard de inicio
 */
async function cargarStatsInicio() {
    if (!aspiranteData || !aspiranteData.id) return;

    const statDocsCount = document.getElementById('dash-docs-count');
    const statDocsSub = document.getElementById('dash-docs-sub');
    const statExpStatus = document.getElementById('dash-exp-status');
    const statExpSub = document.getElementById('dash-exp-sub');
    const statConvName = document.getElementById('dash-conv-name');
    const statConvSub = document.getElementById('dash-conv-sub');

    if (statDocsSub) { statDocsSub.style.display = 'block'; statDocsSub.innerText = 'Cargando...'; }
    if (statExpSub) { statExpSub.style.display = 'block'; statExpSub.innerText = 'Cargando...'; }
    if (statConvSub) { statConvSub.style.display = 'block'; statConvSub.innerText = 'Cargando...'; }

    mostrarLoader();
    try {
        const resSoli = await fetch(`/api/solicitud/activa/${aspiranteData.id}`);
        if (resSoli.ok) {
            const soliData = await resSoli.json();

            if (soliData.existe) {
                // 1. Estado de Expediente
                const cardExp = document.getElementById('stat-card-exp');
                if (statExpStatus) {
                    if (soliData.estado === 'RECHAZADO') {
                        statExpStatus.innerText = 'Expediente Rechazado';
                        statExpStatus.style.color = '';
                        if (cardExp) { cardExp.classList.add('stat-alert'); cardExp.classList.remove('stat-success'); }
                    } else if (soliData.estado === 'APROBADO') {
                        statExpStatus.innerText = 'Expediente Aprobado';
                        statExpStatus.style.color = '';
                        if (cardExp) { cardExp.classList.add('stat-success'); cardExp.classList.remove('stat-alert'); }
                    } else {
                        statExpStatus.innerText = 'Expediente Activo';
                        statExpStatus.style.color = '#10b981';
                        if (cardExp) { cardExp.classList.remove('stat-alert', 'stat-success'); }
                    }
                }
                if (statExpSub) {
                    const estado = soliData.estado === 'NUEVO' ? 'Fase Inicial' :
                        (soliData.estado === 'EN_REVISION' ? 'En Revisión' :
                            (soliData.estado === 'RECHAZADO' ? 'Requiere Atención' : soliData.estado));
                    statExpSub.innerText = estado;
                }

                // 2. Convocatoria y Documentos
                // Bug 9 Fix: renombrar variable local para no ocultar la global
                const idSolicitudActual = soliData.idSolicitud || soliData.id;

                // Fetch Convocatorias para el nombre
                const resConv = await fetch('/api/convocatorias');
                if (resConv.ok) {
                    const convocatorias = await resConv.json();
                    const convActual = convocatorias.find(c => c.id === soliData.idConvocatoria);
                    if (convActual) {
                        if (statConvName) statConvName.innerText = convActual.nombre;
                        if (statConvSub) statConvSub.innerText = convActual.nivel === 'DOCTORADO' ? 'Doctorado FIE' : 'Maestría FIE';
                    }
                }

                // Fetch Documentos subidos del aspirante
                const resExp = await fetch(`/api/aspirante/${aspiranteData.id}/expediente`);
                if (resExp.ok) {
                    const expData = await resExp.json();
                    // Bug 9 Fix: usar idSolicitudActual (variable local renombrada)
                    const soliActiva = expData.solicitudes?.find(s => s.idSolicitud === idSolicitudActual);
                    if (soliActiva && soliActiva.documentos) {
                        const docsSubidos = soliActiva.documentos.filter(d => d.rutaArchivo).length;
                        if (statDocsCount) statDocsCount.innerText = `${docsSubidos} documentos subidos`;
                        if (statDocsSub) statDocsSub.innerText = 'Revisar progreso';
                    } else {
                        if (statDocsCount) statDocsCount.innerText = '0 documentos subidos';
                        if (statDocsSub) statDocsSub.innerText = 'Comenzar a subir';
                    }
                }
            } else {
                // No hay solicitud activa
                if (statExpStatus) {
                    statExpStatus.innerText = 'Sin expediente activo';
                    statExpStatus.style.color = 'var(--color-text)';
                }
                if (statExpSub) {
                    statExpSub.innerText = 'Visita Convocatorias';
                }

                if (statConvName) statConvName.innerText = 'Ninguna seleccionada';
                if (statConvSub) statConvSub.style.display = 'none';

                if (statDocsCount) statDocsCount.innerText = '0 documentos subidos';
                if (statDocsSub) statDocsSub.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error al cargar stats de inicio:", error);
    } finally {
        ocultarLoader();
    }
}

/**
 * Bug 6 Fix: Carga datos reales del expediente para actualizar la gráfica de proceso
 */
async function cargarDatosProceso() {
    if (!aspiranteData || !aspiranteData.id || !currentSolicitudId) {
        // Sin solicitud activa: mostrar gráfica en cero
        actualizarGraficaProceso(0, 0, 0);
        return;
    }

    mostrarLoader();
    try {
        const res = await fetch(`/api/aspirante/${aspiranteData.id}/expediente`);
        if (!res.ok) return;

        const data = await res.json();
        const solicitudActiva = data.solicitudes?.find(s => s.idSolicitud === currentSolicitudId);

        if (!solicitudActiva || !solicitudActiva.documentos || solicitudActiva.documentos.length === 0) {
            actualizarGraficaProceso(0, 0, 0);
            return;
        }

        const docs = solicitudActiva.documentos;
        const total = docs.length;
        const aprobados = docs.filter(d => d.estadoValidacion === 'APROBADO').length;
        const rechazados = docs.filter(d => d.estadoValidacion === 'RECHAZADO').length;

        actualizarGraficaProceso(aprobados, rechazados, total);
    } catch (error) {
        console.error('Error al cargar datos de proceso:', error);
    } finally {
        ocultarLoader();
    }
}

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
                    badge.style.display = 'flex';
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
                    <div class="chat-item p-3 border-bottom" style="cursor: pointer; display: flex; gap: 10px; align-items: center; border-color: var(--color-border) !important;" onclick="abrirNotificacion('${remitenteKey}', this)">
                        <div class="chat-avatar ${bgClass} text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; flex-shrink: 0; background-color: var(--color-text-muted) !important;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div class="chat-details" style="flex: 1; overflow: hidden;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                                <div style="font-weight: bold; font-size: 13px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${grupo.remitente.replace('Administracion', 'Administración')}</div>
                                <div style="font-size: 11px; color: var(--color-text-muted); flex-shrink: 0;">${formattedDate}</div>
                            </div>
                            <div style="font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong style="text-transform: capitalize;">${ultMsg.nombre}</strong> - <span style="text-transform: capitalize;">${ultMsg.mensaje}</span></div>
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
 * Muestra el modal de perfil con la información del aspirante
 */
function abrirModalPerfil() {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr || !aspiranteData) return;
    const usuario = JSON.parse(usuarioStr);

    const formatDate = (dateString) => {
        if (!dateString) return typeof t === 'function' ? t('prof_no_reg') : 'No registrada';
        const d = new Date(dateString);
        return new Date(d.getTime() + Math.abs(d.getTimezoneOffset() * 60000)).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const capitalizarNombre = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const nombre = capitalizarNombre(aspiranteData.nombre);
    const apellido = capitalizarNombre(aspiranteData.primerApellido);
    const apellido2 = capitalizarNombre(aspiranteData.segundoApellido || '');
    const nombreCompleto = `${nombre} ${apellido} ${apellido2}`.trim();
    const iniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();

    const noReg = typeof t === 'function' ? t('prof_no_reg') : 'No registrado/a';
    const ninguno = typeof t === 'function' ? t('prof_ninguno') : 'Ninguno';

    const cell = (label, value, span = 1) =>
        `<div style="grid-column: span ${span};">
            <span style="display: block; font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">${label}</span>
            <strong style="color: var(--color-text); font-size: 15px; font-weight: 500;">${value || noReg}</strong>
        </div>`;

    Swal.fire({
        html: `
        <div class="pm-wrapper" style="text-align: left; background: var(--color-card-bg); position: relative; overflow: hidden; border-radius: 12px;">
            <!-- WATERMARK -->
            <div class="modal-watermark"></div>

            <!-- HEADER CLEAN -->
            <div style="padding: 35px 35px 25px; display: flex; align-items: center; gap: 24px; border-bottom: 1px solid var(--color-border); position: relative; z-index: 1;">
                <div style="width: 75px; height: 75px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; flex-shrink: 0; box-shadow: 0 4px 10px rgba(138, 28, 36, 0.2);">${iniciales}</div>
                <div>
                    <h2 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--color-text); letter-spacing: -0.5px;">${nombreCompleto}</h2>
                    <p style="margin: 6px 0 0; color: var(--color-text-muted); font-size: 15px;"><i class="fa-regular fa-envelope" style="margin-right: 5px;"></i>${usuario.correo || noReg}</p>
                    <span style="display: inline-block; margin-top: 12px; padding: 4px 12px; background: rgba(138,28,36,0.08); color: #8a1c24; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${typeof t === 'function' ? t('prof_badge') : 'Aspirante'}</span>
                </div>
            </div>

            <div style="padding: 0 35px; position: relative; z-index: 1;">
                <!-- DATOS PERSONALES -->
                <div style="padding: 30px 0; border-bottom: 1px solid var(--color-border);">
                    <h5 style="font-size: 13px; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 25px;">${typeof t === 'function' ? t('prof_personal') : 'Datos Personales'}</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                        ${cell(typeof t === 'function' ? t('prof_curp') : 'CURP', (aspiranteData.curp || '').toUpperCase())}
                        ${cell(typeof t === 'function' ? t('prof_tel') : 'Teléfono', aspiranteData.telefono)}
                        ${cell(typeof t === 'function' ? t('prof_nacimiento') : 'Nacimiento', formatDate(aspiranteData.fechaNacimiento))}
                        ${cell(typeof t === 'function' ? t('prof_estado_civil') : 'Estado Civil', aspiranteData.estadoCivil)}
                        ${cell(typeof t === 'function' ? t('prof_cp') : 'Cód. Postal', aspiranteData.direccionPostal)}
                        ${cell(typeof t === 'function' ? t('prof_direccion') : 'Dirección', aspiranteData.direccion, 3)}
                    </div>
                </div>

                <!-- FORMACIÓN ACADÉMICA -->
                <div style="padding: 30px 0; border-bottom: 1px solid var(--color-border);">
                    <h5 style="font-size: 13px; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 25px;">${typeof t === 'function' ? t('prof_academica') : 'Formación Académica'}</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                        ${cell(typeof t === 'function' ? t('prof_lic') : 'Licenciatura', aspiranteData.licenciatura)}
                        ${cell(typeof t === 'function' ? t('prof_inst') : 'Institución', aspiranteData.institucionLicenciatura)}
                        ${cell(typeof t === 'function' ? t('prof_promedio') : 'Promedio', aspiranteData.promedio)}
                        ${cell(typeof t === 'function' ? t('prof_egreso') : 'Fecha Egreso', formatDate(aspiranteData.fechaEgreso))}
                        ${cell(typeof t === 'function' ? t('prof_titulacion') : 'Titulación', formatDate(aspiranteData.fechaTitulacion))}
                        ${cell(typeof t === 'function' ? t('prof_otros') : 'Otros Estudios', aspiranteData.otrosEstudios || ninguno, 3)}
                    </div>
                </div>

                <!-- DATOS LABORALES -->
                <div style="padding: 30px 0 35px;">
                    <h5 style="font-size: 13px; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 25px;">${typeof t === 'function' ? t('prof_laborales') : 'Datos Laborales'}</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                        ${cell(typeof t === 'function' ? t('prof_ocupacion') : 'Ocupación', aspiranteData.ocupacion)}
                        ${cell(typeof t === 'function' ? t('prof_ciudad') : 'Ciudad', aspiranteData.ciudadOcupacion)}
                        ${cell(typeof t === 'function' ? t('prof_estado') : 'Estado', aspiranteData.estadoOcupacion)}
                        ${cell(typeof t === 'function' ? t('prof_tel_lab') : 'Tel. Laboral', aspiranteData.telefonoOcupacion)}
                    </div>
                </div>
            </div>
        </div>`,
        showConfirmButton: true,
        confirmButtonText: typeof t === 'function' ? t('prof_btn_cerrar') : 'Cerrar',
        buttonsStyling: false,
        width: '1050px',
        customClass: {
            popup: 'pm-popup',
            confirmButton: 'pm-btn-close',
            htmlContainer: 'pm-html-container'
        }
    });
}



/**
 * Muestra u oculta el menú de notificaciones
 */
function toggleNotificationMenu(event) {
    event.stopPropagation(); // Evitar que se propague al document
    const menu = document.getElementById('notification-dropdown');

    if (menu) {
        menu.classList.toggle('show');
    }
}

// Cerrar los menús al hacer click fuera
document.addEventListener('click', function (event) {
    const notificationMenu = document.getElementById('notification-dropdown');

    if (notificationMenu && notificationMenu.classList.contains('show') && !event.target.closest('.notification-container')) {
        notificationMenu.classList.remove('show');
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
        if (element) element.style.background = 'var(--color-border)';

        // Mostrar paneles
        document.getElementById('messages-empty-pane').style.display = 'none';
        const readPane = document.getElementById('messages-read-pane');
        readPane.style.display = 'flex';

        document.getElementById('messages-read-title').innerText = grupo.remitente.replace('Administracion', 'Administración');

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
                        <span style="background: var(--color-border); padding: 2px 10px; border-radius: 12px; font-size: 11px; color: var(--color-text-muted); font-weight: bold;">${dateStr}</span>
                    </div>
                `;
                lastDateStr = dateStr;
            }

            chatHtml += `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); padding: 12px 15px; border-radius: 14px 14px 14px 4px; box-shadow: var(--shadow-sm); font-size: 13.5px; color: var(--color-text); max-width: 90%; margin-bottom: 10px; word-wrap: break-word; align-self: flex-start;">
                    <div style="font-weight: bold; color: var(--color-text); margin-bottom: 5px; font-size: 13px; text-transform: capitalize;">${notif.nombre}</div>
                    ${notif.mensaje}
                    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 5px; text-align: right;">${timeStr} ${editadoHtml}</div>
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
    const navDocumentos = document.getElementById('li-nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'none';
    }

    const panelSeleccion = document.getElementById('seleccion-programa');
    const panelListaAbierta = document.getElementById('lista-programas-abiertos');
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas-programas');

    if (panelSeleccion) {
        panelSeleccion.style.display = 'none';
        panelSeleccion.classList.remove('fade-in');
    }
    if (panelListaAbierta) {
        panelListaAbierta.style.display = 'block';
        void panelListaAbierta.offsetWidth;
        panelListaAbierta.classList.add('fade-in');
    }

    if (contenedorTarjetas) {
        contenedorTarjetas.innerHTML = "<p>Cargando convocatorias...</p>";
        let htmlConvocatorias = '';
        let nivel = nombrePrograma.includes('Doctorado') ? 'DOCTORADO' : 'MAESTRIA';
        nivelAcademicoSeleccionado = nivel === 'DOCTORADO' ? 'Doctorado' : 'Maestría';

        mostrarLoader();
        try {
            const respuesta = await fetch('/api/convocatorias');
            if (respuesta.ok) {
                const convocatorias = await respuesta.json();
                const activas = convocatorias.filter(c => c.estado === 'Activa' && c.tipo === nivel);
                window.convocatoriasDisponibles = activas;

                const ofertaTxt = typeof t === 'function' ? t('conv_oferta_desbloqueada') : 'Oferta Académica Desbloqueada:';
                const nivelTxt = nivel === 'DOCTORADO' ? (typeof t === 'function' ? t('sb_doctorados') || 'Doctorados' : 'Doctorados') : (typeof t === 'function' ? t('sb_maestrias') || 'Maestrías' : 'Maestrías');
                htmlConvocatorias = `<h3 style="color: var(--color-text); font-weight: 700; margin-bottom: 15px;">${ofertaTxt} ${nivelTxt} FIE</h3>`;

                if (activas.length === 0) {
                    htmlConvocatorias += `<p style="color: var(--color-text-muted);">${typeof t === 'function' ? t('conv_sin_abiertas') : 'No hay convocatorias abiertas en este momento para este nivel.'}</p>`;
                } else {
                    activas.forEach(c => {
                        // Formatear fechas
                        const langCode = (typeof getIdiomaActual === 'function' && getIdiomaActual() === 'en') ? 'en-US' : 'es-ES';
                        const fechaCierre = new Date(c.fecha_fin).toLocaleDateString(langCode, { day: 'numeric', month: 'long' });

                        htmlConvocatorias += `
                            <div class="convocatoria-item" style="margin-bottom: 20px; padding: 20px; border: 1px solid var(--color-border); border-radius: 10px; background-color: var(--color-card-bg); box-shadow: var(--shadow-sm); transition: transform 0.2s, box-shadow 0.2s;">
                                <h4 style="margin: 0 0 8px 0; color: var(--color-text); font-size: 1.15rem; font-weight: 700;">${c.nombre}</h4>
                                <p style="margin: 0 0 8px 0; color: var(--color-text-muted); font-size: 0.95rem;"><strong>${c.posgrado_nombre || ''}</strong></p>
                                <p style="margin: 0 0 15px 0; color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.5;">${c.descripcion || (typeof t === 'function' ? t('conv_sin_desc') : 'Sin descripción disponible.')}</p>
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-top: 1px solid var(--color-border); padding-top: 15px;">
                                    <div style="font-size: 13.5px; color: var(--color-text-muted);">
                                        <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; margin-right: 10px; display: inline-flex; align-items: center; gap: 6px;">
                                            <i class="fa-solid fa-circle-check"></i> ${typeof t === 'function' ? t('conv_abierta') : 'Abierta'}
                                        </span>
                                        <strong>${typeof t === 'function' ? t('conv_cierre') : 'Cierre'}:</strong> ${fechaCierre}
                                    </div>
                                    <button class="btn-primary" style="width: auto; padding: 8px 18px; font-size: 13.5px; font-weight: 600; border-radius: 6px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;" onclick="prepararFlujoEstaciones('${nivelAcademicoSeleccionado}', ${c.id})">
                                        <i class="fa-solid fa-pen-to-square"></i> ${typeof t === 'function' ? t('conv_btn_iniciar') : 'Iniciar Proceso de Registro'}
                                    </button>
                                </div>
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
        } finally {
            ocultarLoader();
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
    mostrarLoader();
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
            ocultarLoader();
            Swal.fire('Aviso', errData.mensaje, 'warning');
            return;
        } else {
            ocultarLoader();
            Swal.fire('Error', 'Hubo un error al crear la solicitud en el servidor.', 'error');
            return;
        }
    } catch (e) {
        console.error(e);
        ocultarLoader();
        Swal.fire('Error', 'Fallo de conexión al crear solicitud.', 'error');
        return;
    }
    ocultarLoader();

    if (idConvocatoria) sessionStorage.setItem('idConvocatoriaPendiente', idConvocatoria);
    nivelAcademicoSeleccionado = nivel;

    // Mostrar pestaña de Documentos ahora que ya seleccionó convocatoria
    const navDocumentos = document.getElementById('li-nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block';
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
        // Bug 8 Fix: rastrear fallos de subida y notificar al usuario
        const fallos = [];
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
                        fallos.push(file.name || name);
                    }
                } catch (e) {
                    console.error("Error en petición de subida:", e);
                    fallos.push(file.name || name);
                }
            }
        }
        // Notificar al usuario si algún archivo falló
        if (fallos.length > 0) {
            ocultarLoader();
            await Swal.fire({
                title: 'Advertencia',
                html: `Los siguientes archivos no pudieron subirse:<br><strong>${fallos.join('<br>')}</strong><br><br>Puedes intentar subirlos de nuevo más tarde.`,
                icon: 'warning',
                confirmButtonColor: '#8a1c24'
            });
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
            card.style.backgroundColor = 'var(--color-guinda)';
            card.style.borderColor = 'var(--color-guinda)';
            card.style.borderStyle = 'solid';
            if (strongText) strongText.style.color = '#ffffff';
        } else {
            // Estilo normal (punteado)
            card.style.backgroundColor = 'var(--color-card-bg)';
            card.style.borderColor = 'var(--color-guinda)';
            card.style.borderStyle = 'dashed';
            if (strongText) strongText.style.color = 'var(--color-text)';
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

// Bloquear toda la UI de carga cuando el expediente esté bajo revisión o con dictamen
async function bloquearInterfazPorRevision(estadoActual = 'EN_REVISION') {
    const banner = document.getElementById('banner-revision');
    const encabezado = document.getElementById('encabezado-documentos');

    // 1. Eliminar cualquier toast flotante anterior al pie de página
    const oldToast = document.getElementById('revision-toast');
    if (oldToast) oldToast.remove();

    // 2. Construir la vista integrada dentro de banner-revision (banner superior + barra de progreso + grid sin caja exterior)
    if (banner) {
        banner.style.cssText = 'display:block; background:transparent; border:none; box-shadow:none; padding:0; margin-bottom: 20px;';

        let textBanner = 'Expediente bajo revisión';
        let textSub = 'Serás notificado si se requiere alguna corrección';
        let badge = 'EN REVISIÓN';
        let statusKey = 'en_revision';
        let iconClass = 'fa-solid fa-lock';

        if (estadoActual === 'RECHAZADO') {
            textBanner = 'Expediente Rechazado';
            textSub = 'Revisa los comentarios y corrige los documentos necesarios';
            badge = 'RECHAZADO';
            statusKey = 'rechazado';
            iconClass = 'fa-solid fa-circle-xmark';
        } else if (estadoActual === 'APROBADO') {
            textBanner = 'Expediente Aprobado';
            textSub = 'Felicidades, tu expediente ha sido validado satisfactoriamente';
            badge = 'APROBADO';
            statusKey = 'aprobado';
            iconClass = 'fa-solid fa-circle-check';
        }

        banner.innerHTML = `
            <!-- Banner Integrado Dinámico -->
            <div class="status-banner status-${statusKey}">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="status-banner-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div>
                        <div class="status-banner-title">${textBanner}</div>
                        <div class="status-banner-sub">${textSub}</div>
                    </div>
                </div>
                <div>
                    <span class="status-banner-badge">${badge}</span>
                </div>
            </div>

            <!-- Barra de Progreso Respirable con Conteo -->
            <div class="progress-card-v2">
                <div class="progress-card-v2-header">
                    <span class="progress-card-v2-label" data-i18n="doc_docs_aprobados">${typeof t === 'function' ? t('doc_docs_aprobados') : 'Documentos aprobados'}</span>
                    <span id="txt-conteo-aprobados" class="progress-card-v2-count">0 / 0</span>
                </div>
                <div class="progress-card-v2-track">
                    <div id="barra-progreso-fill" class="progress-card-v2-fill" style="width: 0%;"></div>
                </div>
            </div>

            <!-- Contenedor Directo de Tarjetas (Sin caja exterior con borde) -->
            <div id="docs-dinamicos-container" style="margin-top: 15px; padding-bottom: 80px;">
                <div class="docs-empty-state">
                    <i class="fa-solid fa-folder-open fa-3x mb-3 text-muted"></i>
                    <p class="text-muted" data-i18n="doc_no_encontrado">${typeof t === 'function' ? t('doc_no_encontrado') : 'No se encontraron documentos adjuntos.'}</p>
                </div>
            </div>
        `;
    }

    // Ya no inyectamos revision-floating-banner en el body para mantener el flujo en el DOM
    let oldFloating = document.getElementById('revision-floating-banner');
    if (oldFloating) oldFloating.style.display = 'none';

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
        mostrarLoader();
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
        } finally {
            ocultarLoader();
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

    const formatearPeso = (bytes) => {
        if (!bytes || isNaN(bytes)) return null;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${bytes} B`;
    };

    const formatearFecha = (raw, estado, pesoStr) => {
        if (estado === 'APROBADO') {
            try {
                if (!raw) return 'Aprobado recientemente';
                const date = new Date(raw);
                if (isNaN(date.getTime())) return `Aprobado el ${raw.split('T')[0]}`;
                const isEn = typeof getIdiomaActual === 'function' && getIdiomaActual() === 'en';
                const langCode = isEn ? 'en-US' : 'es-ES';
                const dateStr = date.toLocaleDateString(langCode, { day: 'numeric', month: 'short', year: 'numeric' });
                return `Aprobado el ${dateStr}`;
            } catch (e) {
                return 'Aprobado recientemente';
            }
        }
        return pesoStr ? `PDF · ${pesoStr}` : 'PDF';
    };

    const catKeyMap = {
        'IDENTIDAD Y GENERALES': 'cat_identidad',
        'ANTECEDENTES ACADÉMICOS': 'cat_academico',
        'EVALUACIÓN Y OTROS': 'cat_evaluacion'
    };

    for (const [catNombre, docsGrupo] of Object.entries(grupos)) {
        if (docsGrupo.length === 0) continue;

        const catTraducida = typeof t === 'function' ? (t(catKeyMap[catNombre]) || catNombre) : catNombre;
        html += `<div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; margin-top: 18px;">${catTraducida}</div>`;
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
                iconBg = '#fef08a';
                iconColor = '#a16207';
            } else if (reqLower.includes('cédula') || reqLower.includes('cedula') || reqLower.includes('certificado')) {
                iconClass = 'fa-certificate';
                iconBg = '#fef08a';
                iconColor = '#a16207';
            } else if (reqLower.includes('idioma')) {
                iconClass = 'fa-language';
                iconBg = '#fef08a';
                iconColor = '#a16207';
            }

            const numIntentos = doc.intentos || 1;

            switch (doc.estadoValidacion) {
                case 'APROBADO':
                    badgeHtml = `<span class="doc-badge doc-badge-aprobado"><span class="doc-badge-dot"></span>${typeof t === 'function' ? t('doc_aprobado') : 'Aprobado'}</span>`;
                    break;
                case 'RECHAZADO':
                    badgeHtml = `<span class="doc-badge doc-badge-rechazado"><span class="doc-badge-dot"></span>${typeof t === 'function' ? t('doc_rechazado') : 'Rechazado'}</span>`;
                    break;
                default:
                    badgeHtml = `<span class="doc-badge doc-badge-pendiente"><span class="doc-badge-dot"></span>${typeof t === 'function' ? t('doc_pendiente') : 'Pendiente'}</span>`;
                    break;
            }

            // Fetch real file size asynchronously via HEAD request
            const rutaArchivo = doc.rutaArchivo;
            const cardId = `doc-card-${doc.idDocumento || doc.id || Math.random().toString(36).slice(2)}`;
            const fechaSubidaStr = formatearFecha(doc.fechaSubida || doc.creadoEn || doc.fecha_actualizacion, doc.estadoValidacion, null);
            const docDataStr = encodeURIComponent(JSON.stringify(doc));

            html += `
                <div class="doc-card-v2" id="${cardId}" onclick="abrirModalDoc('${docDataStr}')">
                    <div class="doc-card-v2-header">
                        <div class="doc-card-v2-icon" style="background: ${iconBg}; color: ${iconColor};">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div>
                            <div class="doc-card-v2-title">${doc.requisitoNombre ? (typeof t === 'function' ? t(doc.requisitoNombre) : doc.requisitoNombre) : (typeof t === 'function' ? t('doc_doc_adjunto') : 'Documento adjunto')}</div>
                            <div class="doc-card-v2-date" id="${cardId}-size">${fechaSubidaStr}</div>
                        </div>
                    </div>
                    <div class="doc-card-v2-footer">
                        ${badgeHtml}
                        <span class="doc-action-ver">${typeof t === 'function' ? t('doc_ver_doc') : 'Ver Documento'}</span>
                    </div>
                </div>
            `;

            // After building HTML, fetch file size in background
            if (rutaArchivo && doc.estadoValidacion !== 'APROBADO') {
                (async () => {
                    try {
                        const res = await fetch(`/uploads/${rutaArchivo}`, { method: 'HEAD' });
                        const cl = res.headers.get('content-length');
                        const pesoStr = formatearPeso(parseInt(cl, 10));
                        const sizeEl = document.getElementById(`${cardId}-size`);
                        if (sizeEl && pesoStr) sizeEl.textContent = `PDF · ${pesoStr}`;
                    } catch (_) { /* silently ignore */ }
                })();
            }
        }); // end docsGrupo.forEach

        html += `</div>`;
    }

    container.innerHTML = html;
}


function abrirModalDoc(docStr) {
    try {
        const doc = JSON.parse(decodeURIComponent(docStr));

        document.getElementById('modal-doc-titulo').innerText = typeof t === 'function' ? t('doc_detalles') : 'Detalles del Documento';
        document.getElementById('modal-doc-requisito').innerText = doc.requisitoNombre ? (typeof t === 'function' ? t(doc.requisitoNombre) : doc.requisitoNombre) : (typeof t === 'function' ? t('doc_doc_adjunto') : 'Documento adjunto');

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
                let comTxt = h.comentarios || (typeof t === 'function' ? t('doc_sin_obs') : 'Sin observaciones por parte del evaluador en esta solicitud.');
                const colorState = h.estadoValidacion === 'APROBADO' ? '#10b981' : (h.estadoValidacion === 'RECHAZADO' ? '#ef4444' : '#f59e0b');

                let stateText = h.estadoValidacion;
                if (typeof t === 'function') {
                    if (stateText === 'APROBADO') stateText = t('doc_aprobado');
                    else if (stateText === 'RECHAZADO') stateText = t('doc_rechazado');
                    else stateText = t('doc_pendiente');
                }

                historialHtml += `
                    <div style="margin-bottom: 12px; padding-bottom: 10px; ${idx < doc.historial.length - 1 ? 'border-bottom: 1px dashed #cbd5e1;' : ''}">
                        <div class="modal-doc-comments-title" style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 2px;">
                            <span>${typeof t === 'function' ? t('doc_solicitud') : 'Solicitud'} ${h.intentos} - ${stateText}</span>
                        </div>
                        <p class="modal-doc-comments-text" style="margin: 0; font-size: 13.5px; line-height: 1.4; white-space: pre-wrap;">${comTxt}</p>
                    </div>
                `;
            });
            comentariosTxt.innerHTML = historialHtml;
        }

        if (doc.estadoValidacion === 'APROBADO') {
            badge.classList.add('status-aprobado');
            badge.innerHTML = `<i class="fa-solid"></i> ${typeof t === 'function' ? t('doc_aprobado') : 'Aprobado'}`;
            if (resubirContainer) resubirContainer.style.display = 'none';

        } else if (doc.estadoValidacion === 'RECHAZADO') {
            badge.classList.add('status-rechazado');
            badge.innerHTML = `<i class="fa-solid"></i> ${typeof t === 'function' ? t('doc_rechazado') : 'Rechazado'}`;

            if (resubirContainer) {
                resubirContainer.style.display = 'block';
                if (numIntentos < 3) {
                    const reqNombreSanitized = encodeURIComponent(doc.requisitoNombre || 'Documento');
                    resubirContainer.innerHTML = `
                        <button onclick="iniciarReSubidaDocumento(${doc.idDocumento}, '${reqNombreSanitized}', ${numIntentos})" style="background-color: #8a1c24; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; font-size: 15px; box-shadow: 0 4px 10px rgba(138, 28, 36, 0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-cloud-arrow-up"></i> ${typeof t === 'function' ? t('doc_resubir_btn') : 'Re-subir'} ${typeof t === 'function' ? t('doc_intento_txt1') : '(Será tu Intento'} ${numIntentos + 1} ${typeof t === 'function' ? t('doc_intento_txt2') : 'de 3)'}
                        </button>
                    `;
                } else {
                    resubirContainer.innerHTML = `
                        <div style="background-color: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-ban"></i> ${typeof t === 'function' ? t('doc_limite_alcanzado') : 'Se ha alcanzado el límite máximo de 3 intentos para este documento.'}
                        </div>
                    `;
                }
            }

        } else {
            badge.classList.add('status-pendiente');
            badge.innerHTML = '<i class="fa-solid fa-clock"></i> ' + (typeof t === 'function' ? t('doc_en_revision') : 'En Revisión');
            if (resubirContainer) resubirContainer.style.display = 'none';
        }

        const enlace = document.getElementById('modal-doc-enlace');
        if (doc.rutaArchivo) {
            // Bug 10 Fix: usar ruta autenticada en lugar de /uploads/ directo
            const token = sessionStorage.getItem('token') || '';
            enlace.href = `/api/files/${doc.rutaArchivo}?token=${encodeURIComponent(token)}`;
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


    const panelSeleccion = document.getElementById('seleccion-programa');
    const panelListaAbierta = document.getElementById('lista-programas-abiertos');

    if (panelListaAbierta) {
        panelListaAbierta.style.display = 'none';
        panelListaAbierta.classList.remove('fade-in');
    }

    if (panelSeleccion) {
        panelSeleccion.style.display = 'flex';
        void panelSeleccion.offsetWidth;
        panelSeleccion.classList.add('fade-in');
    }

    // 3. Ocultar la pestaña de documentos si nos regresamos
    const navDocumentos = document.getElementById('li-nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'none';
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
                <div style="background: var(--color-card-bg); border: none; border-radius: 12px; padding: 40px; text-align: center; width: 100%; max-width: 900px; margin: 20px auto; box-shadow: var(--shadow-md); font-family: 'Inter', Arial, sans-serif; overflow: hidden;">
                    
                    <div style="background: #fef3c7; border: 1px solid #fcd34d; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-arrows-rotate fa-spin-pulse" style="font-size: 24px; color: #d97706; --fa-animation-duration: 3s;"></i>
                    </div>
                    
                    <h3 style="font-size: 22px; font-weight: 700; color: var(--color-text); margin-bottom: 20px;">${typeof t === 'function' ? t('conv_tramite_curso') : 'Trámite de Admisión en Curso'}</h3>
                    
                    <!-- CONTENEDOR SLIDER HORIZONTAL -->
                    <div style="display: grid; width: 100%;">
                        
                        <!-- VISTA A: Resumen -->
                        <div id="view-a" class="slide-view" style="transform: translateX(0); opacity: 1;">
                            <p style="font-size: 15px; color: var(--color-text); line-height: 1.6; margin-bottom: 25px; max-width: 800px; margin-left: auto; margin-right: auto;">
                                ${typeof t === 'function' ? t('conv_participando') : 'Actualmente estás participando en el proceso de selección institucional para el:'}<br>
                                <strong style="color: var(--color-text); font-size: 16px; display: inline-block; margin-top: 8px;">Programa de ${nivel} en Ciencias en Ingeniería Eléctrica</strong><br>
                                <span style="font-size: 14px; color: var(--color-text-muted);">${typeof t === 'function' ? t('conv_opcion_sel') : 'Opción seleccionada:'} <strong>${opcionElegida}</strong></span>
                            </p>
                            
                            <button class="btn-primary" onclick="switchView('documentos')" style="background-color: #1e293b; color: #ffffff; padding: 12px 30px; border-radius: 6px; font-size: 15px; font-weight: 600; margin-bottom: 25px; min-width: 250px; border: none; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#0f172a'" onmouseout="this.style.backgroundColor='#1e293b'">
                                <i class="fa-solid fa-arrow-right" style="margin-right: 8px;"></i> ${typeof t === 'function' ? t('conv_btn_continuar') : 'Continuar mi Trámite'}
                            </button>
                            
                            <div>
                                <button onclick="mostrarVistaDetalles()" style="background: none; border: none; color: var(--color-info); font-size: 14px; font-weight: 600; cursor: pointer; padding: 5px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary-hover)'" onmouseout="this.style.color='var(--color-info)'">
                                    ${typeof t === 'function' ? t('conv_btn_fechas') : 'Ver fechas y detalles del proceso'} <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>
                                </button>
                            </div>
                        </div>

                        <!-- VISTA B: Detalles -->
                        <div id="view-b" class="slide-view" style="transform: translateX(100%); opacity: 0; pointer-events: none; text-align: left;">
                            <div style="display: flex; gap: 30px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); justify-content: center;">
                                <div><i class="fa-solid fa-clock" style="color:var(--color-text-muted);"></i> <span style="color:var(--color-text-muted);">${typeof t === 'function' ? t('conv_duracion') : 'Duración:'}</span> <strong style="color:var(--color-text);">${soliData.duracion || '4'} semestres</strong></div>
                                <div><i class="fa-solid fa-globe" style="color:var(--color-text-muted);"></i> <span style="color:var(--color-text-muted);">${typeof t === 'function' ? t('conv_modalidad') : 'Modalidad:'}</span> <strong style="color:var(--color-text);">${soliData.modalidad || 'Escolarizada'}</strong></div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; gap: 15px; text-align: left; width: 100%; margin-bottom: 25px;">
                                <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-circle-check" style="color:var(--color-text-muted);"></i> ${typeof t === 'function' ? t('conv_apertura') : 'Apertura'}</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-text); font-weight: 600;">${formatDateSafe(soliData.fecha_inicio)}</div>
                                </div>
                                <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-file-arrow-up" style="color:var(--color-text-muted);"></i> ${typeof t === 'function' ? t('conv_docs') : 'Documentos'}</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-text); font-weight: 600;">${formatDateSafe(soliData.fechaFinDocumentos)}</div>
                                </div>
                                ${nivel === 'Doctorado' ? `
                                <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-comments" style="color:var(--color-text-muted);"></i> ${typeof t === 'function' ? t('conv_entrevistas') : 'Entrevistas'}</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-text); font-weight: 600;">${formatDateSafe(soliData.fechaEntrevistaInicio)}</div>
                                </div>` : ''}
                                <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-bullhorn" style="color:var(--color-text-muted);"></i> ${typeof t === 'function' ? t('conv_resultados') : 'Resultados'}</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-text); font-weight: 600;">${formatDateSafe(soliData.fecha_resultados)}</div>
                                </div>
                                <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 15px; border-radius: 8px; flex: 1;">
                                    <span style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold;"><i class="fa-solid fa-calendar-days" style="color:var(--color-text-muted);"></i> ${typeof t === 'function' ? t('conv_semestre') : 'Semestre'}</span>
                                    <div style="font-size: 14px; margin-top: 6px; color: var(--color-text); font-weight: 600;">${formatDateSafe(soliData.fechaInicioEscolar)}</div>
                                </div>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <button onclick="ocultarVistaDetalles()" style="background: none; border: none; color: var(--color-text-muted); font-size: 14px; font-weight: 600; cursor: pointer; padding: 10px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">
                                    <i class="fa-solid fa-arrow-left" style="margin-right: 5px;"></i> ${typeof t === 'function' ? t('conv_volver_resumen') : 'Volver al resumen'}
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

            // Bug 7 Fix: null-check antes de acceder al elemento
            const navDocumentos = document.getElementById('li-nav-documentos');
            if (navDocumentos) navDocumentos.style.display = 'none';

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

    mostrarLoader();
    try {
        const res = await fetch('/api/solicitud/modalidades');
        if (res.ok) {
            const modalidades = await res.json();
            contenedor.innerHTML = '';

            modalidades.forEach((mod, index) => {
                const titulo = mod.replace(/_/g, ' ').replace(/\w\S*/g, w => (w.replace(/^\w/, c => c.toUpperCase())));
                const checkedStr = index === 0 ? 'checked' : '';

                contenedor.innerHTML += `
                    <label class="radio-card" style="display:block; flex: 1 1 220px; min-width: 220px; position:relative; padding:20px; border-radius:10px; border:2px dashed var(--color-guinda); cursor:pointer; text-align:center; background-color: var(--color-card-bg); margin: 10px;">
                        <input type="radio" name="modalidad" value="${mod}" ${checkedStr} onchange="actualizarCostosAdmision()" style="position:absolute; opacity:0; width:0; height:0;">
                        <div class="radio-content" style="pointer-events:none;">
                            <strong style="display:block; font-size:16px; color: var(--color-guinda); margin-bottom:5px;">${index + 1}. ${typeof t === 'function' ? t('mod_' + mod.toLowerCase()) : titulo}</strong>
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
    } finally {
        ocultarLoader();
    }
}


async function cargarRequisitosDocumentales(idConvocatoria) {
    mostrarLoader();
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
    } finally {
        ocultarLoader();
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
    const navDocumentos = document.getElementById('li-nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block';
    }

    // Configurar paneles según el nivel
    configurarPanelesNivel(nivelAcademicoSeleccionado, soliData.idConvocatoria);

    // Mover a la estación donde se quedó
    if (estacionGuardada > 0) {
        cambiarEstacion(Math.min(estacionGuardada, 3));
    }

    // Bloquear si está en revisión, rechazado o aprobado
    if (['EN_REVISION', 'RECHAZADO', 'APROBADO'].includes(soliData.estado)) {
        bloquearInterfazPorRevision(soliData.estado);
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
    // La altura la maneja CSS (aspect-ratio: 16/5) — sin dependencia de onload
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
        // Asegurarse de que el primer slide asigne la altura inicial correctamente
        const firstImg = document.querySelector('.carousel-slide img');
        if (firstImg) {
            if (firstImg.complete) {
                updateCarousel();
            } else {
                firstImg.onload = () => updateCarousel();
            }
        } else {
            updateCarousel();
        }
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
