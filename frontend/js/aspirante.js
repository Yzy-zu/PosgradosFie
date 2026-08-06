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
        if (aspiranteData && aspiranteData.id) {
            fetch(`/api/solicitud/activa/${aspiranteData.id}`)
                .then(res => res.json())
                .then(soliData => {
                    if (soliData && soliData.existe) {
                        hidratarUI(soliData);
                    }
                })
                .catch(e => console.error("Error actualizando inicio:", e));
        }
    } else if (currentHash === '#documentos' || currentHash === '#admision') {
        if (aspiranteData && aspiranteData.id) {
            fetch(`/api/solicitud/activa/${aspiranteData.id}`)
                .then(res => res.json())
                .then(soliData => {
                    if (soliData && soliData.existe) {
                        hidratarUI(soliData);
                    }
                })
                .catch(e => console.error("Error validando estado de solicitud:", e));
        }
    } else if (currentHash === '#convocatorias') {
        // Antes de renderizar la lista, verificar si ya hay solicitud activa.
        // Si la hay, mantener la tarjeta de solicitud activa en lugar de sobreescribirla.
        if (aspiranteData && aspiranteData.id) {
            fetch(`/api/solicitud/activa/${aspiranteData.id}`)
                .then(res => res.json())
                .then(soliData => {
                    if (soliData && soliData.existe) {
                        hidratarUI(soliData); // Conservar la tarjeta de solicitud activa
                    } else {
                        cargarConvocatorias(); // Solo mostrar lista si no hay solicitud
                    }
                })
                .catch(() => cargarConvocatorias()); // Fallback seguro
        } else {
            cargarConvocatorias();
        }
    }
});

// Manejo y persistencia de estado de la barra lateral (Sidebar)
// Bug 5 Fix: toggleSidebar() es la versión canónica definida en utils.js
// Se elimina la definición local para evitar duplicación.

// BUG-07 Fix: restaurarEstadoSidebar() ya es manejada por utils.js (DOMContentLoaded).
// Se mantiene como no-op para no romper la llamada en línea 37 en caso de orden de carga.
function restaurarEstadoSidebar() {
    // Delegado a utils.js — no duplicar lógica
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

                // Menú Perfil Antiguo removido, ya no es necesario inyectar datos al dropdown


                // Cargar modalidades de admisión dinámicas
                cargarModalidadesAdmision();

                // Cargar notificaciones al iniciar sesión
               cargarNotificaciones();
               cargarDictamen();

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
                            let targetHash = currentHash;
                            if (!currentHash || currentHash === 'inicio') {
                                targetHash = (soliData.etapaOrden && soliData.etapaOrden > 1) ? 'documentos' : 'inicio';
                            }
                            window.location.hash = targetHash;
                            switchView(targetHash);

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
    const fallbackHash = window.location.hash.replace('#', '') || 'inicio';
    window.location.hash = fallbackHash;
    switchView(fallbackHash);
});



/**
 * Control del cambio de paneles (Navegación lateral con Hash Router)
 */
function switchView(viewId) {
    if (typeof cerrarSidebarMobile === 'function') {
        cerrarSidebarMobile();
    }

    if ((viewId === 'documentos' || viewId === 'proceso') && !currentSolicitudId) {
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
    const topbarNombre = document.getElementById('topbar-nombre-usuario');

    if (topbarGreeting && topbarNombre) {
        topbarGreeting.style.display = 'flex';
        if (viewId === 'inicio') {
            topbarNombre.innerText = window.nombreAspiranteCompleto || 'Cargando...';
            cargarStatsInicio();
        } else {
            const titulos = {
                'proceso': typeof t === 'function' ? t('sb_proceso') : 'Proceso',
                'convocatorias': typeof t === 'function' ? t('sb_convocatorias') : 'Convocatorias',
                'documentos': typeof t === 'function' ? t('sb_documentos') : 'Documentos',
                'admision': typeof t === 'function' ? t('sb_admision') : 'Admisión'
            };
            topbarNombre.innerText = titulos[viewId] || (viewId.charAt(0).toUpperCase() + viewId.slice(1));
            // Bug 6 Fix: cargar datos reales para la gráfica de proceso
            if (viewId === 'proceso') {
                cargarDatosProceso();
            }
        }
    }

    // Actualizar estados visuales en la barra de navegación lateral
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetNavLink = document.getElementById(`nav-${viewId}`);
    if (targetNavLink) {
        targetNavLink.classList.add('active');
    }

    if (viewId === 'documentos') {
        // Necesitamos esperar un tick para que la vista sea visible y tenga dimensiones
        setTimeout(() => {
            if (typeof actualizarPosicionZorro === 'function') {
                actualizarPosicionZorro(false);
            }
        }, 50);
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

    const cargandoTxt = typeof t === 'function' ? t('tb_cargando') : 'Cargando...';
    if (statDocsSub) { statDocsSub.style.display = 'block'; statDocsSub.innerText = cargandoTxt; }
    if (statExpSub) { statExpSub.style.display = 'block'; statExpSub.innerText = cargandoTxt; }
    if (statConvSub) { statConvSub.style.display = 'block'; statConvSub.innerText = cargandoTxt; }

    mostrarLoader();
    try {
        const resSoli = await fetch(`/api/solicitud/activa/${aspiranteData.id}`);
        if (resSoli.ok) {
            const soliData = await resSoli.json();

            if (soliData.existe) {
                // 1. Estado de Expediente
                if (statExpStatus) {
                    if (soliData.estado === 'RECHAZADO') {
                        statExpStatus.innerText = typeof t === 'function' ? t('dash_exp_rechazado') : 'Expediente Rechazado';
                        statExpStatus.style.color = 'var(--color-danger)';
                    } else if (soliData.estado === 'APROBADO') {
                        statExpStatus.innerText = typeof t === 'function' ? t('dash_exp_aprobado') : 'Expediente Aprobado';
                        statExpStatus.style.color = 'var(--color-success)';
                    } else {
                        statExpStatus.innerText = typeof t === 'function' ? t('dash_exp_activo') : 'Expediente Activo';
                        statExpStatus.style.color = 'var(--color-success)';
                    }
                }
                if (statExpSub) {
                    const estado = soliData.estado === 'NUEVO' ? (typeof t === 'function' ? t('dash_fase_inicial') : 'Fase Inicial') :
                        (soliData.estado === 'EN_REVISION' ? (typeof t === 'function' ? t('dash_en_revision') : 'En Revisión') :
                            (soliData.estado === 'RECHAZADO' ? (typeof t === 'function' ? t('dash_requiere_atencion') : 'Requiere Atención') : soliData.estado));
                    statExpSub.innerText = estado;
                }

                // 2. Convocatoria y Documentos
                const idSolicitudActual = soliData.idSolicitud || soliData.id;

                // Fetch Convocatorias para el nombre
                const resConv = await fetch('/api/convocatorias');
                if (resConv.ok) {
                    const convocatorias = await resConv.json();
                    const convActual = convocatorias.find(c => c.id === soliData.idConvocatoria);
                    if (convActual) {
                        if (statConvName) statConvName.innerText = convActual.nombre;
                        if (statConvSub) statConvSub.innerText = convActual.nivel === 'DOCTORADO' ? (typeof t === 'function' ? t('dash_doctorado_fie') : 'Doctorado FIE') : (typeof t === 'function' ? t('dash_maestria_fie') : 'Maestría FIE');
                    }
                }

                // Fetch Documentos subidos del aspirante
                const resExp = await fetch(`/api/aspirante/${aspiranteData.id}/expediente`);
                if (resExp.ok) {
                    const expData = await resExp.json();
                    const soliActiva = expData.solicitudes?.find(s => s.idSolicitud === idSolicitudActual);
                    if (soliActiva && soliActiva.documentos) {
                        const docsSubidos = soliActiva.documentos.filter(d => d.rutaArchivo).length;
                        const suffix = docsSubidos === 1 ? (typeof t === 'function' ? t('dash_docs_subidos_singular') : 'documento subido') : (typeof t === 'function' ? t('dash_docs_subidos_plural') : 'documentos subidos');
                        if (statDocsCount) statDocsCount.innerText = `${docsSubidos} ${suffix}`;
                        if (statDocsSub) statDocsSub.innerText = typeof t === 'function' ? t('dash_revisar_progreso') : 'Revisar progreso';
                    } else {
                        const suffix = typeof t === 'function' ? t('dash_docs_subidos_plural') : 'documentos subidos';
                        if (statDocsCount) statDocsCount.innerText = `0 ${suffix}`;
                        if (statDocsSub) statDocsSub.innerText = typeof t === 'function' ? t('dash_comenzar_subir') : 'Comenzar a subir';
                    }
                }
            } else {
                // No hay solicitud activa
                if (statExpStatus) {
                    statExpStatus.innerText = typeof t === 'function' ? t('dash_exp_sin_solicitud') : 'Sin expediente activo';
                    statExpStatus.style.color = 'var(--color-text)';
                }
                if (statExpSub) {
                    statExpSub.innerText = typeof t === 'function' ? t('dash_exp_visita_conv') : 'Visita Convocatorias';
                }

                if (statConvName) statConvName.innerText = typeof t === 'function' ? t('dash_ninguna_sel') : 'Ninguna seleccionada';
                if (statConvSub) statConvSub.style.display = 'none';

                const suffix = typeof t === 'function' ? t('dash_docs_subidos_plural') : 'documentos subidos';
                if (statDocsCount) statDocsCount.innerText = `0 ${suffix}`;
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
 * Fase 2: Carga los datos del mapa desde el nuevo endpoint
 */
async function cargarDatosProceso() {
    if (!aspiranteData || !aspiranteData.id) {
        renderizarMapaProceso([], 0);
        return;
    }

    mostrarLoader();
    try {
        const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` };
        const [resMapa, resExp] = await Promise.all([
            fetch(`/api/solicitud/mapa/${aspiranteData.id}`, { headers }),
            fetch(`/api/aspirante/${aspiranteData.id}/expediente`, { headers })
        ]);
        
        if (!resMapa.ok) {
            renderizarMapaProceso([], 0);
            return;
        }

        const etapas = await resMapa.json();
        const expData = resExp.ok ? await resExp.json() : null;

        let avance = 0;
        
        // Find current stage
        const actualIndex = etapas.findIndex(e => e.status === 'actual');
        
        if (actualIndex > 0) {
            const etapaActual = etapas[actualIndex];
            // Si la etapa actual es Documentación (id=1)
            if (etapaActual.id === 1 && expData && expData.solicitudes) {
                const solActiva = expData.solicitudes.find(s => s.estado !== 'CANCELADO');
                if (solActiva && solActiva.documentos) {
                    const total = solActiva.documentos.length;
                    const aprobados = solActiva.documentos.filter(d => d.estadoValidacion === 'APROBADO').length;
                    avance = total > 0 ? (aprobados / total) : 0.05; // 0.05 minimo para ver zorro avanzar poquito
                }
            } else {
                // Otras etapas podrían tener lógicas de avance, por ahora 0.1
                avance = 0.1; 
            }
        }

        renderizarMapaProceso(etapas, avance);
    } catch (error) {
        console.error('Error al cargar datos del mapa:', error);
        renderizarMapaProceso([], 0);
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
                contenedor.innerHTML = '<div class="messages-empty-state"><i class="fa-solid fa-inbox fa-2x" style="margin-bottom: 8px; opacity: 0.5;"></i>No tienes mensajes.</div>';
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
                    <div class="chat-item" style="padding: 16px; border-bottom: 1px solid var(--color-border); cursor: pointer; display: flex; gap: 10px; align-items: center;" onclick="abrirNotificacion('${remitenteKey}', this)">
                        <div class="chat-avatar ${bgClass}" style="width: 40px; height: 40px; font-size: 16px;">
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
            contenedor.innerHTML = '<div class="messages-empty-state" style="color: var(--color-danger);"><i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 8px;"></i> Error al cargar.</div>';
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
                    <p style="margin: 6px 0 0; color: var(--color-text-muted); font-size: 15px;"><i class="fa-solid fa-envelope" style="margin-right: 5px;"></i>${usuario.correo || noReg}</p>
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
        showConfirmButton: false,
        showCloseButton: true,
        width: '1050px',
        customClass: {
            popup: 'pm-popup',
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

        // BUG-08 Fix: función para escapar HTML y prevenir XSS en mensajes del servidor
        const escaparHTML = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        let chatHtml = `<div style="max-height: 400px; overflow-y: auto; text-align: left; padding: 10px; background: var(--color-bg); border-radius: 8px;">`;
        let lastDateStr = '';

        grupo.mensajes.forEach(notif => {
            const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
            const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            let editadoHtml = '';
            if (notif.editado_en && notif.creado_en && notif.editado_en !== notif.creado_en) {
                const editDate = new Date(notif.editado_en);
                if (Math.abs(editDate - dateObj) > 5000) {
                    editadoHtml = `<span style="margin-left: 4px; color: var(--color-text-muted); font-style: italic;">(Editado)</span>`;
                }
            }

            // Si cambió de día, ponemos un separador de fecha
            if (dateStr !== lastDateStr) {
                chatHtml += `
                    <div style="text-align: center; margin-bottom: 15px; margin-top: 15px;">
                        <span style="background: var(--color-border); padding: 2px 10px; border-radius: 12px; font-size: 11px; color: var(--color-text-muted); font-weight: bold;">${escaparHTML(dateStr)}</span>
                    </div>
                `;
                lastDateStr = dateStr;
            }

            chatHtml += `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); padding: 12px 15px; border-radius: 14px 14px 14px 4px; box-shadow: var(--shadow-sm); font-size: 13.5px; color: var(--color-text); margin-bottom: 10px; word-wrap: break-word;">
                    <div style="font-weight: bold; color: var(--color-text); margin-bottom: 5px; font-size: 13px; text-transform: capitalize;">${escaparHTML(notif.nombre)}</div>
                    <div style="white-space: pre-wrap;">${escaparHTML(notif.mensaje)}</div>
                    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 5px; text-align: right;">${timeStr} ${editadoHtml}</div>
                </div>
            `;
        });
        chatHtml += `</div>`;

        // Cerrar el dropdown para que el modal se vea limpio
        const megaDropdown = document.getElementById('messages-mega-dropdown');
        if (megaDropdown) {
            megaDropdown.style.display = 'none';
            megaDropdown.classList.remove('show');
        }

        Swal.fire({
            title: `<div style="display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1.2rem;"><i class="fa-solid fa-user-circle" style="color: var(--color-primary);"></i> <span>${grupo.remitente.replace('Administracion', 'Administración')}</span></div>`,
            html: chatHtml,
            width: '550px',
            showCloseButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#8a1c24'
        });

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
                const nivelTxt = nivel === 'DOCTORADO' 
                    ? (typeof t === 'function' && t('sb_doctorados') !== 'sb_doctorados' ? t('sb_doctorados') : 'Doctorados') 
                    : (typeof t === 'function' && t('sb_maestrias') !== 'sb_maestrias' ? t('sb_maestrias') : 'Maestrías');
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
    if (document.getElementById('mapa-proceso-container')) {
        cargarDatosProceso();
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

    // BUG-04 Fix: solo marcar como 'completed' al avanzar; al retroceder limpiar 'completed' del nodo actual
    const nodeActual = document.getElementById(`node-${estacionActual}`);
    const nodeNuevo = document.getElementById(`node-${nuevaEstacion}`);

    nodeActual.classList.remove('active');
    if (nuevaEstacion > estacionActual) {
        // Avanzando: el nodo anterior queda completado
        nodeActual.classList.add('completed');
    } else {
        // Retrocediendo: el nodo al que volvemos deja de ser completado
        nodeActual.classList.remove('completed');
        nodeNuevo.classList.remove('completed');
    }
    nodeNuevo.classList.add('active');

    estacionActual = nuevaEstacion;
    actualizarPosicionZorro();
}

/**
 * Mueve el zorro interactivo a la estación actual
 */
function actualizarPosicionZorro(salto = true) {
    const fox = document.getElementById('fox-runner');
    const nodo = document.getElementById(`node-${estacionActual}`);
    const wrapper = document.querySelector('.stepper-wrapper');

    // Solo calcular si está visible
    if (fox && nodo && wrapper && wrapper.offsetParent !== null) {
        fox.style.opacity = '1';
        const offsetLeft = nodo.offsetLeft + (nodo.offsetWidth / 2);
        fox.style.left = `${offsetLeft}px`;

        // Actualizar la línea de progreso (animación tipo agua)
        const porcentaje = (estacionActual / 3) * 100;
        wrapper.style.setProperty('--progress', `${porcentaje}%`);

        if (salto) {
            fox.style.transform = 'translate(-50%, -20px)';
            setTimeout(() => {
                if (fox) fox.style.transform = 'translate(-50%, 0)';
            }, 300);
        } else {
            fox.style.transform = 'translate(-50%, 0)';
        }
    }
}

// Actualizar zorro al cambiar el tamaño de la ventana
window.addEventListener('resize', () => {
    actualizarPosicionZorro(false);
});

/**
 * Avanza estación e intenta subir los documentos al backend
 */
async function avanzarEstacion(nuevaEstacion) {
    const boton = document.getElementById(`btn-next-${estacionActual}`);
    if (boton) boton.disabled = true; // Deshabilitar temporalmente para evitar doble click

    // Interceptar si es la estación 0 para guardar la modalidad de admisión
    if (estacionActual === 0 && currentSolicitudId) {
        if (nivelAcademicoSeleccionado !== 'Doctorado') {
            const contenedorMaestria = document.getElementById('opciones-admision-maestria');
            const inputModalidad = contenedorMaestria ? contenedorMaestria.querySelector('input[name="modalidad"]:checked') : null;
            if (!inputModalidad) {
                if (boton) boton.disabled = false;
                Swal.fire({
                    title: 'Modalidad requerida',
                    text: 'Debes seleccionar una modalidad de admisión para continuar.',
                    icon: 'warning',
                    confirmButtonColor: '#8a1c24'
                });
                return;
            }
            try {
                const res = await fetch(`/api/solicitud/modalidad/${currentSolicitudId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipoAdmision: inputModalidad.value }) // Por retrocompatibilidad de nombre de var en frontend, enviamos el ID en value
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

    // Ya no avanzamos la estacion_actual desde el frontend. 
    // El avance ocurre automáticamente al subir los documentos o al ser evaluados por el servidor según la modalidad_etapa.
    // Solo avanzamos la vista localmente.

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
        const card = input.closest('.file-box');
        if (!card) return;

        if (input.checked) {
            card.classList.add('file-selected');
            card.style.borderStyle = 'solid';
        } else {
            card.classList.remove('file-selected');
            card.style.borderStyle = '';
        }
    });

    // Mostrar el contenedor de detalles de admisión
    const detallesBox = document.getElementById('contenedor-detalles-admision');
    if (detallesBox) {
        detallesBox.style.display = 'block';
    }

    verificarArchivosEstacion(0);
}


/**
 * Valida de forma dinámica los archivos requeridos para habilitar el botón final
 */
function verificarArchivosEstacion(estacion) {
    if (estacion === 0) {
        const btn = document.getElementById('btn-next-0');
        if (!btn) return;

        if (nivelAcademicoSeleccionado === "Doctorado") {
            const gradoEl = document.getElementById('file-grado-maestria');
            const grado = gradoEl && gradoEl.files && gradoEl.files.length > 0;
            btn.disabled = !grado;
        } else {
            const contenedorMaestria = document.getElementById('opciones-admision-maestria');
            const inputModalidad = contenedorMaestria ? contenedorMaestria.querySelector('input[name="modalidad"]:checked') : null;
            btn.disabled = !inputModalidad;
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
async function bloquearInterfazPorRevision(estadoActual = 'EN_REVISION', soliData = null) {
    const banner = document.getElementById('banner-revision');
    const encabezado = document.getElementById('encabezado-documentos');

    // 2. Construir la vista integrada dentro de banner-revision (banner superior + barra de progreso + grid sin caja exterior)
    if (banner) {
        banner.style.cssText = 'display:block; background:transparent; border:none; box-shadow:none; padding:0; margin-bottom: 20px;';

        let textBanner = typeof t === 'function' ? t('doc_exp_bajo_revision') : 'Expediente bajo revisión';
        let textSub = typeof t === 'function' ? t('doc_notif_correccion') : 'Serás notificado si se requiere alguna corrección';
        let badge = typeof t === 'function' ? t('toast_rev_badge') : 'EN REVISIÓN';
        let statusKey = 'en_revision';
        let iconClass = 'fa-solid fa-lock';

        if (estadoActual === 'RECHAZADO') {
            textBanner = typeof t === 'function' ? t('dash_exp_rechazado') : 'Expediente Rechazado';
            textSub = typeof t === 'function' ? t('docente_motivo_ph') : 'Revisa los comentarios y corrige los documentos necesarios';
            badge = typeof t === 'function' ? t('doc_rechazado') : 'RECHAZADO';
            statusKey = 'rechazado';
            iconClass = 'fa-solid fa-circle-xmark';
        } else if (estadoActual === 'APROBADO' || (soliData && soliData.etapaOrden && soliData.etapaOrden >= 2)) {
            textBanner = typeof t === 'function' ? t('doc_doc_aprobada') : 'Documentación Aprobada';
            const nombreEtapa = (soliData && soliData.etapaNombre) ? soliData.etapaNombre : (typeof t === 'function' ? t('sb_proceso') : 'Proceso de Admisión');
            const etapaLabel = typeof t === 'function' ? t('doc_etapa_actual') : 'Etapa actual';
            const descLabel = typeof t === 'function' ? t('doc_doc_aprobada_desc') : 'Tus documentos han sido aprobados satisfactoriamente.';
            textSub = `${descLabel} ${etapaLabel}: <strong>${nombreEtapa}</strong>`;
            badge = typeof t === 'function' ? t('doc_aprobado') : 'APROBADO';
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

            <!-- Contenedor Directo de Tarjetas (Sin caja exterior con borde) -->
            <div id="docs-dinamicos-container" style="margin-top: 15px; padding-bottom: 80px;">
                <div class="docs-empty-state">
                    <i class="fa-solid fa-folder-open fa-3x" style="margin-bottom: 16px; color: var(--color-text-muted);"></i>
                    <p class="text-muted" data-i18n="doc_no_encontrado">${typeof t === 'function' ? t('doc_no_encontrado') : 'No se encontraron documentos adjuntos.'}</p>
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

    const obtenerExtensionArchivo = (ruta) => {
        if (!ruta || typeof ruta !== 'string') return 'PDF';
        const partes = ruta.split('.');
        if (partes.length < 2) return 'PDF';
        const ext = partes.pop().toUpperCase();
        return (ext && ext.length <= 5) ? ext : 'PDF';
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

            let statusIconHtml = '';
            switch (doc.estadoValidacion) {
                case 'APROBADO':
                    statusIconHtml = `<span class="doc-icon-status"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i></span>`;
                    break;
                case 'RECHAZADO':
                    statusIconHtml = `<span class="doc-icon-status"><i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i></span>`;
                    break;
                default:
                    statusIconHtml = `<span class="doc-icon-status"><i class="fa-solid fa-clock" style="color: #f59e0b;"></i></span>`;
                    break;
            }

            const rutaArchivo = doc.rutaArchivo;
            const cardId = `doc-card-${doc.idDocumento || doc.id || Math.random().toString(36).slice(2)}`;
            const tipoArchivoStr = obtenerExtensionArchivo(rutaArchivo);
            const docDataStr = encodeURIComponent(JSON.stringify(doc));

            html += `
                <div class="doc-card-v2" id="${cardId}" onclick="abrirModalDoc('${docDataStr}')">
                    <div class="doc-card-v2-header">
                        <div class="doc-card-v2-icon" style="background: ${iconBg}; color: ${iconColor};">
                            <i class="fa-solid ${iconClass}"></i>
                            ${statusIconHtml}
                        </div>
                        <div>
                            <div class="doc-card-v2-title">${doc.requisitoNombre ? (typeof t === 'function' ? t(doc.requisitoNombre) : doc.requisitoNombre) : (typeof t === 'function' ? t('doc_doc_adjunto') : 'Documento adjunto')}</div>
                            <div class="doc-card-v2-date" id="${cardId}-size">${tipoArchivoStr}</div>
                        </div>
                    </div>
                    <div class="doc-card-v2-footer">
                        <span class="doc-action-ver">${typeof t === 'function' ? t('doc_ver_doc') : 'Ver Documento'}</span>
                    </div>
                </div>
            `;

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
                        <button onclick="iniciarReSubidaDocumento(${doc.idDocumento}, '${reqNombreSanitized}', ${numIntentos})" class="btn-resubida">
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
            enlace.href = '#';
            enlace.onclick = async (e) => {
                e.preventDefault();
                const token = sessionStorage.getItem('token') || '';
                try {
                    enlace.style.opacity = '0.6';
                    enlace.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;

                    const res = await fetch(`/api/files/${doc.rutaArchivo}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!res.ok) throw new Error('Error al obtener el archivo');

                    const blob = await res.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    window.open(objectUrl, '_blank');

                    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
                } catch (error) {
                    console.error("Error al descargar archivo:", error);
                    Swal.fire('Error', 'No se pudo abrir el documento.', 'error');
                } finally {
                    enlace.style.opacity = '1';
                    enlace.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> <span data-i18n="doc_ver_doc">${typeof t === 'function' ? t('doc_ver_doc') : 'Ver Documento'}</span>`;
                }
            };
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
            const envioRes = await fetch(`/api/solicitud/enviar/${currentSolicitudId}`, {
                method: 'PUT'
            });

            // BUG-06 Fix: verificar res.ok antes de mostrar éxito
            if (!envioRes.ok) {
                const errData = await envioRes.json().catch(() => ({}));
                ocultarLoader();
                Swal.fire({
                    title: 'Error al enviar',
                    text: errData.mensaje || 'El servidor no pudo procesar el envío del expediente. Inténtalo de nuevo.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                if (btnFinalizar) btnFinalizar.disabled = false;
                return;
            }

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
            // BUG-03 Fix: ocultar loader en el catch para no bloquear la pantalla
            ocultarLoader();
            Swal.fire({
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
            if (btnFinalizar) btnFinalizar.disabled = false;
            return;
        }
    }

    ocultarLoader();

    // Lo redirigimos a la vista de proceso en lugar de inicio
    switchView('proceso');
}

/**
 * BUG-01 Fix: función real para refrescar la vista de convocatorias desde Socket.io.
 * Si el usuario ya había seleccionado un nivel (Maestría/Doctorado), recargas las tarjetas.
 * Si no, simplemente se asegura de mostrar el panel de selección inicial.
 */
function cargarConvocatorias() {
    if (nivelAcademicoSeleccionado) {
        // Ya había seleccionado nivel → recargar la lista con datos frescos
        activarModulosPostRegistro(nivelAcademicoSeleccionado === 'Doctorado'
            ? 'Doctorado en Ingeniería Eléctrica'
            : 'Maestría en Ingeniería Eléctrica');
    } else {
        // Sin nivel seleccionado → asegurar que se muestra el panel inicial
        const panelSeleccion = document.getElementById('seleccion-programa');
        const panelListaAbierta = document.getElementById('lista-programas-abiertos');
        if (panelListaAbierta) panelListaAbierta.style.display = 'none';
        if (panelSeleccion) {
            panelSeleccion.style.display = 'flex';
            void panelSeleccion.offsetWidth;
            panelSeleccion.classList.add('fade-in');
        }
    }
}

/**
 * Actualiza la /**
 * Renderiza el mapa dinámico interactivo estilo Candy Crush
 */
function renderizarMapaProceso(etapas, avance = 0) {
    const container = document.getElementById('mapa-proceso-container');
    if (!container) return;

    if (!etapas || etapas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-muted); margin-top: 100px;">
                <i class="fa-solid fa-map-location-dot" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h4 style="margin-bottom: 10px; font-size: 24px; color: var(--color-text);">${typeof t === 'function' ? t('dash_sin_ruta') : 'Aún no hay ruta'}</h4>
                <p style="font-size: 16px;">${typeof t === 'function' ? t('dash_sin_ruta_desc') : 'Selecciona una convocatoria e inicia tu proceso para ver tu mapa.'}</p>
            </div>
        `;
        return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;
    
    let htmlNiveles = '';
    let svgRuta = '';
    
    // Coordenadas para la meta
    let lastX = 0, lastY = 0;
    let zorroX = 0, zorroY = 0;
    let tieneActual = false;

    // Generar ruta horizontal (de izquierda a derecha) con oscilación en Y
    const paddingLeft = 40;
    const paddingRight = 120; // Espacio extra para que quepa el logo de la FIE
    const paddingY = 100;
    const availableWidth = width - paddingLeft - paddingRight;
    const availableHeight = height - (paddingY * 2);
    const stepX = availableWidth / Math.max(1, (etapas.length - 1));
    
    const startX = paddingLeft;

    const coords = [];
    etapas.forEach((etapa, index) => {
        // Oscilación en Y usando Math.sin (incrementado a 3.5 ciclos para más curvas)
        const wave = Math.sin((index / (etapas.length - 1 || 1)) * Math.PI * 3.5);
        const cx = startX + (stepX * index);
        const cy = paddingY + (availableHeight / 2) + (wave * (availableHeight / 2));
        
        lastX = cx;
        lastY = cy;

        coords.push({ cx, cy, status: etapa.status, nombre: etapa.nombre, index });

        const isLast = index === etapas.length - 1;
        const nombreEtapaFmt = typeof t === 'function' ? t(etapa.nombre) : etapa.nombre;
        
        // HTML del nivel
        htmlNiveles += `
            <div class="mapa-nivel ${etapa.status} ${isLast ? 'mapa-nivel-final' : ''}" style="left: ${cx}px; top: ${cy}px;">
                <div class="mapa-titulo" ${isLast ? 'style="top: 50px;"' : ''}>${nombreEtapaFmt}</div>
            </div>
        `;
    });

    // Posición inicial del Zorro por defecto
    const actualNode = coords.find(c => c.status === 'actual');
    if (actualNode) {
        zorroX = actualNode.cx;
        zorroY = actualNode.cy;
        tieneActual = true;
    } else if (coords.length > 0 && coords[coords.length - 1].status === 'completado') {
        zorroX = coords[coords.length - 1].cx;
        zorroY = coords[coords.length - 1].cy;
    } else if (coords.length > 0) {
        zorroX = coords[0].cx;
        zorroY = coords[0].cy;
    }

    for (let i = 0; i < coords.length - 1; i++) {
        const c1 = coords[i];
        const c2 = coords[i+1];
        
        const cp1X = c1.cx + (stepX / 2);
        const cp1Y = c1.cy;
        const cp2X = c2.cx - (stepX / 2);
        const cp2Y = c2.cy;
        
        const pathData = `M ${c1.cx} ${c1.cy} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${c2.cx} ${c2.cy}`;
        
        let pathClass = 'mapa-ruta-path'; // pendiente
        let strokeAttrs = '';

        if (c1.status === 'completado' && (c2.status === 'completado' || c2.status === 'actual')) {
            // Tramo completamente recorrido
            pathClass = 'mapa-ruta-path-fill';
            svgRuta += `<path class="${pathClass}" d="${pathData}"></path>`;
        } else if (c1.status === 'actual') {
            // Tramo en progreso (de actual al siguiente)
            svgRuta += `<path class="mapa-ruta-path" d="${pathData}"></path>`; // Fondo
            
            // Línea llena parcialmente
            pathClass = 'mapa-ruta-path-fill partial-path';
            const offset = 100 - (avance * 100);
            strokeAttrs = `pathLength="100" style="stroke-dasharray: 100; stroke-dashoffset: ${offset};"`;
            svgRuta += `<path class="${pathClass}" d="${pathData}" ${strokeAttrs}></path>`;
            
            // Aproximar Zorro a la curva Bezier si hay avance
            if (avance > 0) {
                const t = avance;
                const invT = 1 - t;
                zorroX = invT*invT*invT*c1.cx + 3*invT*invT*t*cp1X + 3*invT*t*t*cp2X + t*t*t*c2.cx;
                zorroY = invT*invT*invT*c1.cy + 3*invT*invT*t*cp1Y + 3*invT*t*t*cp2Y + t*t*t*c2.cy;
            }
        } else {
            // Línea pendiente
            svgRuta += `<path class="${pathClass}" d="${pathData}"></path>`;
        }
    }
    
    const svgHTML = `
        <svg class="mapa-ruta-svg" preserveAspectRatio="none">
            ${svgRuta}
        </svg>
    `;

    const zorroHTML = zorroX && zorroY ? `
        <img src="css/zorro.png" class="mapa-zorro" style="left: ${zorroX}px; top: ${zorroY}px;" alt="Zorro actual">
    ` : '';

    container.innerHTML = svgHTML + htmlNiveles + zorroHTML;
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
                <div style="background: var(--color-card-bg); border: none; border-radius: 12px; padding: 40px; text-align: center; width: 100%; max-width: 900px; margin: 20px auto; box-shadow: var(--shadow-md); font-family: 'Inter', Arial, sans-serif; overflow: hidden;">
                    
                    <div style="background: #fef3c7; border: 1px solid #fcd34d; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-arrows-rotate fa-spin-pulse" style="font-size: 24px; color: #d97706; --fa-animation-duration: 3s;"></i>
                    </div>
                    
                    <h3 style="font-size: 22px; font-weight: 700; color: var(--color-text); margin-bottom: 20px;">${typeof t === 'function' ? t('conv_tramite_curso') : 'Solicitud de Admisión Activa'}</h3>
                    
                    <!-- CONTENEDOR SLIDER HORIZONTAL -->
                    <div style="display: grid; width: 100%;">
                        
                        <!-- VISTA A: Resumen -->
                        <div id="view-a" class="slide-view" style="transform: translateX(0); opacity: 1;">
                            <p style="font-size: 15px; color: var(--color-text); line-height: 1.6; margin-bottom: 25px; max-width: 800px; margin-left: auto; margin-right: auto;">
                                ${typeof t === 'function' ? t('conv_participando') : 'Te encuentras registrado en el proceso de admisión para:'}<br>
                                <strong style="color: var(--color-text); font-size: 16px; display: inline-block; margin-top: 8px;">Programa de ${nivel} en Ciencias en Ingeniería Eléctrica</strong><br>
                                <span style="font-size: 14px; color: var(--color-text-muted);">${typeof t === 'function' ? t('conv_opcion_sel') : 'Modalidad:'} <strong>${opcionElegida}</strong></span>
                            </p>
                             
                            
                            <button onclick="switchView('documentos')" class="btn-continuar-sol">
                                <i class="fa-solid fa-arrow-right" style="margin-right: 8px;"></i> ${typeof t === 'function' ? t('conv_btn_continuar') : 'Continuar Solicitud'}
                            </button>
                            
                            <div>
                                <button onclick="mostrarVistaDetalles()" class="btn-detalles-link">
                                    ${typeof t === 'function' ? t('conv_btn_fechas') : 'Ver fechas del proceso'} <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>
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
                                <button onclick="ocultarVistaDetalles()" class="btn-volver-link">
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
        const res = await fetch('/api/solicitud/ingreso/modalidades');
        if (res.ok) {
            const modalidades = await res.json();
            contenedor.innerHTML = '';

            modalidades.forEach((mod, index) => {
                const checkedStr = index === 0 ? 'checked' : '';
                // 'mod' es un objeto { id, nombre, descripcion }
                contenedor.innerHTML += `
                    <div class="file-box file-box-option" onclick="this.querySelector('input').checked=true; actualizarCostosAdmision();">
                        <input type="radio" name="modalidad" value="${mod.id}" data-nombre="${mod.nombre}" ${checkedStr} onchange="actualizarCostosAdmision()" style="position: absolute; opacity: 0; width: 0; height: 0;">
                        <i class="fa-solid fa-circle-info info-btn-option" title="Más información" onclick="event.stopPropagation(); abrirModalInfoModalidad('${mod.nombre}', '${mod.descripcion.replace(/'/g, "\\'")}')"></i>
                        <label>${mod.nombre}</label>
                    </div>
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

/**
 * Abre modal informativo al hacer clic en el ícono (i) de cada opción de Estación 0
 */
function abrirModalInfoModalidad(modKey, titulo) {
    const tituloMod = typeof t === 'function' ? t('mod_' + modKey.toLowerCase()) : titulo;
    Swal.fire({
        title: `<i class="fa-solid fa-circle-info" style="color: var(--color-guinda);"></i> ${tituloMod}`,
        html: `
            <div style="text-align: left; font-size: 14px; color: var(--color-text); line-height: 1.6; margin-top: 10px;">
                <p style="margin-bottom: 12px;"><strong>Información sobre: ${tituloMod}</strong></p>
                <div style="background: var(--color-bg); border-left: 4px solid var(--color-guinda); padding: 14px 16px; border-radius: 8px; border: 1px solid var(--color-border); border-left-width: 4px;">
                    Aquí se mostrarán los detalles, requisitos específicos y procedimientos correspondientes a la modalidad seleccionada.
                </div>
            </div>
        `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: 'var(--color-guinda)',
        background: 'var(--color-card-bg)',
        color: 'var(--color-text)'
    });
}


async function cargarRequisitosDocumentales(idConvocatoria, documentosSubidos = []) {
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

            let htmlIdentidad = '';
            let htmlAcademico = '';
            let htmlEvaluacion = '';

            requisitos.forEach(req => {
                const docSubido = documentosSubidos.find(d => parseInt(d.idRequisito) === req.id);
                const isRequired = req.obligatorio ? '*' : '';
                const requiredAttr = (req.obligatorio && !docSubido) ? 'required' : '';

                let displayHtml = '';
                let fileBoxClass = 'file-box';

                if (docSubido) {
                    fileBoxClass = 'file-box file-selected';
                    let iconColor = 'var(--color-primary)';
                    let statusText = 'Enviado';
                    if (docSubido.estadoValidacion === 'APROBADO') {
                        iconColor = 'var(--color-success)';
                        statusText = 'Aprobado';
                    } else if (docSubido.estadoValidacion === 'RECHAZADO') {
                        iconColor = 'var(--color-danger)';
                        statusText = 'Rechazado';
                    }
                    displayHtml = `
                        <div class="file-name-display" style="color: ${iconColor};">
                            <i class="fa-solid fa-file-pdf"></i> ${statusText}
                            ${docSubido.estadoValidacion === 'RECHAZADO' && docSubido.comentarios ? `<br><small style="color:var(--color-danger)">Motivo: ${docSubido.comentarios}</small>` : ''}
                        </div>
                    `;
                }

                const htmlReq = `
                    <div class="${fileBoxClass}">
                        <label><i class="fa-solid fa-file-arrow-up"></i> ${req.descripcion} <span style="color:red;">${isRequired}</span></label>
                        <input type="file" name="${req.id}" accept=".pdf" onchange="verificarArchivosEstacion(estacionActual)" ${requiredAttr}>
                        ${displayHtml}
                    </div>
                `;

                if (req.categoria === 'IDENTIDAD' || req.categoria === 'GENERAL') {
                    htmlIdentidad += htmlReq;
                } else if (req.categoria === 'ACADEMICO') {
                    htmlAcademico += htmlReq;
                } else if (req.categoria === 'EVALUACION') {
                    htmlEvaluacion += htmlReq;
                }
            });

            if (gridIdentidad) gridIdentidad.innerHTML = htmlIdentidad;
            if (gridAcademico) gridAcademico.innerHTML = htmlAcademico;
            if (gridEvaluacion) gridEvaluacion.innerHTML = htmlEvaluacion;

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

// Registrador de Módulos por Código de Acción (Data-Driven Architecture)
const MODULOS_REGISTRY = {
    'SUBIR_DOCUMENTOS': (soliData, accion) => typeof moduloDocumentos !== 'undefined' && moduloDocumentos.ejecutar(soliData, accion),
    'PROGRAMAR_EXAMEN': (soliData, accion) => typeof moduloProgramacionExamen !== 'undefined' && moduloProgramacionExamen.ejecutarAspirante ? moduloProgramacionExamen.ejecutarAspirante(soliData, accion) : typeof moduloProgramacionExamen !== 'undefined' && moduloProgramacionExamen.ejecutar(soliData, accion),
    'CAPTURAR_RESULTADO_EXAMEN': (soliData, accion) => typeof moduloProgramacionExamen !== 'undefined' && moduloProgramacionExamen.ejecutarAspirante ? moduloProgramacionExamen.ejecutarAspirante(soliData, accion) : typeof moduloProgramacionExamen !== 'undefined' && moduloProgramacionExamen.ejecutar(soliData, accion),
    'HABILITAR_CAPTURA_RESULTADO': (soliData, accion) => typeof moduloProgramacionExamen !== 'undefined' && moduloProgramacionExamen.ejecutarAspirante ? moduloProgramacionExamen.ejecutarAspirante(soliData, accion) : typeof moduloProgramacionExamen !== 'undefined' && moduloProgramacionExamen.ejecutar(soliData, accion),
    // --- Entrevista (Doctorado) ---
    'VER_ENTREVISTA': (soliData) => typeof moduloEntrevista !== 'undefined' && moduloEntrevista.ejecutarAspirante(soliData),
    // --- Curso propedéutico ---
    'PROGRAMAR_CURSO': (soliData, accion) => typeof moduloCurso !== 'undefined' && moduloCurso.ejecutar(soliData, accion),
    'CAPTURAR_RESULTADO_CURSO': (soliData, accion) => typeof moduloCurso !== 'undefined' && moduloCurso.ejecutar(soliData, accion),
    'CAPTURAR_RESULTADO_PROPEDEUTICO': (soliData, accion) => typeof moduloCurso !== 'undefined' && moduloCurso.ejecutar(soliData, accion),
    'PUBLICAR_RESULTADO': (soliData, accion) => {
        const codigoMod = (soliData.modalidadCodigo || soliData.modalidadNombre || '').toUpperCase();
        if (codigoMod.includes('PROMEDIO')) {
            if (typeof moduloPromedio !== 'undefined') moduloPromedio.ejecutar(soliData, accion);
        } else if (codigoMod.includes('ENTREVISTA')) {
            // Doctorado: mostrar resultado de la entrevista (panel genérico de resultado)
            if (typeof moduloEntrevista !== 'undefined') moduloEntrevista.ejecutarAspirante(soliData);
        } else if (codigoMod.includes('EXAMEN')) {
            if (typeof moduloProgramacionExamen !== 'undefined') {
                (moduloProgramacionExamen.ejecutarAspirante || moduloProgramacionExamen.ejecutar)(soliData, accion);
            }
        } else {
            if (typeof moduloCurso !== 'undefined') moduloCurso.ejecutar(soliData, accion);
        }
    },
    'VALIDAR_PROMEDIO': (soliData, accion) => typeof moduloPromedio !== 'undefined' && moduloPromedio.ejecutar(soliData, accion),
    'SUBIR_COMPROBANTE_PAGO': (soliData, accion) => typeof moduloPago !== 'undefined' && moduloPago.ejecutar(soliData, accion),
    'VERIFICAR_PAGO':         (soliData, accion) => typeof moduloPago !== 'undefined' && moduloPago.ejecutar(soliData, accion),
};

/**
 * Hidrata la UI con el progreso guardado en la base de datos (Backend como fuente de verdad)
 */
function hidratarUI(soliData) {
    currentSolicitudId = soliData.idSolicitud || soliData.id;
    nivelAcademicoSeleccionado = soliData.nivel === 'DOCTORADO' ? 'Doctorado' : 'Maestría';

    // Desbloquear navegación
    bloquearConvocatorias(soliData);
    const navDocumentos = document.getElementById('li-nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block';
    }

    const navAdmision = document.getElementById('li-nav-admision');
    if (navAdmision && ((soliData.etapaOrden && soliData.etapaOrden >= 2) || (soliData.idEtapaActual && soliData.idEtapaActual > 1))) {
        navAdmision.style.display = 'block';
    }

    // Si ya tiene modalidad, avanzamos a la estación 1 (Identidad) para no empezar desde cero
    if (soliData.idModalidad && estacionActual === 0) {
        cambiarEstacion(1);
    }

    // Configurar paneles según el nivel y pasar documentos ya subidos
    configurarPanelesNivel(nivelAcademicoSeleccionado, soliData.idConvocatoria, soliData.documentosSubidos || []);

    // Siempre hidratar el módulo base de Documentos (Expediente) para garantizar el estado de #view-documentos
    if (typeof moduloDocumentos !== 'undefined') {
        moduloDocumentos.ejecutar(soliData, { codigo: 'SUBIR_DOCUMENTOS' });
    }

    // Recorrer las acciones disponibles adicionales y ejecutar sus módulos
    let moduloAdmisionEjecutado = false;
    if (soliData.accionesDisponibles && soliData.accionesDisponibles.length > 0) {
        soliData.accionesDisponibles.forEach(accion => {
            if (accion.codigo === 'SUBIR_DOCUMENTOS') return;

            const ejecutarModulo = MODULOS_REGISTRY[accion.codigo];
            if (typeof ejecutarModulo === 'function') {
                ejecutarModulo(soliData, accion);
                moduloAdmisionEjecutado = true;
            } else {
                console.warn(`No hay módulo registrado para la acción: ${accion.codigo}`);
            }
        });
    }

    // Si el aspirante ya tiene calificación capturada, inyectar el resultado en la sección de admisión
    const resultadoContainer = document.getElementById('resultado-dinamico-container');
    if (resultadoContainer && soliData.calificacion !== undefined && soliData.calificacion !== null) {
        const resultadoHtml = `
            <div class="status-banner status-aprobado" style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="status-banner-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                    <div>
                        <div class="status-banner-title">${typeof t === 'function' ? t('exam_evaluacion_finalizada') : 'Evaluación Finalizada'}</div>
                        <div class="status-banner-sub">${typeof t === 'function' ? t('doc_etapa_actual') : 'Etapa actual'}: <strong>${soliData.etapaNombre || (typeof t === 'function' ? t('conv_resultados') : 'Resultados')}</strong></div>
                    </div>
                </div>
            </div>
            
            <div class="premium-panel" style="margin-bottom: 25px; position: relative; overflow: hidden; border-top: 4px solid #10b981;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <span style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-circle-check"></i> ${soliData.resultadoAprobado ? (typeof t === 'function' ? t('exam_aprobado') : 'Aprobado') : (typeof t === 'function' ? t('exam_no_aprobado') : 'No Aprobado')}
                    </span>
                </div>

                <h4 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: var(--color-text); display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i> ${soliData.idModalidad === 2 ? '¡Tu curso propedéutico ha finalizado!' : (typeof t === 'function' ? t('exam_felicidades_calif') : '¡Felicidades, tu calificación ha sido registrada!')}
                </h4>
                <p style="margin-bottom: 20px; color: var(--color-text-muted); font-size: 14px; line-height: 1.5;">${soliData.idModalidad === 2 ? 'Tu curso propedéutico ha sido evaluado y los resultados ya se integraron a tu proceso.' : (typeof t === 'function' ? t('exam_evaluado_desc') : 'Tu examen de admisión ha sido evaluado y los resultados ya se integraron a tu proceso.')}</p>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    ${soliData.idModalidad !== 2 ? `
                    <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 160px;">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; color: var(--color-text-muted); margin-bottom: 6px;">${typeof t === 'function' ? t('exam_calif_obtenida') : 'Calificación Obtenida'}</span>
                        <strong style="font-size: 32px; font-weight: 800; color: var(--color-text); line-height: 1;">${soliData.calificacion}</strong>
                    </div>
                    ` : ''}
                    <div style="background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px 20px; border-radius: 12px; flex: 1; min-width: 160px;">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block; color: var(--color-text-muted); margin-bottom: 6px;">${typeof t === 'function' ? t('exam_resultado') : 'Resultado Final'}</span>
                        <div style="font-size: 20px; font-weight: 800; color: ${soliData.resultadoAprobado ? '#10b981' : '#ef4444'}; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid ${soliData.resultadoAprobado ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${soliData.resultadoAprobado ? (typeof t === 'function' ? t('exam_aprobado') : 'Aprobado') : (typeof t === 'function' ? t('exam_no_aprobado') : 'No Aprobado')}
                        </div>
                    </div>
                </div>
                
                ${soliData.resultadoObservaciones ? `
                <div style="margin-top: 20px; background: var(--color-bg); border-left: 3px solid #10b981; padding: 14px 18px; border-radius: 8px; border: 1px solid var(--color-border); border-left-width: 3px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 4px;">
                        ${typeof t === 'function' ? t('exam_obs_comite') : 'Observaciones del Comité'}
                    </div>
                    <div style="font-size: 14px; color: var(--color-text);">${soliData.resultadoObservaciones}</div>
                </div>
                ` : ''}
            </div>
        `;

        resultadoContainer.innerHTML = resultadoHtml;

        // Ocultar el contenedor de módulos dinámicos para que no se dupliquen 
        // los avisos del examen una vez que ya hay resultado publicado.
        const admisionContainer = document.getElementById('admision-dinamico-container');
        if (admisionContainer) {
            admisionContainer.style.display = 'none';
        }
    } else {
        // Asegurar que esté visible si no hay calificación final aún
        const admisionContainer = document.getElementById('admision-dinamico-container');
        if (admisionContainer) admisionContainer.style.display = 'block';
        if (resultadoContainer) resultadoContainer.innerHTML = '';
    }
}

function renderizarErrorWorkflow(mensaje) {
    const banner = document.getElementById('banner-revision');
    if (banner) {
        banner.style.cssText = 'display:block; background:transparent; border:none; box-shadow:none; padding:0; margin-bottom: 20px;';
        banner.innerHTML = `
            <div class="status-banner status-rechazado">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="status-banner-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div>
                        <div class="status-banner-title">Error de Workflow</div>
                        <div class="status-banner-sub">${mensaje}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

async function cargarDocsLecturaAspirante(soliData) {
    const idAspi = (aspiranteData && aspiranteData.id) ? aspiranteData.id : (soliData.idAspi || soliData.id);
    if (!idAspi) return;

    try {
        const res = await fetch(`/api/aspirante/${idAspi}/expediente`);
        if (!res.ok) return;
        const dataExp = await res.json();
        const container = document.getElementById('docs-dinamicos-container');
        if (container && dataExp.solicitudes && dataExp.solicitudes.length > 0) {
            const activeSoli = dataExp.solicitudes.find(s => s.id === (soliData.idSolicitud || soliData.id)) || dataExp.solicitudes[0];
            if (activeSoli && activeSoli.documentos && activeSoli.documentos.length > 0) {
                container.innerHTML = '';
                let htmlGrid = '<div class="grid-documentos-revision" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">';
                activeSoli.documentos.forEach(doc => {
                    let badgeDoc = '<span class="soft-badge soft-badge-warning">Pendiente</span>';
                    if (doc.estadoValidacion === 'APROBADO') {
                        badgeDoc = '<span class="soft-badge soft-badge-success"><i class="fa-solid fa-check me-1"></i> Aprobado</span>';
                    } else if (doc.estadoValidacion === 'RECHAZADO') {
                        badgeDoc = '<span class="soft-badge soft-badge-danger"><i class="fa-solid fa-xmark me-1"></i> Rechazado</span>';
                    }
                    htmlGrid += `
                        <div class="card-doc-revision">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="fw-bold mb-0" style="color: var(--color-text);">${doc.requisitoNombre}</h6>
                                ${badgeDoc}
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top" style="border-color: var(--color-border) !important;">
                                <a href="javascript:void(0)" onclick="abrirArchivoSeguro('${doc.rutaArchivo}')" class="btn-ver-doc">
                                    <i class="fa-solid fa-file-pdf me-1"></i> Ver PDF
                                </a>
                            </div>
                        </div>
                    `;
                });
                htmlGrid += '</div>';
                container.innerHTML = htmlGrid;
            }
        }
    } catch (e) {
        console.error("Error en cargarDocsLecturaAspirante:", e);
    }
}

/**
 * Extrae la lógica de pintar paneles para reusarla sin llamar a /crear
 */
function configurarPanelesNivel(nivel, idConvocatoria, documentosSubidos = []) {
    if (idConvocatoria) sessionStorage.setItem('idConvocatoriaPendiente', idConvocatoria);

    if (nivel === "Doctorado") {
        const contenedorMaestria = document.getElementById('opciones-admision-maestria');
        if (contenedorMaestria) {
            contenedorMaestria.style.display = 'none';
            // Desmarcar radios de Maestría para evitar selecciones fantasmas en el DOM
            contenedorMaestria.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        }
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'block';

        if (document.getElementById('btn-next-0')) document.getElementById('btn-next-0').disabled = true;
    } else {
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'none';
        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'flex';

        actualizarCostosAdmision();
        verificarArchivosEstacion(0);
    }

    if (idConvocatoria) cargarRequisitosDocumentales(idConvocatoria, documentosSubidos);
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
document.addEventListener('DOMContentLoaded', async () => {
    carouselTrack = document.getElementById('inicio-carousel-track');
    const indicatorsContainer = document.getElementById('inicio-carousel-indicators');
    
    if (carouselTrack && indicatorsContainer) {
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch('/api/avisos/activos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const avisos = await res.json();
                
                if (avisos.length === 0) {
                    // Si no hay avisos, ocultar el carrusel completo
                    const container = document.getElementById('inicio-carousel');
                    if (container) container.style.display = 'none';
                    return;
                }

                let trackHTML = '';
                let indicatorsHTML = '';

                avisos.forEach((aviso, index) => {
                    const ext = aviso.rutaArchivo.split('.').pop().toLowerCase();
                    const isVideo = aviso.tipo === 'video' || ['mp4', 'webm', 'ogg', 'mov'].includes(ext);

                    const mediaHTML = isVideo 
                        ? `<video src="/api/files/admin/${aviso.rutaArchivo}?token=${token}" autoplay muted loop playsinline style="object-fit: cover; width: 100%; height: 100%;"></video>`
                        : `<img src="/api/files/admin/${aviso.rutaArchivo}?token=${token}" alt="${aviso.titulo}" style="object-fit: cover; width: 100%; height: 100%;">`;

                    trackHTML += `
                        <div class="carousel-slide">
                            ${mediaHTML}
                        </div>
                    `;
                    indicatorsHTML += `
                        <span class="indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>
                    `;
                });

                carouselTrack.innerHTML = trackHTML;
                indicatorsContainer.innerHTML = indicatorsHTML;

                carouselIndicators = Array.from(indicatorsContainer.querySelectorAll('.indicator'));
                totalSlides = avisos.length;
                currentSlide = 0;
                updateCarousel();
                startAutoSlide();
            }
        } catch (e) {
            console.error('Error al cargar avisos:', e);
        }
    }
});


async function cargarDictamen() {

    try {

        const token = sessionStorage.getItem("token");

        const res = await fetch("/api/aspirante/dictamen", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) return;

        const dictamen = await res.json();

        if (!dictamen) return;

        // Si tienes un elemento donde mostrarlo
        const estado = document.getElementById("estadoDictamen");
        const observacion = document.getElementById("observacionDictamen");

        if (estado) {
            estado.textContent = dictamen.resultado || "Pendiente";
        }

        if (observacion) {
            observacion.textContent =
                dictamen.observacion || "Sin observaciones.";
        }

    } catch (error) {

        console.error("Error al cargar dictamen:", error);

    }

}



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
