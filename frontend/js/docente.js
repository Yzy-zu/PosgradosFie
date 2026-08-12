// Variables de Estado Global de la Interfaz
let aspirantes = [];
let idAspiranteActivo = null;

// F-12 FIX: DOCENTE_MODULOS_REGISTRY convertido a función lazy.
// El problema: el objeto const se evaluaba al parsear el script, ANTES de que
// los módulos (<script> en el HTML) estuvieran disponibles → todos quedaban null.
// La solución: una función que construye el mapa en tiempo de ejecución, cuando
// los módulos ya están cargados en el scope global.
function getDocenteModulosRegistry() {
    return {
        'PROGRAMAR_EXAMEN':              typeof moduloProgramacionExamen !== 'undefined' ? moduloProgramacionExamen : null,
        'HABILITAR_CAPTURA_RESULTADO':   typeof moduloProgramacionExamen !== 'undefined' ? moduloProgramacionExamen : null,
        'CAPTURAR_RESULTADO_EXAMEN':     typeof moduloProgramacionExamen !== 'undefined' ? moduloProgramacionExamen : null,
        'PROGRAMAR_CURSO':               typeof moduloCurso  !== 'undefined' ? moduloCurso  : null,
        'CAPTURAR_RESULTADO_CURSO':      typeof moduloCurso  !== 'undefined' ? moduloCurso  : null,
        'CAPTURAR_RESULTADO_PROPEDEUTICO': typeof moduloCurso !== 'undefined' ? moduloCurso : null,
        'VALIDAR_PROMEDIO':              typeof moduloPromedio !== 'undefined' ? moduloPromedio : null,
        'SUBIR_COMPROBANTE_PAGO':        typeof moduloPago !== 'undefined' ? moduloPago : null,
        'VERIFICAR_PAGO':                typeof moduloPago !== 'undefined' ? moduloPago : null,
    };
}
// Alias de compatibilidad: mantener el nombre original para cualquier acceso
// directo que ya exista en el código (se evaluará vía getter siempre fresco).
const DOCENTE_MODULOS_REGISTRY = new Proxy({}, {
    get(_, prop) {
        return getDocenteModulosRegistry()[prop];
    }
});

function abrirModalDinamico() {
    const modal = document.getElementById('modal-docente-dinamico');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalDinamico() {
    const modal = document.getElementById('modal-docente-dinamico');
    if (modal) modal.style.display = 'none';
}

// Orquestador Genérico de Solicitudes
async function abrirWorkflowSolicitud(idSolicitud) {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        // Usar la ruta del orquestador genérico para obtener la solicitud activa y sus accionesDisponibles
        const res = await fetch(`/api/solicitud/activa/${idSolicitud}?role=Docente`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("No se pudo obtener la solicitud");

        const solicitudData = await res.json();

        if (!solicitudData.accionesDisponibles || solicitudData.accionesDisponibles.length === 0) {
            // alert("No hay acciones disponibles para esta solicitud en este momento.");
            // Si el docente solo la está viendo en read-only
            console.log("Solicitud abierta en modo solo lectura (sin acciones).");
            return;
        }

        // Limpiar el contenedor del modal
        const body = document.getElementById('modal-dinamico-body');
        if (body) body.innerHTML = '';

        // Iterar sobre TODAS las acciones disponibles y ceder el control
        let modulosEjecutados = 0;
        solicitudData.accionesDisponibles.forEach(accion => {
            const moduloRenderer = DOCENTE_MODULOS_REGISTRY[accion.codigo];
            if (moduloRenderer && typeof moduloRenderer.ejecutar === 'function') {
                moduloRenderer.ejecutar(solicitudData, accion);
                modulosEjecutados++;
            } else {
                console.warn(`No hay módulo registrado para la acción: ${accion.codigo}`);
            }
        });

        if (modulosEjecutados > 0) {
            abrirModalDinamico();
        } else {
            console.log("No se pudo ejecutar ninguna de las acciones disponibles (módulos no registrados).");
        }
    } catch (error) {
        console.error("Error al abrir workflow:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al cargar la acción.', confirmButtonColor: '#ef4444' });
    }
}

async function abrirModalReprogramarExamen(idAspi) {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`/api/solicitud/activa/${idAspi}?role=Docente`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("No se pudo obtener la solicitud");

        const solicitudData = await res.json();

        const body = document.getElementById('modal-dinamico-body');
        if (body) body.innerHTML = '';

        if (typeof moduloProgramacionExamenDocenteRenderer !== 'undefined') {
            solicitudData.modoReprogramar = true;
            moduloProgramacionExamenDocenteRenderer.renderizarProgramacion(solicitudData);
            abrirModalDinamico();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el módulo de programación de examen.', confirmButtonColor: '#ef4444' });
        }
    } catch (error) {
        console.error("Error al abrir reprogramación:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al abrir el formulario de reprogramación.', confirmButtonColor: '#ef4444' });
    }
}

// Conexión Socket.io — registrar sala al conectar
const socket = io();
socket.on('connect', () => {
    const usr = JSON.parse(sessionStorage.getItem('usuario') || '{}');
    socket.emit('registrarSala', { rol: 'DOCENTE', idUsuario: usr.id });
});
socket.on('actualizacionGlobal', () => {
    // Recargar vista actual según el hash (evita recargas innecesarias)
    const currentHash = window.location.hash.replace('#', '');
    // Notificaciones se actualizan siempre (badge visible en toda la app)
    if (typeof cargarNotificaciones === 'function') cargarNotificaciones();
    if (currentHash === 'inicio' || currentHash === '') {
        // inicio no tiene datos dinámicos adicionales para el docente
    } else if (currentHash === 'expedientes' || currentHash === '') {
        if (typeof cargarAspirantesAPI === 'function') cargarAspirantesAPI();
    } else if (currentHash === 'aspirantes') {
        if (typeof cargarAspirantes === 'function') cargarAspirantes();
    } else if (window.modalidadesActivas) {
        // Módulos dinámicos: exámenes, propedeutico, promedio, etc.
        window.modalidadesActivas.forEach(mod => {
            const reg = window.ModulosRegistro && window.ModulosRegistro[mod.codigo];
            if (reg && currentHash === reg.vistaId) {
                reg.renderFn(mod.codigo);
            }
        });
    }
});

// Inicialización de la Aplicación
document.addEventListener("DOMContentLoaded", async function () {
    console.log("Portal de Docente Inicializado.");
    async function cargarDocente(id) {
        const datos = sessionStorage.getItem('token');
        try {
            const docente = await fetch(`/api/docentes/${id}`, {
                headers: {
                    "Authorization": `Bearer ${datos}`
                }
            })
            if (docente.status === 401 || docente.status === 403) {
                console.warn("Token expirado o inválido según el backend. Cerrando sesión...");
                sessionStorage.clear();
                window.location.href = 'login.html';
                return null;
            }
            const data = await docente.json()
            return data
        } catch (error) {
            console.log(error)
            throw error;
        }

    }
    // Configurar el saludo de usuario personalizado
    const tokenObj = sessionStorage.getItem('usuario');
    const tokenStr = sessionStorage.getItem('token');

    if (!tokenObj || !tokenStr) {
        console.warn("Sesión expirada o no encontrada, redirigiendo al login.");
        window.location.href = 'login.html';
        return;
    }

    const usuario = JSON.parse(tokenObj);

    try {
        window.docenteData = await cargarDocente(usuario.id);
    } catch (e) {
        console.error("Error al cargar datos del docente", e);
        window.location.href = 'login.html';
        return;
    }
    const d = window.docenteData;
    if (d) {
        const topbarIniciales = document.getElementById('topbar-iniciales');
        const topbarFirstName = document.getElementById('topbar-first-name');
        const iniciales = (d.nombre.charAt(0) + (d.primerApellido ? d.primerApellido.charAt(0) : '')).toUpperCase();
        const primerNombre = d.nombre.trim().split(' ')[0];

        if (topbarIniciales) topbarIniciales.innerText = iniciales;
        if (topbarFirstName) topbarFirstName.innerText = primerNombre;
    }

    // Registro de Módulos (Data-Driven)
    window.ModulosRegistro = {
        'EXAMEN': { renderFn: cargarTablaExamenesPorCodigo, vistaId: 'examenes' },
        'PROPEDEUTICO': { renderFn: cargarTablaPropedeuticoPorCodigo, vistaId: 'curso-propedeutico' },
        'PROMEDIO': { renderFn: cargarTablaPromedioPorCodigo, vistaId: 'promedio' },
        'CENEVAL': { renderFn: cargarTablaPromedioPorCodigo, vistaId: 'promedio' },
        'EXTRANJERO': { renderFn: cargarTablaExamenesPorCodigo, vistaId: 'examenes' }
    };

    async function inicializarMenusDinamicos() {
        try {
            const res = await fetch('/api/solicitud/ingreso/modalidades');
            if (!res.ok) return;
            const modalidades = await res.json();

            const container = document.getElementById('dynamic-menu-container');
            if (!container) return;

            window.modalidadesActivas = modalidades; // Guardar para uso global

            modalidades.forEach(mod => {
                const reg = window.ModulosRegistro[mod.codigo];
                if (reg) {
                    const navId = 'nav-' + mod.codigo.toLowerCase();
                    container.innerHTML += `
                        <li>
                            <a href="#${reg.vistaId}" onclick="switchView('${reg.vistaId}')" id="${navId}">
                                <i class="fa-solid ${mod.icono}"></i>
                                <span class="text" data-i18n="mod_${mod.codigo.toLowerCase()}">${typeof t === 'function' && t('mod_' + mod.codigo.toLowerCase()) !== 'mod_' + mod.codigo.toLowerCase() ? t('mod_' + mod.codigo.toLowerCase()) : mod.nombre}</span>
                            </a>
                        </li>
                    `;
                }
            });
            if (typeof aplicarIdioma === "function") aplicarIdioma();
        } catch (e) {
            console.error("Error al cargar menú dinámico:", e);
        }
    }

    await inicializarMenusDinamicos();
    await cargarAspirantesAPI();
    cargarNotificaciones();

    // Restaurar estado del toggle de notificaciones push
    const toggleNotiPush = document.getElementById('toggle-notificaciones-push');
    if (toggleNotiPush) {
        toggleNotiPush.checked = localStorage.getItem('notificacionesPush') !== 'false';
    }

    // Restaurar vista desde la URL (Persistencia)
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash) {
        switchView(currentHash);
    } else {
        switchView('inicio');
    }
});

async function cargarAspirantesAPI() {
    mostrarLoader();
    try {
        const token = sessionStorage.getItem("token");
        const respuesta = await fetch('/api/aspirante/expedientes/todos', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            // Mapear los datos de la BD a la estructura que requiere la vista
            aspirantes = data.map(exp => {
                const asp = exp.perfil;
                // Buscar la solicitud activa (en revision o pendiente) o la primera (que será la más reciente gracias al ORDER BY)
                const sol = exp.solicitudes && exp.solicitudes.length > 0
                    ? (exp.solicitudes.find(s => ['EN_REVISION', 'PENDIENTE', 'RECHAZADO', 'APROBADO'].includes(s.estado)) || exp.solicitudes[0])
                    : null;

                let docList = [];
                if (sol && sol.documentos) {
                    docList = sol.documentos.map(d => ({
                        id: d.idDocumento,
                        nombre: d.requisitoNombre,
                        rutaArchivo: d.rutaArchivo,
                        url: `/api/files/${d.rutaArchivo}`,
                        estado: d.estadoValidacion.toLowerCase(),
                        note: d.comentarios || "",
                        historial: d.historial || []
                    }));
                }

                if (sol && sol.pago && sol.pago.comprobante) {
                    docList.push({
                        id: `pago_${sol.idSolicitud}`,
                        nombre: 'Comprobante de Pago',
                        rutaArchivo: sol.pago.comprobante,
                        url: `/api/files/${sol.pago.comprobante}`,
                        estado: sol.pago.estado.toLowerCase(),
                        note: sol.pago.observaciones || "",
                        esPago: true,
                        idSolicitud: sol.idSolicitud,
                        monto: sol.pago.monto,
                        referencia: sol.pago.referencia
                    });
                }

                return {
                    id: asp.id,
                    idSolicitud: sol ? (sol.idSolicitud || sol.id) : null,
                    nombre: `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim() || (typeof t === 'function' ? t('docente_sin_nombre') : "Sin nombre"),
                    programa: sol ? sol.convocatoriaNombre : (typeof t === 'function' ? t('docente_sin_solicitud') : "Sin Solicitud"),
                    correo: asp.correo || (typeof t === 'function' ? t('docente_sin_correo') : "Sin correo"),
                    fechaRegistro: sol ? new Date(sol.creadoEn).toISOString().split('T')[0] : (asp.fechaNacimiento ? asp.fechaNacimiento.split('T')[0] : "N/A"),
                    mecanismo: sol ? sol.modalidadNombre : "N/A",
                    nivel: sol && sol.posgrado_id == 2 ? (typeof t === 'function' ? t('sb_doctorado') : "Doctorado") : (sol && sol.posgrado_id == 1 ? (typeof t === 'function' ? t('sb_maestria') : "Maestría") : (typeof t === 'function' ? t('docente_por_asignar') : "Por asignar")),
                    documentos: docList
                };
            });

            actualizarEstadisticas();
            filtrarYMostrarAspirantes();
            renderizarVistasAdicionalesDocente();
            if (idAspiranteActivo) {
                seleccionarAspirante(idAspiranteActivo);
            }
        } else {
            console.error("Error al obtener aspirantes de la API");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    } finally {
        ocultarLoader();
    }
}

/**
 * Control de Navegación Lateral (Cambio de Secciones)
 */
function switchView(viewId) {
    // Actualizar URL sin recargar para persistencia
    window.history.pushState(null, null, `#${viewId}`);

    // Ocultar todas las secciones y quitar fade-in
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('fade-in');
    });

    // Mostrar sección de destino con fade-in

    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        void targetSection.offsetWidth; // Trigger reflow
        targetSection.classList.add('fade-in');
    }

    // Gestionar filtros en la topbar
    const allFilters = document.querySelectorAll('.topbar-filtros');
    allFilters.forEach(f => f.style.display = 'none');

    const activeFilters = document.getElementById(`filtros-vista-${viewId}`);
    if (activeFilters) {
        activeFilters.style.display = 'flex';
    }


    // Actualizar estado activo en la barra lateral
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar a[href="#${viewId}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (viewId === 'aspirantes') {
        if (typeof cargarAspirantes === 'function') {
            cargarAspirantes();
        }
    } else {
        // Cargar módulos dinámicamente
        if (window.modalidadesActivas) {
            window.modalidadesActivas.forEach(mod => {
                const reg = window.ModulosRegistro[mod.codigo];
                if (reg && viewId === reg.vistaId) {
                    // Evitar múltiples llamadas si comparten la misma vista, aunque renderFn puede manejarlo.
                    reg.renderFn(mod.codigo);
                }
            });
        }
    }

    // Actualizar título en la barra superior (topbar)
    actualizarTituloTopbar(viewId);
}

function actualizarTituloTopbar(viewId) {
    const topbarTitle = document.getElementById('topbar-nombre-usuario');
    if (!topbarTitle) return;

    if (viewId === 'inicio') {
        const d = window.docenteData;
        if (d && d.nombre) {
            const nombreCompleto = `${d.nombre || ''} ${d.primerApellido || ''} ${d.segundoApellido || ''}`.trim();
            topbarTitle.innerText = nombreCompleto;
        } else {
            topbarTitle.innerText = typeof t === 'function' ? t('docente_revisor') : 'Docente / Revisor';
        }
    } else if (viewId === 'expedientes') {
        topbarTitle.innerText = typeof t === 'function' ? t('docente_revision_expedientes') : 'Revisión y Expedientes';
    } else if (viewId === 'aspirantes') {
        topbarTitle.innerText = typeof t === 'function' ? t('sb_aspirantes') : 'Aspirantes';
    } else if (viewId === 'examenes') {
        topbarTitle.innerText = typeof t === 'function' ? t('sb_examenes') : 'Exámenes';
    } else if (viewId === 'curso-propedeutico') {
        topbarTitle.innerText = typeof t === 'function' ? t('sb_curso_propedeutico') : 'Curso Propedéutico';
    } else if (viewId === 'promedio') {
        topbarTitle.innerText = typeof t === 'function' ? t('sb_promedio') : 'Promedio';
    }
}


/**
 * Calcula Contadores Estadísticos y Redibuja Gráfica de Avance
 */
function actualizarEstadisticas() {
    let totalAspirantes = aspirantes.length;
    let revisadosCompleto = 0; // Todos los documentos aprobados
    let incompletos = 0; // Al menos un documento rechazado
    let pendientes = 0; // Resto (tienen pendientes, ninguno rechazado)

    let totalDocs = 0;
    let docsAprobados = 0;
    let docsRechazados = 0;
    let docsPendientes = 0;

    aspirantes.forEach(asp => {
        let docs = asp.documentos;
        let tieneRechazados = false;
        let tienePendientes = false;

        docs.forEach(doc => {
            totalDocs++;
            if (doc.estado === 'aprobado') {
                docsAprobados++;
            } else if (doc.estado === 'rechazado') {
                docsRechazados++;
                tieneRechazados = true;
            } else {
                docsPendientes++;
                tienePendientes = true;
            }
        });

        if (tieneRechazados) {
            incompletos++;
        } else if (tienePendientes) {
            pendientes++;
        } else {
            revisadosCompleto++;
        }
    });

    // Inyectar contadores numéricos en el dashboard
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = totalAspirantes;
    if (document.getElementById('stat-revisados')) document.getElementById('stat-revisados').innerText = revisadosCompleto;
    if (document.getElementById('stat-incompletos')) document.getElementById('stat-incompletos').innerText = incompletos;
    if (document.getElementById('stat-pendientes')) document.getElementById('stat-pendientes').innerText = pendientes;
}

/**
 * Filtra los aspirantes de acuerdo al nombre, programa y estado del expediente
 */
function filtrarYMostrarAspirantes() {
    const queryNombre = document.getElementById('filtro-nombre').value.toLowerCase().trim();
    const filtroProg = document.getElementById('filtro-programa').value;
    const filtroEst = document.getElementById('filtro-estado').value;

    const aspirantesFiltrados = aspirantes.filter(asp => {
        // Filtro por nombre
        const matchesNombre = asp.nombre.toLowerCase().includes(queryNombre);

        // Filtro por programa
        const matchesProg = filtroProg === "" || asp.programa.includes(filtroProg);

        // Determinar estado general del aspirante
        let estadoGeneral = 'pendiente';
        const tieneRechazados = asp.documentos.some(d => d.estado === 'rechazado');
        const tienePendientes = asp.documentos.some(d => d.estado === 'pendiente');

        if (asp.documentos.length === 0) {
            estadoGeneral = 'sin_documentos';
        } else if (tieneRechazados) {
            estadoGeneral = 'incompleto';
        } else if (!tienePendientes) {
            estadoGeneral = 'revisado';
        }

        const matchesEstado = filtroEst === "" || estadoGeneral === filtroEst;

        return matchesNombre && matchesProg && matchesEstado;
    });

    renderizarListaAspirantes(aspirantesFiltrados);
}

/**
 * Renderiza los elementos de la lista de aspirantes en el contenedor izquierdo
 */
function renderizarListaAspirantes(lista) {
    const contenedor = document.getElementById('contenedor-aspirantes');
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `<div style="text-align: center; color: #888; padding: 20px; font-size: 13px;">No se encontraron aspirantes.</div>`;
        return;
    }

    lista.forEach(asp => {
        // Determinar estado general para el Badge visual de la lista
        const tieneRechazados = asp.documentos.some(d => d.estado === 'rechazado');
        const tienePendientes = asp.documentos.some(d => d.estado === 'pendiente');

        let badgeHtml = "";
        if (asp.documentos.length === 0) {
            badgeHtml = `<span class="badge" style="background-color: var(--color-surface); color: var(--color-text-muted); border: 1px solid var(--color-border);">${typeof t === 'function' ? t('docente_sin_documentos') : 'Sin Documentos'}</span>`;
        } else if (tieneRechazados) {
            badgeHtml = `<span class="badge badge-rechazado">${typeof t === 'function' ? t('docente_estado_incompletos') : 'Rechazado / Inc.'}</span>`;
        } else if (tienePendientes) {
            badgeHtml = `<span class="badge badge-pendiente">${typeof t === 'function' ? t('docente_estado_pendientes') : 'Pendiente'} (${asp.documentos.filter(d => d.estado === 'pendiente').length})</span>`;
        } else {
            badgeHtml = `<span class="badge badge-aprobado">${typeof t === 'function' ? t('docente_completos') : 'Exp. Completo'}</span>`;
        }

        const item = document.createElement('div');
        item.className = `aspirante-item ${idAspiranteActivo === asp.id ? 'active' : ''}`;
        item.onclick = () => seleccionarAspirante(asp.id);

        item.innerHTML = `
            <h4>${asp.nombre}</h4>
            <p><strong>${typeof t === 'function' ? t('det_nivel') || 'Nivel' : 'Nivel'}:</strong> ${asp.nivel}</p>
            <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${asp.programa}</p>
            ${badgeHtml}
        `;
        contenedor.appendChild(item);
    });
}

// Función para volver a la lista de aspirantes en móvil
function volverAListaAspirantes() {
    const layout = document.querySelector('.aspirantes-layout');
    if (layout) {
        layout.classList.remove('mobile-detail-active');
    }
}

/**
 * Abre el expediente del aspirante seleccionado en el panel de detalle derecho
 */
async function seleccionarAspirante(id) {
    idAspiranteActivo = id;

    // Volver a renderizar la lista para actualizar el resaltado ".active"
    filtrarYMostrarAspirantes();

    const asp = aspirantes.find(a => a.id === id);
    if (!asp) return;

    // Activar vista detalle en móvil
    const layout = document.querySelector('.aspirantes-layout');
    if (layout) layout.classList.add('mobile-detail-active');

    // Mostrar panel de contenido y ocultar placeholder
    document.getElementById('placeholder-detalle').style.display = 'none';
    document.getElementById('contenido-detalle').style.display = 'block';

    // Rellenar información básica
    document.getElementById('det-nombre').innerText = asp.nombre;
    document.getElementById('det-programa').innerText = asp.programa;
    document.getElementById('det-correo').innerText = asp.correo;
    document.getElementById('det-fecha').innerText = asp.fechaRegistro;
    document.getElementById('det-mecanismo').innerText = asp.mecanismo;
    document.getElementById('det-nivel').innerText = asp.nivel;

    // Actualizar badge superior del estado
    const badgeEstado = document.getElementById('det-estado-badge');
    const tieneRechazados = asp.documentos.some(d => d.estado === 'rechazado');
    const tienePendientes = asp.documentos.some(d => d.estado === 'pendiente');

    badgeEstado.className = "badge";
    badgeEstado.style.backgroundColor = '';
    badgeEstado.style.color = '';
    badgeEstado.style.border = '';

    if (asp.documentos.length === 0) {
        badgeEstado.style.backgroundColor = 'var(--color-surface)';
        badgeEstado.style.color = 'var(--color-text-muted)';
        badgeEstado.style.border = '1px solid var(--color-border)';
        badgeEstado.innerText = typeof t === 'function' ? t('docente_sin_documentos') : "Sin Documentos";
    } else if (tieneRechazados) {
        badgeEstado.classList.add('badge-rechazado');
        badgeEstado.innerText = typeof t === 'function' ? t('docente_estado_incompletos') : "Rechazado / Incompleto";
    } else if (tienePendientes) {
        badgeEstado.classList.add('badge-pendiente');
        badgeEstado.innerText = typeof t === 'function' ? t('docente_estado_pendientes') : "Pendiente de Revisión";
    } else {
        badgeEstado.classList.add('badge-aprobado');
        badgeEstado.innerText = typeof t === 'function' ? t('docente_completos') : "Expediente Completo";
    }

    // Rellenar cuadrícula de documentos
    const container = document.getElementById('docs-dinamicos-container');
    let html = '';

    asp.documentos.forEach(doc => {
        if (doc.esPago) {
            let pagoStatusIcon = `<span class="doc-icon-status"><i class="fa-solid fa-clock" style="color: #f59e0b;"></i></span>`;
            if (doc.estado === 'aprobado') {
                pagoStatusIcon = `<span class="doc-icon-status"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i></span>`;
            } else if (doc.estado === 'rechazado') {
                pagoStatusIcon = `<span class="doc-icon-status"><i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i></span>`;
            }

            html += `
                <div class="doc-card-v2" onclick="abrirModalEvaluacionPago(${doc.idSolicitud})" style="cursor: pointer; border-left: 4px solid #f59e0b;">
                    <div class="doc-card-v2-header">
                        <div class="doc-card-v2-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">
                            <i class="fa-solid fa-receipt"></i>
                            ${pagoStatusIcon}
                        </div>
                        <div>
                            <div class="doc-card-v2-title">Comprobante de Pago</div>
                            <div class="doc-card-v2-date">${doc.estado === 'aprobado' ? 'Pago Aprobado' : (doc.estado === 'rechazado' ? 'Pago Rechazado' : 'Revisar Pago')}</div>
                        </div>
                    </div>
                    <div class="doc-card-v2-footer">
                        <span class="doc-action-ver">Ver Comprobante</span>
                    </div>
                </div>
            `;
            return;
        }

        let iconClass = 'fa-file-lines';
        let iconBg = '#e0e7ff';
        let iconColor = '#4338ca';

        const reqLower = (doc.nombre || '').toLowerCase();
        if (reqLower.includes('acta')) {
            iconClass = 'fa-id-card';
            iconBg = '#dbeafe';
            iconColor = '#1d4ed8';
        } else if (reqLower.includes('identifica') || reqLower.includes('curp')) {
            iconClass = 'fa-address-card';
            iconBg = '#f3e8ff';
            iconColor = '#7e22ce';
        } else if (reqLower.includes('título') || reqLower.includes('titulo') || reqLower.includes('cedula') || reqLower.includes('cédula')) {
            iconClass = 'fa-graduation-cap';
            iconBg = '#dcfce7';
            iconColor = '#15803d';
        } else if (reqLower.includes('certifica') || reqLower.includes('kardex') || reqLower.includes('promedio')) {
            iconClass = 'fa-file-signature';
            iconBg = '#ffedd5';
            iconColor = '#c2410c';
        } else if (reqLower.includes('cv') || reqLower.includes('curriculum')) {
            iconClass = 'fa-user-tie';
            iconBg = '#e0f2fe';
            iconColor = '#0369a1';
        } else if (reqLower.includes('carta') || reqLower.includes('motivos')) {
            iconClass = 'fa-envelope-open-text';
            iconBg = '#fce7f3';
            iconColor = '#be185d';
        } else if (reqLower.includes('foto')) {
            iconClass = 'fa-image-portrait';
            iconBg = '#fef08a';
            iconColor = '#a16207';
        } else if (reqLower.includes('idioma')) {
            iconClass = 'fa-language';
            iconBg = '#fef08a';
            iconColor = '#a16207';
        }

        let statusIconHtml = '';
        if (doc.estado === 'aprobado') {
            statusIconHtml = `<span class="doc-icon-status"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i></span>`;
        } else if (doc.estado === 'rechazado') {
            statusIconHtml = `<span class="doc-icon-status"><i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i></span>`;
        } else {
            statusIconHtml = `<span class="doc-icon-status"><i class="fa-solid fa-clock" style="color: #f59e0b;"></i></span>`;
        }

        html += `
            <div class="doc-card-v2" onclick="abrirModalEvaluacion('${doc.id}')" style="cursor: pointer;">
                <div class="doc-card-v2-header">
                    <div class="doc-card-v2-icon" style="background: ${iconBg}; color: ${iconColor};">
                        <i class="fa-solid ${iconClass}"></i>
                        ${statusIconHtml}
                    </div>
                    <div>
                        <div class="doc-card-v2-title">${doc.nombre || 'Documento'}</div>
                        <div class="doc-card-v2-date">${doc.estado === 'aprobado' ? (typeof t === 'function' ? t('doc_subido_reciente') : 'Subido recientemente') : (typeof t === 'function' ? t('docente_btn_evaluar') : 'Evaluar Documento')}</div>
                    </div>
                </div>
                <div class="doc-card-v2-footer">
                    <span class="doc-action-ver">${typeof t === 'function' ? t('doc_ver_doc') : 'Ver Documento'}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function abrirModalEvaluacionPago(idSolicitud) {
    mostrarLoader();
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`/api/pagos/${idSolicitud}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        ocultarLoader();

        if (!res.ok) {
            Swal.fire('Error', 'No se pudieron obtener los datos del pago.', 'error');
            return;
        }

        const pagoData = await res.json();
        if (!pagoData || !pagoData.existe) {
            Swal.fire('Información', 'El aspirante aún no ha subido comprobante de pago.', 'info');
            return;
        }

        let objectUrl = '';
        try {
            const fileRes = await fetch(`/api/files/${pagoData.comprobante}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (fileRes.ok) {
                const blob = await fileRes.blob();
                objectUrl = URL.createObjectURL(blob);
            }
        } catch (e) { }

        const fileSrc = objectUrl || `/api/files/${pagoData.comprobante}`;
        const est = pagoData.estado || 'PENDIENTE';
        const estadoColor = { PENDIENTE: '#f59e0b', APROBADO: '#10b981', RECHAZADO: '#ef4444' };

        const ext = (pagoData.comprobante || '').split('.').pop().toLowerCase();
        let previewHtml = '';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            previewHtml = `<img src="${fileSrc}" style="max-width:100%;max-height:350px;display:block;margin:0 auto;border-radius:8px;object-fit:contain;">`;
        } else {
            previewHtml = `<iframe src="${fileSrc}" width="100%" height="320px" style="border:none;border-radius:8px;"></iframe>`;
        }

        const modalHtml = `
            <div style="text-align:left;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <span style="background:${estadoColor[est]}20;color:${estadoColor[est]};font-weight:bold;padding:4px 12px;border-radius:12px;font-size:12px;text-transform:uppercase;">
                        Estado: ${est}
                    </span>
                </div>
                ${pagoData.referencia ? `<div style="font-size:13px;color:var(--color-text-muted);margin-bottom:10px;"><i class="fa-solid fa-comment-dots" style="margin-right:4px;"></i> Comentarios del aspirante: <strong>${pagoData.referencia}</strong></div>` : ''}
                ${previewHtml}
                ${pagoData.observaciones ? `<div style="margin-top:12px;padding:10px;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;font-size:13px;color:#ef4444;"><strong>Observaciones del evaluador:</strong> ${pagoData.observaciones}</div>` : ''}
            </div>
        `;

        Swal.fire({
            title: 'Comprobante de Pago',
            html: modalHtml,
            width: '600px',
            showCancelButton: true,
            showDenyButton: est === 'PENDIENTE',
            showConfirmButton: est === 'PENDIENTE',
            confirmButtonText: '<i class="fa-solid fa-check"></i> Aprobar Pago',
            confirmButtonColor: '#10b981',
            denyButtonText: '<i class="fa-solid fa-xmark"></i> Rechazar Pago',
            denyButtonColor: '#ef4444',
            cancelButtonText: 'Cerrar'
        }).then((result) => {
            if (result.isConfirmed) {
                verificarPagoDocente(idSolicitud, 'APROBADO');
            } else if (result.isDenied) {
                verificarPagoDocente(idSolicitud, 'RECHAZADO');
            }
        });
    } catch (e) {
        ocultarLoader();
        console.error("Error en abrirModalEvaluacionPago:", e);
    }
}

async function verificarPagoDocente(idSolicitud, estado) {
    let observaciones = '';
    if (estado === 'RECHAZADO') {
        const { value: text, isConfirmed } = await Swal.fire({
            title: 'Rechazar Comprobante de Pago',
            input: 'textarea',
            inputLabel: 'Motivo del rechazo',
            inputPlaceholder: 'Indica por qué se rechaza el comprobante...',
            showCancelButton: true,
            confirmButtonText: 'Confirmar Rechazo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            // F-B10 FIX: validar que el motivo no esté vacío antes de confirmar.
            // Sin esta validación, confirmar sin escribir guardaba 'Comprobante no válido.' automáticamente.
            inputValidator: (value) => {
                if (!value || value.trim().length < 5) {
                    return 'Por favor, describe el motivo del rechazo (mínimo 5 caracteres).';
                }
            }
        });
        if (!isConfirmed) return;
        observaciones = text.trim();
    }

    mostrarLoader();
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`/api/pagos/verificar/${idSolicitud}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ decision: estado, estado, observaciones })
        });
        const data = await res.json();
        ocultarLoader();

        if (res.ok && data.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Actualizado!',
                text: data.mensaje || `El pago ha sido ${estado.toLowerCase()}.`,
                timer: 2000,
                showConfirmButton: false
            });
            await cargarAspirantesAPI();
            if (idAspiranteActivo) {
                seleccionarAspirante(idAspiranteActivo);
            }
        } else {
            Swal.fire('Error', data.mensaje || 'No se pudo actualizar el estado del pago.', 'error');
        }
    } catch (e) {
        ocultarLoader();
        console.error("Error en verificarPagoDocente:", e);
        Swal.fire('Error', 'Ocurrió un error de conexión.', 'error');
    }
}

// Variables globales para la evaluación en modal
let documentoAEvaluar = null;

function abrirModalEvaluacion(docId) {
    resetearBotonAprobar();
    const asp = aspirantes.find(a => a.id === idAspiranteActivo);
    if (!asp) return;

    const doc = asp.documentos.find(d => d.id == docId);
    if (!doc) return;

    documentoAEvaluar = docId;

    // Rellenar UI del modal
    document.getElementById('eval-modal-titulo').innerText = doc.nombre;
    const visor = document.getElementById('eval-tab-documento');
    const tabComentarios = document.getElementById('eval-tab-comentarios');
    const tabHistorial = document.getElementById('eval-tab-historial');

    // Generar visor de forma segura con cabecera Authorization
    visor.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-text-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x mb-2"></i><br>Cargando vista previa...</div>';
    
    const rawPath = doc.rutaArchivo || doc.url || '';
    const cleanPath = rawPath.split('?')[0];
    const fetchUrl = cleanPath.startsWith('http') || cleanPath.startsWith('/api/') ? cleanPath : `/api/files/${cleanPath}`;
    const authToken = sessionStorage.getItem('token') || localStorage.getItem('token') || '';

    fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('Error al cargar archivo');
        return res.blob();
    })
    .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const extension = cleanPath.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
            visor.innerHTML = `<img src="${objectUrl}" alt="${escaparHTML(doc.nombre)}" style="max-width: 100%; max-height: 100%; display: block; object-fit: contain;">`;
        } else {
            visor.innerHTML = `<iframe src="${objectUrl}" width="100%" height="100%" style="border: none;"></iframe>`;
        }
    })
    .catch(err => {
        console.error("Error al cargar documento en visor:", err);
        visor.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x mb-2"></i><br>No se pudo cargar la vista previa del documento.</div>';
    });

    // Comentarios
    if (doc.note && doc.note.trim() !== '') {
        tabComentarios.innerHTML = `<div style="background: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 8px;"><p style="margin: 0; color: #334155;"><strong>Nota del evaluador:</strong><br>${doc.note}</p></div>`;
    } else {
        tabComentarios.innerHTML = `<p style="color: #94a3b8; text-align: center; margin-top: 20px;">No hay comentarios registrados para este documento.</p>`;
    }

    // Historial
    if (doc.historial && doc.historial.length > 0) {
        let histHtml = '<ul style="list-style: none; padding: 0;">';
        doc.historial.forEach((h) => {
            histHtml += `<li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: ${h.estadoValidacion === 'APROBADO' ? '#10b981' : '#ef4444'}">Intento ${h.intentos} - ${h.estadoValidacion}</strong> <br>
                <span style="font-size: 13px; color: #64748b;">${h.comentarios || 'Sin comentarios adicionales.'}</span>
            </li>`;
        });
        histHtml += '</ul>';
        tabHistorial.innerHTML = histHtml;
    } else {
        tabHistorial.innerHTML = `<p style="color: #94a3b8; text-align: center; margin-top: 20px;">No hay un historial previo para este documento.</p>`;
    }

    // Resetear panel de rechazo
    ocultarOpcionesRechazo();
    document.getElementById('eval-modal-nota').value = doc.note || "";

    // Ocultar botones de evaluación si ya está aprobado
    const controlesWrapper = document.getElementById('eval-controles-wrapper');
    if (controlesWrapper) {
        if (doc.estado === 'aprobado') {
            controlesWrapper.style.display = 'none';
        } else {
            controlesWrapper.style.display = 'flex';
        }
    }

    // Seleccionar por defecto la pestaña Documento
    cambiarTabEvaluacion('documento');

    // Mostrar modal
    document.getElementById('modal-evaluacion-doc').style.display = 'flex';
}

function cambiarTabEvaluacion(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.eval-tab-content').forEach(el => el.style.display = 'none');
    // Reiniciar estilos de los botones
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#64748b';
    });

    // Mostrar el tab seleccionado
    const selectedTab = document.getElementById(`eval-tab-${tabName}`);
    if (selectedTab) {
        // si es el documento o historial lo mostramos en flex o block según convenga
        selectedTab.style.display = tabName === 'documento' ? 'flex' : 'block';
    }

    // Resaltar botón seleccionado
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = '#e2e8f0';
        activeBtn.style.color = '#334155';
    }
}



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
                        <span style="background: var(--color-border); padding: 2px 8px; border-radius: 12px; font-size: 11px; color: var(--color-text-muted); font-weight: bold;">${dateStr}</span>
                    </div>
                `;
                lastDateStr = dateStr;
            }

            chatHtml += `
                <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); padding: 12px 15px; border-radius: 18px 18px 18px 4px; box-shadow: var(--shadow-sm); font-size: 14px; color: var(--color-text); max-width: 90%; margin-bottom: 10px; word-wrap: break-word; align-self: flex-start;">
                    <div style="font-weight: bold; color: var(--color-primary); margin-bottom: 5px; font-size: 12px;">${escaparHTML(notif.nombre)}</div>
                    <div style="white-space: pre-wrap;">${escaparHTML(notif.mensaje)}</div>
                    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 5px; text-align: right;">${escaparHTML(timeStr)} ${editadoHtml}</div>
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

// Confirmación con temporizador de 3s para Aprobar Documento
let timerConfirmacionAprobar = null;
let enConfirmacionAprobar = false;
let evaluacionEnCurso = false;

function setEstadoControlesEvaluacion(disabled) {
    const wrapper = document.getElementById('eval-controles-wrapper');
    if (wrapper) {
        wrapper.querySelectorAll('button, textarea').forEach(el => el.disabled = disabled);
    }
}

function clickAprobarDocumentoModal(btn) {
    if (evaluacionEnCurso) return;
    if (!btn) btn = document.getElementById('btn-eval-aprobar-modal');

    if (enConfirmacionAprobar) {
        // Segundo clic dentro de los 3 segundos -> Confirmar
        resetearBotonAprobar(btn);
        aprobarDocumentoModal();
    } else {
        // Primer clic -> Activar cuenta regresiva
        enConfirmacionAprobar = true;
        let tiempoRestante = 3;

        if (btn) {
            btn.classList.add('btn-confirming');
            btn.innerHTML = `<i class="fa-solid fa-circle-question"></i> ¿Seguro? (${tiempoRestante}s)`;
        }

        if (timerConfirmacionAprobar) clearInterval(timerConfirmacionAprobar);

        timerConfirmacionAprobar = setInterval(() => {
            tiempoRestante--;
            if (tiempoRestante > 0) {
                if (btn) btn.innerHTML = `<i class="fa-solid fa-circle-question"></i> ¿Seguro? (${tiempoRestante}s)`;
            } else {
                resetearBotonAprobar(btn);
            }
        }, 1000);
    }
}

function resetearBotonAprobar(btn) {
    if (timerConfirmacionAprobar) {
        clearInterval(timerConfirmacionAprobar);
        timerConfirmacionAprobar = null;
    }
    enConfirmacionAprobar = false;
    if (!btn) btn = document.getElementById('btn-eval-aprobar-modal');
    if (btn) {
        btn.classList.remove('btn-confirming');
        const txtAprobar = typeof t === 'function' ? t('docente_btn_aprobar') : 'Aprobar Documento';
        btn.innerHTML = `<i class="fa-solid fa-check"></i> ${txtAprobar}`;
    }
}

function cerrarModalEvaluacion() {
    resetearBotonAprobar();
    evaluacionEnCurso = false;
    setEstadoControlesEvaluacion(false);
    document.getElementById('modal-evaluacion-doc').style.display = 'none';
    document.getElementById('eval-tab-documento').innerHTML = '';
    documentoAEvaluar = null;
}

function mostrarOpcionesRechazo() {
    resetearBotonAprobar();
    document.getElementById('eval-botones-container').style.display = 'none';
    document.getElementById('eval-panel-rechazo').style.display = 'block';
    document.getElementById('eval-modal-nota').focus();
}

function ocultarOpcionesRechazo() {
    resetearBotonAprobar();
    document.getElementById('eval-botones-container').style.display = 'flex';
    document.getElementById('eval-panel-rechazo').style.display = 'none';
}

async function aprobarDocumentoModal() {
    if (!documentoAEvaluar || evaluacionEnCurso) return;

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == documentoAEvaluar);
    if (docIndex === -1) return;

    evaluacionEnCurso = true;
    setEstadoControlesEvaluacion(true);
    mostrarLoader();
    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await fetch(`/api/documentos/evaluar/${documentoAEvaluar}`, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ estadoValidacion: 'APROBADO', comentarios: '' })
        });

        if (res.ok) {
            aspirantes[aspIndex].documentos[docIndex].estado = 'aprobado';
            aspirantes[aspIndex].documentos[docIndex].note = '';

            actualizarEstadisticas();
            seleccionarAspirante(idAspiranteActivo); // Recarga las tarjetas
            cerrarModalEvaluacion();

            Swal.fire({
                icon: 'success',
                title: 'Documento Aprobado',
                text: 'El documento ha sido marcado como aprobado exitosamente.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            const err = await res.json();
            Swal.fire({ icon: 'error', title: 'Error', text: (typeof t === 'function' ? t('docente_err_aprobar') : 'No se pudo aprobar el documento: ') + (err.mensaje || 'Error'), confirmButtonColor: '#ef4444' });
        }
    } catch (e) {
        console.error("Error al aprobar documento:", e);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: typeof t === 'function' ? t('docente_err_servidor') : 'Ocurrió un error al comunicarse con el servidor.', confirmButtonColor: '#ef4444' });
    } finally {
        evaluacionEnCurso = false;
        setEstadoControlesEvaluacion(false);
        ocultarLoader();
    }
}

async function rechazarDocumentoModal() {
    if (!documentoAEvaluar || evaluacionEnCurso) return;
    const noteText = document.getElementById('eval-modal-nota').value.trim();

    if (noteText === "") {
        Swal.fire({ icon: 'warning', title: 'Campo requerido', text: typeof t === 'function' ? t('docente_err_motivo') : 'Por favor, ingresa el motivo detallado del rechazo.', confirmButtonColor: '#f59e0b' });
        return;
    }

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == documentoAEvaluar);
    if (docIndex === -1) return;

    evaluacionEnCurso = true;
    setEstadoControlesEvaluacion(true);
    mostrarLoader();
    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await fetch(`/api/documentos/evaluar/${documentoAEvaluar}`, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ estadoValidacion: 'RECHAZADO', comentarios: noteText })
        });

        if (res.ok) {
            aspirantes[aspIndex].documentos[docIndex].estado = 'rechazado';
            aspirantes[aspIndex].documentos[docIndex].note = noteText;

            actualizarEstadisticas();
            seleccionarAspirante(idAspiranteActivo);
            cerrarModalEvaluacion();

            Swal.fire({
                icon: 'success',
                title: 'Documento Rechazado',
                text: 'El documento ha sido marcado como rechazado exitosamente.',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            const err = await res.json();
            Swal.fire({ icon: 'error', title: 'Error', text: (typeof t === 'function' ? t('docente_err_rechazar') : 'No se pudo rechazar el documento: ') + (err.mensaje || 'Error'), confirmButtonColor: '#ef4444' });
        }
    } catch (e) {
        console.error("Error al rechazar documento:", e);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: typeof t === 'function' ? t('docente_err_servidor') : 'Ocurrió un error al comunicarse con el servidor.', confirmButtonColor: '#ef4444' });
    } finally {
        evaluacionEnCurso = false;
        setEstadoControlesEvaluacion(false);
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
        const res = await fetch(`/api/notificaciones?destino=docentes&idUsuario=${idUsuario}`, {
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
                    const remitente = notif.nombreRemitente ? `${notif.rolRemitente}: ${notif.nombreRemitente}` : (isGeneral ? 'Comité Técnico' : 'Administración Posgrados');

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
                    const bgClass = grupo.isGeneral ? 'bg-primary' : 'bg-warning';

                    const dateObj = ultMsg.creado_en ? new Date(ultMsg.creado_en) : new Date();
                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                    const remitenteKey = encodeURIComponent(grupo.remitente);

                    html += `
                    <div class="chat-item p-3 border-bottom" style="cursor: pointer; display: flex; gap: 10px; align-items: center; border-color: var(--color-border) !important;" onclick="abrirNotificacion('${remitenteKey}', this)">
                        <div class="chat-avatar ${bgClass} text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div class="chat-details" style="flex: 1; overflow: hidden;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                                <div style="font-weight: bold; font-size: 13px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escaparHTML(grupo.remitente)}</div>
                                <div style="font-size: 11px; color: var(--color-text-muted); flex-shrink: 0;">${escaparHTML(formattedDate)}</div>
                            </div>
                            <div style="font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${escaparHTML(ultMsg.nombre)}</strong> - ${escaparHTML(ultMsg.mensaje)}</div>
                        </div>
                    </div>`;
                });
                contenedor.innerHTML = html;
            }
        } else {
            contenedor.innerHTML = '<div class="messages-empty-state text-danger"><i class="fa-solid fa-triangle-exclamation mb-2"></i> Error al cargar.</div>';
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

// FUNCIONES DEL PANEL LATERAL DE AJUSTES
// ==========================================
function abrirDrawerAjustes() {
    const drawer = document.getElementById('settings-drawer');
    const overlay = document.getElementById('settings-drawer-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('show');
    if (typeof sincronizarDrawerAjustes === 'function') {
        sincronizarDrawerAjustes();
    }
}

function cerrarDrawerAjustes() {
    document.getElementById('settings-drawer').classList.remove('open');
    document.getElementById('settings-drawer-overlay').classList.remove('show');
}

function guardarToggleNotificaciones(activado) {
    localStorage.setItem('notificacionesPush', activado ? 'true' : 'false');
}

// ==== PERFIL DOCENTE ====
function abrirModalPerfilDocente() {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr || !window.docenteData) return;
    const usuario = JSON.parse(usuarioStr);
    const d = window.docenteData;
    const iniciales = (d.nombre.charAt(0) + (d.primerApellido ? d.primerApellido.charAt(0) : '')).toUpperCase();
    const nombreCompleto = [d.nombre, d.primerApellido, d.segundoApellido].filter(Boolean).join(' ');
    const noReg = typeof t === 'function' ? t('prof_no_reg') : 'No registrado';

    const cell = (label, value, span = 1) =>
        `<div style="grid-column: span ${span};">
            <span style="display: block; font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">${label}</span>
            <strong style="color: var(--color-text); font-size: 15px; font-weight: 500;">${value || noReg}</strong>
        </div>`;

    Swal.fire({
        html: `
        <div class="pm-wrapper" style="text-align: left; background: var(--color-card-bg); position: relative; overflow: hidden; border-radius: 12px;">
            <div class="modal-watermark"></div>

            <div style="padding: 35px 35px 25px; display: flex; align-items: center; gap: 24px; border-bottom: 1px solid var(--color-border); position: relative; z-index: 1;">
                <div style="width: 75px; height: 75px; border-radius: 50%; background: #be185d; color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; flex-shrink: 0; box-shadow: 0 4px 10px rgba(190, 24, 93, 0.2);">${iniciales}</div>
                <div>
                    <h2 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--color-text); letter-spacing: -0.5px;">${nombreCompleto}</h2>
                    <p style="margin: 6px 0 0; color: var(--color-text-muted); font-size: 15px;"><i class="fa-regular fa-envelope" style="margin-right: 5px;"></i>${usuario.correo || noReg}</p>
                    <span style="display: inline-block; margin-top: 12px; padding: 4px 12px; background: rgba(190,24,93,0.08); color: #be185d; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${typeof t === 'function' ? t('docente_revisor') : 'Docente / Revisor'}</span>
                </div>
            </div>

            <div style="padding: 0 35px; position: relative; z-index: 1;">
                <div style="padding: 30px 0; border-bottom: 1px solid var(--color-border);">
                    <h5 style="font-size: 13px; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 25px;">${typeof t === 'function' ? t('docente_info_contacto') : 'Datos de Contacto'}</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                        ${cell(typeof t === 'function' ? t('prof_telefono') : 'Teléfono', d.telefono)}
                        ${cell(typeof t === 'function' ? t('prof_nombre') : 'Nombre completo', nombreCompleto, 2)}
                    </div>
                </div>

                <div style="padding: 30px 0 35px;">
                    <h5 style="font-size: 13px; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 25px;">${typeof t === 'function' ? t('docente_info_academica') : 'Información Académica'}</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                        ${cell(typeof t === 'function' ? t('docente_cargo') : 'Cargo', d.cargo)}
                        ${cell(typeof t === 'function' ? t('docente_especialidad') : 'Especialidad', d.especialidad)}
                        ${cell(typeof t === 'function' ? t('docente_cubiculo') : 'Cubículo', d.cubiculo)}
                    </div>
                </div>
            </div>
        </div>`,
        showConfirmButton: false,
        showCloseButton: true,
        width: '720px',
        customClass: {
            popup: 'pm-popup',
            htmlContainer: 'pm-html-container'
        }
    });
}

/**
 * Renderiza las tablas para las vistas independientes de Aspirantes, Exámenes, Curso Propedéutico y Promedio
 */
function renderizarVistasAdicionalesDocente() {
    renderizarTablaAspirantesGeneral(aspirantes);
}

function renderizarTablaAspirantesGeneral(lista) {
    const tbody = document.getElementById('tabla-aspirantes-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 25px;">No hay aspirantes registrados.</td></tr>`;
        return;
    }

    lista.forEach(asp => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--color-border)';
        tr.innerHTML = `
            <td style="padding: 12px 15px;">
                <strong>${asp.nombre}</strong><br>
                <small style="color: var(--color-text-muted);">${asp.nivel}</small>
            </td>
            <td style="padding: 12px 15px;">${asp.programa}</td>
            <td style="padding: 12px 15px;">
                <span class="badge" style="background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border);">${asp.mecanismo}</span>
            </td>
            <td style="padding: 12px 15px;">${asp.correo}</td>
            <td style="padding: 12px 15px; text-align: center;">
                <button class="btn-secondary btn-sm" onclick="switchView('expedientes'); seleccionarAspirante(${asp.id});" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-card-bg); color: var(--color-text); cursor: pointer;">
                    <i class="fa-solid fa-folder-open me-1"></i> Expediente
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarTablaAspirantes() {
    const input = document.getElementById('buscar-aspirante-tabla');
    if (!input) return;
    const query = input.value.toLowerCase().trim();
    const filtrados = aspirantes.filter(asp =>
        asp.nombre.toLowerCase().includes(query) ||
        asp.programa.toLowerCase().includes(query) ||
        asp.correo.toLowerCase().includes(query) ||
        asp.mecanismo.toLowerCase().includes(query)
    );
    renderizarTablaAspirantesGeneral(filtrados);
}

let examenesActivos = [];

async function cargarTablaExamenesPorCodigo(codigo) {
    const contenedor = document.getElementById('contenedor-examenes-cards');
    if (!contenedor) return;

    try {
        const respuesta = await fetch(`/api/solicitud/modalidad/codigo/${codigo}`);
        if (!respuesta.ok) throw new Error("Error al obtener solicitudes para exámenes");

        const data = await respuesta.json();

        // Evaluamos TODAS las solicitudes devueltas (Data-Driven puro).
        // El backend ya incluyó accionesDisponibles en cada solicitud, evitando peticiones N+1.
        const nuevosExamenes = data.map(sol => {
            const acciones = sol.accionesDisponibles || [];

            // Determinamos si esta solicitud tiene alguna acción que pertenezca a ESTE módulo
            // Usamos DOCENTE_MODULOS_REGISTRY para evitar hardcodear nombres de acción
            const accionValida = acciones.find(a =>
                DOCENTE_MODULOS_REGISTRY[a.codigo] &&
                DOCENTE_MODULOS_REGISTRY[a.codigo] === moduloProgramacionExamen
            );

            if (accionValida) {
                return { ...sol, accionActual: accionValida.codigo };
            }
            return null;
        }).filter(resultado => resultado !== null);

        examenesActivos = nuevosExamenes;
        renderExamenesCards(examenesActivos);
    } catch (error) {
        console.error("Error al cargar la tabla de exámenes:", error);
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">Error al cargar datos del servidor.</div>`;
    }
}

async function confirmarAplicacionExamen(idSolicitud) {
    const confirmacion = await Swal.fire({
        title: 'Confirmar Aplicación',
        text: '¿Estás seguro de confirmar que este examen ya se aplicó? Esto habilitará la captura de resultados.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const res = await fetch(`/api/programacion-examen/confirmar/${idSolicitud}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
            }
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire('¡Confirmado!', 'Examen confirmado. Ahora puedes capturar resultados.', 'success');
            cargarTablaExamenesPorCodigo('EXAMEN');
        } else {
            Swal.fire('Error', data.mensaje, 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo confirmar el examen', 'error');
    }
}

function renderExamenesCards(dataList) {
    const contenedor = document.getElementById('contenedor-examenes-cards');
    contenedor.innerHTML = '';

    let contPendientes = 0;
    let contHoy = 0;
    let contEsperando = 0;
    let contFinalizados = 0;

    const hoyStr = new Date().toISOString().split('T')[0];

    if (dataList.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <img src="css/umsnhLogo.png" alt="Logo UMSNH" style="width: 100px; opacity: 0.3;">
                <p style="font-size: 1.1rem; margin: 0;">Aún no hay solicitudes que revisar...</p>
            </div>`;
    }

    dataList.forEach(item => {
        const tieneProgramacion = !!item.idProgramacion;
        const accion = item.accionActual;

        let fechaObj = item.fecha ? new Date(item.fecha) : null;
        let fechaStr = fechaObj ? fechaObj.toISOString().split('T')[0] : null;
        let esHoy = fechaStr === hoyStr;
        let esPasado = fechaObj && fechaStr < hoyStr;

        let uiEstadoId = 'sin_programar';
        let borderColor = 'var(--color-border)';
        let badgeHTML = '';
        let estadoLabel = 'Sin programar';

        let disableProgramar = 'disabled';
        let disableEditar = 'disabled';
        let disableCapturar = 'disabled';
        let accionCapturar = '';

        if (accion === 'PROGRAMAR_EXAMEN') {
            if (!tieneProgramacion) {
                // Sin programar
                contPendientes++;
                uiEstadoId = 'sin_programar';
                estadoLabel = '● Sin programar';
                disableProgramar = '';
            } else {
                // Programado
                uiEstadoId = 'programado';
                borderColor = 'var(--color-primary)';
                estadoLabel = '✓ Examen programado';
                disableEditar = '';

                if (esHoy) {
                    contHoy++;
                    badgeHTML = `<span style="background: var(--color-primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px;">HOY</span>`;
                    disableCapturar = '';
                    accionCapturar = `confirmarAplicacionExamen(${item.idSolicitud})`;
                } else if (esPasado) {
                    badgeHTML = `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px;">⚠ Vencido</span>`;
                    disableCapturar = '';
                    accionCapturar = `confirmarAplicacionExamen(${item.idSolicitud})`;
                }
            }
        } else if (accion === 'CAPTURAR_RESULTADO_EXAMEN' || accion === 'HABILITAR_CAPTURA_RESULTADO') {
            uiEstadoId = 'esperando';
            contEsperando++;
            borderColor = 'var(--color-primary)';
            estadoLabel = t('docente_esperando_captura');
            disableCapturar = '';
            accionCapturar = `abrirWorkflowSolicitud(${item.idAspi})`;
            if (tieneProgramacion) {
                disableEditar = '';
            }
        } else {
            // Posiblemente finalizado (ya pasó esa etapa)
            uiEstadoId = 'finalizado';
            contFinalizados++;
            borderColor = '#22c55e';
            estadoLabel = t('docente_resultado_registrado');
            // Todo deshabilitado
        }

        const botonHTML = `
            <div style="display: flex; gap: 6px; margin-top: 4px;">
                <button class="card-action-btn ${disableProgramar ? 'disabled' : 'card-action-btn-primary'}" onclick="abrirWorkflowSolicitud(${item.idAspi})" ${disableProgramar}>
                    <i class="fa-solid fa-calendar-plus"></i> ${t('docente_btn_programar')}</button>
                <button class="card-action-btn ${disableEditar ? 'disabled' : 'card-action-btn-secondary'}" onclick="abrirModalReprogramarExamen(${item.idAspi})" ${disableEditar}>
                    <i class="fa-solid fa-pen"></i> ${t('docente_btn_reprogramar')}</button>
                <button class="card-action-btn ${disableCapturar ? 'disabled' : 'card-action-btn-primary'}" onclick="${accionCapturar}" ${disableCapturar}>
                    <i class="fa-solid fa-graduation-cap"></i> ${t('docente_btn_capturar')}</button>
            </div>
        `;

        item.uiEstadoId = uiEstadoId; // Guardamos para el filtro

        let programBadge = '';
        if (item.posgradoTipo === 'DOCTORADO') {
            programBadge = `<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">D</span>`;
        } else if (item.posgradoTipo === 'MAESTRIA') {
            programBadge = `<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">M</span>`;
        }

        const formattedDate = fechaObj ? fechaObj.toLocaleDateString() : 'Sin asignar';
        const formattedTime = item.hora ? item.hora.substring(0, 5) : 'Sin asignar';
        const formattedLugar = item.lugar || 'Sin asignar';

        const card = document.createElement('div');
        card.style.background = 'var(--color-card-bg)';
        card.style.border = `1px solid ${borderColor}`;
        card.style.borderRadius = '12px';
        card.style.padding = '20px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '16px';
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="margin: 0; font-size: 16px; color: var(--color-text); font-weight: bold;">${item.aspiranteNombre}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--color-text-muted);">${programBadge} ${item.opcionNombre || t('docente_sin_especialidad')}</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; color: var(--color-text);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i class="fa-regular fa-calendar" style="color: var(--color-text-muted);"></i>
                    <span>${formattedDate}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i class="fa-regular fa-clock" style="color: var(--color-text-muted);"></i>
                    <span>${formattedTime}</span>
                </div>
                <div style="grid-column: 1/-1; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-location-dot" style="color: var(--color-text-muted);"></i>
                    <span>${formattedLugar}</span>
                </div>
            </div>
            <div style="padding-top: 12px; border-top: 1px solid var(--color-border); margin-top: auto;">
                <div style="font-size: 12px; font-weight: bold; color: ${borderColor}; margin-bottom: 12px; display: flex; align-items: center;">
                    ${estadoLabel} ${badgeHTML}
                </div>
                ${botonHTML}
            </div>
        `;
        contenedor.appendChild(card);
    });


}

function filtrarTablaExamenesUI() {
    const texto = document.getElementById('filtro-examen-texto').value.toLowerCase();
    const estado = document.getElementById('filtro-examen-estado').value;
    const programa = document.getElementById('filtro-examen-programa').value;

    const filtrados = examenesActivos.filter(item => {
        const matchTexto = item.aspiranteNombre.toLowerCase().includes(texto) || (item.opcionNombre && item.opcionNombre.toLowerCase().includes(texto));
        const matchEstado = estado === '' || item.uiEstadoId === estado;
        const matchPrograma = programa === '' || (item.posgradoTipo && item.posgradoTipo.toLowerCase().includes(programa.toLowerCase()));
        return matchTexto && matchEstado && matchPrograma;
    });

    renderExamenesCards(filtrados);
}

let cursosActivos = [];

async function cargarTablaPropedeuticoPorCodigo(codigo = 'PROPEDEUTICO') {
    const contenedor = document.getElementById('contenedor-curso-cards');
    if (!contenedor) return;

    try {
        const respuesta = await fetch(`/api/solicitud/modalidad/codigo/${codigo}`);
        if (!respuesta.ok) throw new Error("Error al obtener solicitudes para curso propedéutico");

        const data = await respuesta.json();

        const nuevosCursos = data.map(sol => {
            const acciones = sol.accionesDisponibles || [];

            const accionValida = acciones.find(a =>
                DOCENTE_MODULOS_REGISTRY[a.codigo] &&
                DOCENTE_MODULOS_REGISTRY[a.codigo] === moduloCurso
            );

            let accionActual = 'FINALIZADO';
            if (accionValida) {
                accionActual = accionValida.codigo;
            } else if (sol.etapaNombre && (sol.etapaNombre.toLowerCase().includes('propedéutico') || sol.etapaNombre.toLowerCase().includes('resultado'))) {
                accionActual = sol.idProgramacion ? 'CAPTURAR_RESULTADO_CURSO' : 'PROGRAMAR_CURSO';
            }

            const tieneProgramacion = !!sol.idProgramacion || !!sol.fecha;
            let uiEstadoId = 'sin_programar';
            if (accionActual === 'PROGRAMAR_CURSO') {
                uiEstadoId = tieneProgramacion ? 'programado' : 'sin_programar';
            } else if (accionActual === 'CAPTURAR_RESULTADO_CURSO' || accionActual === 'CAPTURAR_RESULTADO_PROPEDEUTICO') {
                uiEstadoId = 'en_curso';
            } else {
                uiEstadoId = 'finalizado';
            }

            return { ...sol, accionActual, uiEstadoId };
        }).filter(resultado => resultado !== null);

        cursosActivos = nuevosCursos;
        filtrarTablaPropedeuticoUI();
    } catch (error) {
        console.error("Error al cargar la tabla propedéutico:", error);
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">Error al cargar datos del servidor.</div>`;
    }
}

function renderCursosCards(dataList) {
    const contenedor = document.getElementById('contenedor-curso-cards');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (dataList.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <img src="css/umsnhLogo.png" alt="Logo UMSNH" style="width: 100px; opacity: 0.3;">
                <p style="font-size: 1.1rem; margin: 0;">Aún no hay solicitudes que revisar...</p>
            </div>`;
        return;
    }

    let contPendientes = 0;
    let contProgramados = 0;
    let contEsperando = 0;
    let contFinalizados = 0;

    dataList.forEach(item => {
        const tieneProgramacion = !!item.idProgramacion || !!item.fecha;
        const accion = item.accionActual;

        let uiEstadoId = 'sin_programar';
        let borderColor = 'var(--color-border)';
        let estadoLabel = 'Sin programar';

        let disableProgramar = 'disabled';
        let disableEditar = 'disabled';
        let disableCapturar = 'disabled';

        if (accion === 'PROGRAMAR_CURSO') {
            if (!tieneProgramacion) {
                contPendientes++;
                uiEstadoId = 'sin_programar';
                estadoLabel = '● Sin programar';
                disableProgramar = '';
            } else {
                contProgramados++;
                uiEstadoId = 'programado';
                borderColor = 'var(--color-primary)';
                estadoLabel = '✓ Curso programado';
                disableEditar = '';
                disableCapturar = '';
            }
        } else if (accion === 'CAPTURAR_RESULTADO_CURSO' || accion === 'CAPTURAR_RESULTADO_PROPEDEUTICO') {
            uiEstadoId = 'en_curso';
            contEsperando++;
            borderColor = 'var(--color-primary)';
            
            const formatDateSafe = (dateString) => {
                if (!dateString) return 'Sin definir';
                // Añadimos T00:00:00 para evitar desfasaje de zona horaria si la fecha viene sin hora
                const d = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
                return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            };
            const fInicio = formatDateSafe(item.fecha);
            const fFin = formatDateSafe(item.fechaFin);
            
            estadoLabel = `En curso vigente de ${fInicio} a ${fFin}`;
            disableEditar = '';
            disableCapturar = '';
        } else {
            uiEstadoId = 'finalizado';
            contFinalizados++;
            borderColor = '#22c55e';
            estadoLabel = t('docente_resultado_registrado');
        }

        const botonHTML = `
            <div style="display: flex; gap: 6px; margin-top: 4px;">
                <button class="card-action-btn ${disableProgramar ? 'disabled' : 'card-action-btn-primary'}" onclick="abrirProgramacionCurso(${item.idSolicitud}, '${(item.aspiranteNombre || '').replace(/'/g, "\\'")}')" ${disableProgramar}>
                    <i class="fa-solid fa-calendar-plus"></i> ${t('docente_btn_programar')}</button>
                <button class="card-action-btn ${disableEditar ? 'disabled' : 'card-action-btn-secondary'}" onclick="abrirReprogramacionCurso(${item.idSolicitud}, '${(item.aspiranteNombre || '').replace(/'/g, "\\'")}')" ${disableEditar}>
                    <i class="fa-solid fa-pen"></i> ${t('docente_btn_reprogramar')}</button>
                <button class="card-action-btn ${disableCapturar ? 'disabled' : 'card-action-btn-primary'}" onclick="abrirCapturaCurso(${item.idSolicitud}, '${(item.aspiranteNombre || '').replace(/'/g, "\\'")}')" ${disableCapturar}>
                    <i class="fa-solid fa-graduation-cap"></i> ${t('docente_btn_capturar')}</button>
            </div>
        `;

        item.uiEstadoId = uiEstadoId;

        let programBadge = '';
        if (item.posgradoTipo === 'DOCTORADO') {
            programBadge = `<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">D</span>`;
        } else if (item.posgradoTipo === 'MAESTRIA') {
            programBadge = `<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">M</span>`;
        }

        const card = document.createElement('div');
        card.style.background = 'var(--color-card-bg)';
        card.style.border = `1px solid ${borderColor}`;
        card.style.borderRadius = '12px';
        card.style.padding = '20px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '16px';
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="margin: 0; font-size: 16px; color: var(--color-text); font-weight: bold;">${item.aspiranteNombre}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--color-text-muted);">${programBadge} ${item.opcionNombre || t('docente_sin_especialidad')}</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 13px; color: var(--color-text);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-book-open-reader" style="color: var(--color-text-muted);"></i>
                    <span>${t('docente_modalidad')}: ${item.modalidadNombre || 'Curso Propedéutico'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-layer-group" style="color: var(--color-text-muted);"></i>
                    <span>${t('docente_etapa')}: ${item.etapaNombre || 'Propedéutico'}</span>
                </div>
            </div>
            <div style="padding-top: 12px; border-top: 1px solid var(--color-border); margin-top: auto;">
                <div style="font-size: 12px; font-weight: bold; color: ${borderColor}; margin-bottom: 12px; display: flex; align-items: center;">
                    ${estadoLabel}
                </div>
                ${botonHTML}
            </div>
        `;
        contenedor.appendChild(card);
    });

}

function filtrarTablaPropedeuticoUI() {
    const textoInput = document.getElementById('filtro-curso-texto');
    const estadoSelect = document.getElementById('filtro-curso-estado');
    const programaSelect = document.getElementById('filtro-curso-programa');

    const texto = textoInput ? textoInput.value.toLowerCase() : '';
    const estado = estadoSelect ? estadoSelect.value : '';
    const programa = programaSelect ? programaSelect.value : '';

    // Si se seleccionó un estado del desplegable, desactivamos el toggle de "En cursos"
    if (estado !== '' && window.filtroEnCursoActivo) {
        window.filtroEnCursoActivo = false;
        const btn = document.getElementById('btn-filtro-en-curso');
        if (btn) {
            btn.style.background = 'var(--color-input-bg)';
            btn.style.color = 'var(--color-text)';
            btn.style.borderColor = 'var(--color-border)';
        }
    }

    const filtrados = cursosActivos.filter(item => {
        const matchTexto = item.aspiranteNombre.toLowerCase().includes(texto) || (item.opcionNombre && item.opcionNombre.toLowerCase().includes(texto));
        
        let matchEstado;
        if (window.filtroEnCursoActivo) {
            matchEstado = item.uiEstadoId === 'en_curso';
        } else {
            // Si el estado es vacío (Todos), ocultamos los de 'en_curso' para que solo salgan con el botón
            matchEstado = estado === '' ? item.uiEstadoId !== 'en_curso' : item.uiEstadoId === estado;
        }
        
        const matchPrograma = programa === '' || (item.posgradoTipo && item.posgradoTipo.toLowerCase().includes(programa.toLowerCase()));
        return matchTexto && matchEstado && matchPrograma;
    });

    renderCursosCards(filtrados);
}

window.filtroEnCursoActivo = false;
function toggleFiltroEnCurso() {
    window.filtroEnCursoActivo = !window.filtroEnCursoActivo;
    const btn = document.getElementById('btn-filtro-en-curso');
    const selectEstado = document.getElementById('filtro-curso-estado');
    if (window.filtroEnCursoActivo) {
        btn.style.background = 'var(--color-primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--color-primary)';
        if(selectEstado) selectEstado.value = ''; // Reset select
    } else {
        btn.style.background = 'var(--color-input-bg)';
        btn.style.color = 'var(--color-text)';
        btn.style.borderColor = 'var(--color-border)';
    }
    filtrarTablaPropedeuticoUI();
}

function abrirProgramacionCurso(idSolicitud, aspiranteNombre) {
    const modal = document.getElementById('modal-docente-dinamico');
    const body = document.getElementById('modal-dinamico-body');
    if (!modal || !body) return;
    body.innerHTML = '';
    modal.style.display = 'flex';

    const item = (typeof cursosActivos !== 'undefined' && Array.isArray(cursosActivos)) 
        ? cursosActivos.find(c => (c.idSolicitud || c.id) === idSolicitud) 
        : null;

    moduloCurso.ejecutar({
        idSolicitud,
        aspiranteNombre: (item && item.aspiranteNombre) || aspiranteNombre,
        posgradoNombre: item ? item.posgradoNombre : null,
        opcionNombre: item ? (item.opcionNombre || item.opcionElegida) : null,
        esDocente: true,
        accionActiva: 'PROGRAMAR_CURSO',
        modoReprogramar: false
    });
}

function abrirReprogramacionCurso(idSolicitud, aspiranteNombre) {
    const modal = document.getElementById('modal-docente-dinamico');
    const body = document.getElementById('modal-dinamico-body');
    if (!modal || !body) return;
    body.innerHTML = '';
    modal.style.display = 'flex';

    const item = (typeof cursosActivos !== 'undefined' && Array.isArray(cursosActivos)) 
        ? cursosActivos.find(c => (c.idSolicitud || c.id) === idSolicitud) 
        : null;

    moduloCurso.ejecutar({
        idSolicitud,
        aspiranteNombre: (item && item.aspiranteNombre) || aspiranteNombre,
        posgradoNombre: item ? item.posgradoNombre : null,
        opcionNombre: item ? (item.opcionNombre || item.opcionElegida) : null,
        esDocente: true,
        accionActiva: 'PROGRAMAR_CURSO',
        modoReprogramar: true
    });
}

function abrirCapturaCurso(idSolicitud, aspiranteNombre) {
    const modal = document.getElementById('modal-docente-dinamico');
    const body = document.getElementById('modal-dinamico-body');
    if (!modal || !body) return;
    body.innerHTML = '';
    modal.style.display = 'flex';

    const item = (typeof cursosActivos !== 'undefined' && Array.isArray(cursosActivos)) 
        ? cursosActivos.find(c => (c.idSolicitud || c.id) === idSolicitud) 
        : null;

    moduloCurso.ejecutar({
        idSolicitud,
        aspiranteNombre: (item && item.aspiranteNombre) || aspiranteNombre,
        posgradoNombre: item ? item.posgradoNombre : null,
        opcionNombre: item ? (item.opcionNombre || item.opcionElegida) : null,
        esDocente: true,
        accionActiva: 'CAPTURAR_RESULTADO_CURSO',
        modoCapturar: true
    });
}

let promediosActivos = [];

async function cargarTablaPromedioPorCodigo(codigo = 'PROMEDIO') {
    const contenedor = document.getElementById('contenedor-promedio-cards');
    if (!contenedor) return;

    try {
        const respuesta = await fetch(`/api/solicitud/modalidad/codigo/${codigo}`);
        if (!respuesta.ok) throw new Error("Error al obtener solicitudes para evaluación de promedio");

        const data = await respuesta.json();
        promediosActivos = data;
        renderPromediosCards(promediosActivos);
    } catch (error) {
        console.error("Error al cargar la sección de promedio:", error);
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">Error al cargar datos del servidor.</div>`;
    }
}

function renderPromediosCards(dataList) {
    const contenedor = document.getElementById('contenedor-promedio-cards');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    let contPendientes = 0;
    let contAprobados = 0;
    let contRechazados = 0;

    if (!dataList || dataList.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <img src="css/umsnhLogo.png" alt="Logo UMSNH" style="width: 100px; opacity: 0.3;">
                <p style="font-size: 1.1rem; margin: 0;">Aún no hay solicitudes que revisar...</p>
            </div>`;
        return;
    }

    dataList.forEach(item => {
        const acciones = item.accionesDisponibles || [];
        const tieneAccionValidar = acciones.some(a => a.codigo === 'VALIDAR_PROMEDIO') || item.idEtapaActual === 5;
        const estado = item.estadoSolicitud || 'PENDIENTE';
        let uiEstadoId = 'pendiente';
        let borderColor = 'var(--color-border)';
        let estadoLabel = t('docente_rev_promedio');
        let badgeHTML = '';
        let disableAuditar = true;

        if (estado === 'APROBADO' || (item.etapaNombre && item.etapaNombre.toLowerCase().includes('resultado'))) {
            uiEstadoId = 'aprobado';
            contAprobados++;
            borderColor = '#22c55e';
            estadoLabel = t('docente_promedio_valido');
            badgeHTML = `<span style="background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #bbf7d0; margin-left: 8px;">${t('docente_estado_aprobado')}</span>`;
            disableAuditar = true;
        } else if (estado === 'RECHAZADO') {
            uiEstadoId = 'rechazado';
            contRechazados++;
            borderColor = '#ef4444';
            estadoLabel = t('docente_promedio_rechazado');
            badgeHTML = `<span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #fecaca; margin-left: 8px;">${t('docente_estado_rechazado')}</span>`;
            disableAuditar = true;
        } else if (!tieneAccionValidar) {
            // Aspirante aún está en Etapa 1 (Documentación) o etapa previa
            uiEstadoId = 'pendiente';
            contPendientes++;
            borderColor = '#f97316';
            estadoLabel = t('docente_rev_doc');
            badgeHTML = `<span style="background: #fff7ed; color: #ea580c; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #fed7aa; margin-left: 8px;">${t('docente_estado_documentacion')}</span>`;
            disableAuditar = true;
        } else {
            // Etapa de Validación de Promedio activa (Etapa 5)
            uiEstadoId = 'pendiente';
            contPendientes++;
            borderColor = '#f97316';
            estadoLabel = t('docente_listo_dictamen');
            badgeHTML = `<span style="background: #fff7ed; color: #ea580c; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #fed7aa; margin-left: 8px;">${t('docente_estado_pendiente')}</span>`;
            disableAuditar = false;
        }

        item.uiEstadoId = uiEstadoId;

        let programBadge = '';
        if (item.posgradoTipo === 'DOCTORADO') {
            programBadge = `<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">D</span>`;
        } else if (item.posgradoTipo === 'MAESTRIA') {
            programBadge = `<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">M</span>`;
        }

        const botonHTML = disableAuditar ? `
            <button disabled style="width: 100%; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-muted); cursor: not-allowed;" title="${t('docente_tooltip_doc')}">
                <i class="fa-solid fa-lock me-1"></i> ${t('docente_esp_val_doc')}
            </button>
        ` : `
            <button class="btn-primary" onclick="moduloPromedio.auditarPromedio(${item.idSolicitud}, () => cargarTablaPromedioPorCodigo('PROMEDIO'))" style="width: 100%; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px; border: none; cursor: pointer; background: var(--color-primary); color: white;">
                <i class="fa-solid fa-file-signature me-1"></i> ${t('docente_btn_auditar')}
            </button>
        `;

        const card = document.createElement('div');
        card.style.background = 'var(--color-card-bg)';
        card.style.border = `1px solid ${borderColor}`;
        card.style.borderRadius = '12px';
        card.style.padding = '20px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '16px';
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="margin: 0; font-size: 16px; color: var(--color-text); font-weight: bold;">${item.aspiranteNombre}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--color-text-muted);">${programBadge} ${item.opcionNombre || t('docente_sin_especialidad')}</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 13px; color: var(--color-text);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-calculator" style="color: var(--color-text-muted);"></i>
                    <span>${t('docente_modalidad')}: ${item.modalidadNombre || t('docente_promedio_fie')}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-layer-group" style="color: var(--color-text-muted);"></i>
                    <span>${t('docente_etapa')}: ${item.etapaNombre || t('docente_val_promedio')}</span>
                </div>
            </div>
            <div style="padding-top: 12px; border-top: 1px solid var(--color-border); margin-top: auto;">
                <div style="font-size: 12px; font-weight: bold; color: ${borderColor}; margin-bottom: 12px; display: flex; align-items: center;">
                    ${estadoLabel} ${badgeHTML}
                </div>
                ${botonHTML}
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function filtrarTablaPromedioUI() {
    const textoInput = document.getElementById('filtro-promedio-texto');
    const estadoSelect = document.getElementById('filtro-promedio-estado');
    const programaSelect = document.getElementById('filtro-promedio-programa');

    const texto = textoInput ? textoInput.value.toLowerCase() : '';
    const estado = estadoSelect ? estadoSelect.value : '';
    const programa = programaSelect ? programaSelect.value : '';

    const filtrados = promediosActivos.filter(item => {
        const matchTexto = item.aspiranteNombre.toLowerCase().includes(texto) || (item.opcionNombre && item.opcionNombre.toLowerCase().includes(texto));
        const matchEstado = estado === '' || item.uiEstadoId === estado;
        const matchPrograma = programa === '' || (item.posgradoTipo && item.posgradoTipo.toLowerCase().includes(programa.toLowerCase()));
        return matchTexto && matchEstado && matchPrograma;
    });

    renderPromediosCards(filtrados);
}


async function cargarAspirantes() {
    const totalAspirantes = document.getElementById("totalAspirantes");
    const tbody = document.getElementById("tablaAspirantes");
    if (!tbody) return;

    mostrarLoader();
    try {
        const respuesta = await fetch("/api/aspirante");

        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const aspirantes = await respuesta.json();
        if (totalAspirantes) {
            totalAspirantes.textContent = aspirantes.length || 0;
        }

        tbody.innerHTML = "";

        if (!aspirantes || aspirantes.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>No hay aspirantes registrados.</td></tr>";
            return;
        }

        for (const aspirante of aspirantes) {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid var(--color-border)";
            tr.style.transition = "background 0.2s";
            tr.onmouseover = function () { this.style.background = 'var(--color-bg)'; };
            tr.onmouseout = function () { this.style.background = 'transparent'; };

            // Formatear nombre completo
            const nombreCompleto = `${aspirante.nombre || ''} ${aspirante.primerApellido || ''} ${aspirante.segundoApellido || ''}`.trim();

            async function correoAspirante(idUsuario) {
                if (!idUsuario) return null;
                try {
                    const respuesta1 = await fetch(`/api/usuario/${idUsuario}`);
                    const usuario1 = await respuesta1.json();
                    return usuario1.correo;
                } catch (e) {
                    return null;
                }
            }

            async function posgradoAspirante(asp) {
                if (asp.posgradoNombre) return asp.posgradoNombre;
                try {
                    const resExp = await fetch(`/api/aspirante/${asp.id}/expediente`);
                    if (!resExp.ok) return null;
                    const exp = await resExp.json();
                    if (exp.solicitudes && exp.solicitudes.length > 0) {
                        const sol = exp.solicitudes[0];
                        return sol.convocatoriaNombre || sol.opcionNombre || null;
                    }
                } catch (e) {
                    return null;
                }
                return null;
            }

            const correoReal = (await correoAspirante(aspirante.idUsuario)) || aspirante.correo || 'Sin correo';
            const posgradoNombreReal = await posgradoAspirante(aspirante);

            const posgradoTxt = posgradoNombreReal || 'Sin posgrado seleccionado';
            const badgeClass = posgradoNombreReal ? 'soft-badge-primary' : 'soft-badge-secondary';

            const curpStr = aspirante.curp || 'Sin CURP';
            const telefonoStr = aspirante.telefono || 'Sin teléfono';
            const licenciaturaStr = aspirante.licenciatura || 'Licenciatura no especificada';
            const institucionStr = aspirante.institucionLicenciatura || 'Institución no especificada';
            const promedioStr = (aspirante.promedio !== null && aspirante.promedio !== undefined) ? aspirante.promedio : null;

            const iniNombre = (aspirante.nombre || '').charAt(0).toUpperCase();
            const iniApellido = (aspirante.primerApellido || '').charAt(0).toUpperCase();
            const iniciales = (iniNombre + iniApellido) || 'A';

            tr.style.cursor = "pointer";
            tr.onclick = () => verExpedienteAspirante(aspirante.id);
            tr.innerHTML = `
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <strong style="color: var(--color-text); font-size: 0.95rem; display: block;">${nombreCompleto || 'Sin nombre'}</strong>
                    <small style="font-size: 0.8rem; color: var(--color-text-muted); display: block; margin-top: 3px;">
                        <i class="fa-regular fa-envelope me-1" style="color: var(--color-primary);"></i>${correoReal}
                    </small>
                </td>
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text); font-family: monospace;">
                        <i class="fa-solid me-1" style="color: var(--color-text-muted);"></i>${curpStr}
                    </div>
                </td>
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--color-text);">
                        <i class="fa-solid me-1" style="color: var(--color-primary);"></i>${licenciaturaStr}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 2px;">
                        ${institucionStr} ${promedioStr ? `<span style="background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); padding: 1px 6px; border-radius: 10px; font-weight: 700; font-size: 10px; margin-left: 6px;">Prom: ${promedioStr}</span>` : ''}
                    </div>
                </td>
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <span class="soft-badge ${badgeClass}" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-book-bookmark"></i> ${posgradoTxt}
                    </span>
                </td>
                <td style="padding: 14px 15px; text-align: center; vertical-align: middle;">
                    <button onclick="event.stopPropagation(); verExpedienteAspirante(${aspirante.id});" title="Ver expediente" style="background: transparent; border: none; color: var(--color-primary); font-size: 1.25rem; cursor: pointer; padding: 6px 10px; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='transparent'">
                        <i class="fa-solid fa-folder-open"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    } catch (error) {
        console.error("Error al cargar aspirantes:", error);
        tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>Esperando API de aspirantes...</td></tr>";
    } finally {
        ocultarLoader();
    }
}

async function verExpedienteAspirante(id) {
    mostrarLoader();
    try {
        const respuesta = await fetch(`/api/aspirante/${id}/expediente`);
        if (!respuesta.ok) throw new Error("Aspirante no encontrado");

        const expediente = await respuesta.json();
        const perfil = expediente.perfil || {};
        const solicitudes = expediente.solicitudes || [];

        // Llenar el perfil resumido
        const nombreCompleto = `${perfil.nombre || ''} ${perfil.primerApellido || ''} ${perfil.segundoApellido || ''}`.trim();
        document.getElementById("perfil_nombreCompleto").textContent = nombreCompleto;

        // Avatar iniciales
        const iniNombre = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : '';
        const iniApellido = perfil.primerApellido ? perfil.primerApellido.charAt(0).toUpperCase() : '';
        document.getElementById("perfil_avatar").textContent = (iniNombre + iniApellido) || '--';
        document.getElementById("perfil_correo").textContent = perfil.correo || "Sin correo";

        document.getElementById("perfil_curp").textContent = perfil.curp || "N/A";
        document.getElementById("perfil_telefono").textContent = perfil.telefono || "N/A";

        let fechaNac = "N/A";
        if (perfil.fechaNacimiento) {
            fechaNac = new Date(perfil.fechaNacimiento).toLocaleDateString();
        }
        document.getElementById("perfil_nacimiento").textContent = fechaNac;

        let direccion = perfil.direccion || "";
        if (perfil.direccionPostal) direccion += ` (CP: ${perfil.direccionPostal})`;
        document.getElementById("perfil_direccion").textContent = direccion || "N/A";

        document.getElementById("perfil_estadoCivil").textContent = perfil.estadoCivil || "N/A";
        document.getElementById("perfil_licenciatura").textContent = perfil.licenciatura || "N/A";
        document.getElementById("perfil_institucionLicenciatura").textContent = perfil.institucionLicenciatura || "N/A";

        document.getElementById("perfil_fechaEgreso").textContent = perfil.fechaEgreso ? new Date(perfil.fechaEgreso).toLocaleDateString() : "N/A";
        document.getElementById("perfil_fechaTitulacion").textContent = perfil.fechaTitulacion ? new Date(perfil.fechaTitulacion).toLocaleDateString() : "N/A";
        document.getElementById("perfil_promedio").textContent = perfil.promedio || "N/A";

        let ocupacionInfo = perfil.ocupacion || "N/A";
        if (perfil.ciudadOcupacion || perfil.estadoOcupacion) ocupacionInfo += ` (${perfil.ciudadOcupacion || ''}, ${perfil.estadoOcupacion || ''})`;
        if (perfil.telefonoOcupacion) ocupacionInfo += ` - Tel: ${perfil.telefonoOcupacion}`;
        document.getElementById("perfil_ocupacion").textContent = ocupacionInfo;

        document.getElementById("perfil_otrosEstudios").textContent = perfil.otrosEstudios || "N/A";

        const badgeEstado = document.getElementById("perfil_estado");
        if (perfil.activo) {
            badgeEstado.className = "soft-badge soft-badge-success mb-4 d-inline-block";
            badgeEstado.textContent = "USUARIO ACTIVO";
        } else {
            badgeEstado.className = "soft-badge soft-badge-danger mb-4 d-inline-block";
            badgeEstado.textContent = "USUARIO INACTIVO";
        }

        // Llenar las solicitudes
        const contSolicitudes = document.getElementById("contenedorSolicitudes");
        contSolicitudes.innerHTML = ""; // Limpiar

        if (solicitudes.length === 0) {
            contSolicitudes.innerHTML = `
                <div class="text-center py-4">
                    <img src="css/umsnhLogo.png" alt="Logo UMSNH" style="width: 130px; max-width: 80%; opacity: 0.45;" class="mb-3 d-block mx-auto">
                    <p class="text-muted fw-medium">El aspirante aún no ha iniciado ningún proceso de admisión.</p>
                </div>
            `;
        } else {
            solicitudes.forEach((sol, index) => {
                let badgeSolicitud = "soft-badge-warning";
                if (sol.estado === "APROBADO") badgeSolicitud = "soft-badge-success";
                else if (sol.estado === "RECHAZADO") badgeSolicitud = "soft-badge-danger";

                const d = new Date(sol.creadoEn).toLocaleDateString();
                const containerId = `sol-docs-${sol.id || index}`;
                const chevronId = `chevron-${sol.id || index}`;

                // Armar la lista de documentos
                let htmlDocs = "";
                if (sol.documentos && sol.documentos.length > 0) {
                    htmlDocs = `<div style="margin-top: 1rem;"><h6 style="font-size: 0.85rem; font-weight: bold; color: var(--color-text-muted); margin-bottom: 0.75rem; letter-spacing: 0.5px; text-transform: uppercase;">Documentos Adjuntos</h6><div style="border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">`;
                    sol.documentos.forEach(doc => {
                        let classBadge = "soft-badge-warning";
                        if (doc.estadoValidacion === "APROBADO") { classBadge = "soft-badge-success"; }
                        else if (doc.estadoValidacion === "RECHAZADO") { classBadge = "soft-badge-danger"; }

                        htmlDocs += `
                            <div class="doc-row-premium" onclick="abrirArchivoSeguro('${doc.rutaArchivo}')">
                                <div style="display: flex; align-items: center;">
                                    <i class="fa-solid fa-file-pdf doc-icon"></i>
                                    <span style="font-weight: 500; color: var(--color-text);">${doc.requisitoNombre}</span>
                                </div>
                                <div style="display: flex; align-items: center;">
                                    <span class="soft-badge ${classBadge}" style="margin-right: 1rem;">${doc.estadoValidacion}</span>
                                    <i class="fa-solid fa-chevron-right chevron-icon"></i>
                                </div>
                            </div>
                        `;
                    });
                    htmlDocs += `</div></div>`;
                } else {
                    htmlDocs = `<div style="margin-top: 1rem; padding: 1.25rem; text-align: center; border-radius: 8px; background: var(--color-bg);"><p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 0;"><i class="fa-solid fa-folder-minus" style="margin-right: 0.5rem;"></i> No se han adjuntado documentos aún.</p></div>`;
                }

                contSolicitudes.innerHTML += `
                    <div style="margin-bottom: 1.25rem; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card-bg); transition: all 0.2s;">
                        <div onclick="toggleSolicitudDocs('${containerId}', '${chevronId}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; user-select: none;">
                            <div>
                                <h5 style="font-weight: bold; margin-bottom: 0.35rem; color: var(--color-text); font-size: 1.15rem; display: flex; align-items: center; gap: 10px;">
                                    <span>${sol.convocatoriaNombre}</span>
                                    <i id="${chevronId}" class="fa-solid fa-chevron-down" style="font-size: 0.85rem; color: var(--color-primary); transition: transform 0.3s ease;"></i>
                                </h5>
                                ${sol.opcionNombre ? `<div style="margin-bottom: 0.35rem;"><span class="soft-badge soft-badge-secondary"><i class="fa-solid fa-layer-group me-1"></i> Opción: ${sol.opcionNombre}</span></div>` : ''}
                                <div style="color: var(--color-text-muted); font-size: 0.85rem; font-weight: 500;">
                                    <span>Iniciado el: ${d}</span> &nbsp;&bull;&nbsp; <span>${sol.modalidadNombre || 'Sin modalidad'}</span>
                                </div>
                            </div>
                            <span class="soft-badge ${badgeSolicitud}">${sol.estado}</span>
                        </div>
                        <div id="${containerId}" style="display: none; margin-top: 0.75rem; border-top: 1px dashed var(--color-border); padding-top: 0.75rem;">
                            ${htmlDocs}
                        </div>
                    </div>
                `;
            });
        }

        // Intercambiar vistas
        document.getElementById("vistaTablaAspirantes").style.display = "none";
        document.getElementById("vistaPerfilAspirante").style.display = "block";

    } catch (error) {
        console.error("Error al cargar expediente:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el expediente del aspirante.', confirmButtonColor: '#ef4444' });
    } finally {
        ocultarLoader();
    }
}

function cerrarExpedienteAspirante() {
    document.getElementById("vistaPerfilAspirante").style.display = "none";
    document.getElementById("vistaTablaAspirantes").style.display = "block";
}

function toggleSolicitudDocs(containerId, chevronId) {
    const container = document.getElementById(containerId);
    const chevron = document.getElementById(chevronId);
    if (!container) return;

    if (container.style.display === "none" || container.style.display === "") {
        container.style.display = "block";
        if (chevron) chevron.style.transform = "rotate(180deg)";
    } else {
        container.style.display = "none";
        if (chevron) chevron.style.transform = "rotate(0deg)";
    }
}

// Funciones de Filtrado UI para Aspirantes
window.filtrarTablaAspirantesUI = function () {
    const texto = (document.getElementById('filtro-aspirantes-texto')?.value || '').toLowerCase();
    const programa = (document.getElementById('filtro-aspirantes-programa')?.value || '').toLowerCase();

    const tbody = document.getElementById("tablaAspirantes");
    if (!tbody) return;

    const filas = tbody.querySelectorAll('tr');
    filas.forEach(fila => {
        // Ignorar fila de "no hay registros"
        if (fila.querySelector('td[colspan]')) return;

        const tdNombre = fila.children[0];
        const tdPrograma = fila.children[1];

        if (!tdNombre || !tdPrograma) return;

        const textoFila = tdNombre.innerText.toLowerCase();
        const textoPrograma = tdPrograma.innerText.toLowerCase();

        const matchTexto = !texto || textoFila.includes(texto);
        const matchPrograma = !programa || textoPrograma.includes(programa);

        if (matchTexto && matchPrograma) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
};

/* ==========================================================================
   Carousel Logic (Docente Inicio)
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

document.addEventListener('DOMContentLoaded', async () => {
    carouselTrack = document.getElementById('inicio-carousel-track');
    const indicatorsContainer = document.getElementById('inicio-carousel-indicators');

    if (carouselTrack && indicatorsContainer) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch('/api/avisos/activos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const avisos = await res.json();
                
                if (avisos.length === 0) {
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

// --- EVALUACION POR TEMAS HELPER ---
const EvaluacionTemasHelper = {
    async renderizar(idSolicitud, contenedor) {
        contenedor.innerHTML = '<p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Cargando temas...</p>';
        
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/solicitud-temas/${idSolicitud}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                throw new Error("HTTP Status " + res.status);
            }

            const temas = await res.json();

            this.errorCarga = this.errorCarga || {};
            this.errorCarga[idSolicitud] = false;

            if (!temas || temas.length === 0) {
                contenedor.innerHTML = '';
                return;
            }

            // Guardar temas para la validación posterior
            this.temasCache = this.temasCache || {};
            this.temasCache[idSolicitud] = temas;

            let html = `
                <div style="margin-bottom: 20px; border: 1px solid var(--color-border); padding: 15px; border-radius: 8px; background: var(--color-bg);">
                    <h6 style="margin-bottom: 12px; font-weight: 600; color: var(--color-text);">Evaluación por Temas</h6>
                    <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 15px;">Guarde cada tema individualmente antes de finalizar la captura general.</p>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 custom-premium-table eval-temas-table">
                            <thead class="table-light">
                                <tr>
                                    <th style="min-width: 150px;">Tema</th>
                                    <th style="width: 130px; min-width: 100px;">Calificación</th>
                                    <th style="min-width: 150px;">Observaciones</th>
                                    <th style="width: 110px; min-width: 120px;">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="temas-tbody-${idSolicitud}">
            `;

            temas.forEach(tema => {
                const calif = (tema.calificacion !== null && tema.calificacion !== undefined) ? tema.calificacion : '';
                const obs = tema.observaciones || '';
                const btnClase = (tema.calificacion !== null && tema.calificacion !== undefined) ? 'btn-success' : 'btn-primary';
                const btnIcon = (tema.calificacion !== null && tema.calificacion !== undefined) ? 'fa-check' : 'fa-save';
                const btnText = (tema.calificacion !== null && tema.calificacion !== undefined) ? 'Guardado' : 'Guardar';
                
                html += `
                    <tr data-tema-id="${tema.id}">
                        <td style="font-size: 0.9rem; color: var(--color-text);">${tema.nombreTema || 'Tema'}</td>
                        <td>
                            <input type="number" class="form-control tema-calif" step="1" min="1" max="10" value="${calif}" placeholder="1-10" oninput="EvaluacionTemasHelper.marcarComoModificado(this, ${idSolicitud})" style="background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; min-height: 40px;" aria-label="Calificación para el tema ${tema.nombreTema || 'Tema'}">
                        </td>
                        <td>
                            <input type="text" class="form-control tema-obs" value="${obs}" placeholder="Opcional" oninput="EvaluacionTemasHelper.marcarComoModificado(this, ${idSolicitud})" style="background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; min-height: 40px;" aria-label="Observaciones para el tema ${tema.nombreTema || 'Tema'}">
                        </td>
                        <td>
                            <button type="button" class="btn ${btnClase} btn-guardar-tema w-100" onclick="EvaluacionTemasHelper.guardarTema(this, ${tema.id}, ${idSolicitud})" title="Guardar calificación de ${tema.nombreTema || 'Tema'}" style="min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fa-solid ${btnIcon}"></i> <span class="btn-text">${btnText}</span>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            contenedor.innerHTML = html;
            this.recalcularPromedio(idSolicitud);
        } catch (error) {
            console.error("Error al cargar temas:", error);
            this.errorCarga = this.errorCarga || {};
            this.errorCarga[idSolicitud] = true;
            
            contenedor.innerHTML = `
                <div class="alert alert-danger" style="margin-bottom: 20px; font-size: 0.9rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error al cargar los temas de evaluación. No podrá finalizar la captura hasta que se resuelva.
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="EvaluacionTemasHelper.renderizar(${idSolicitud}, document.getElementById('${contenedor.id}'))">
                        <i class="fa-solid fa-rotate-right"></i> Reintentar
                    </button>
                </div>
            `;
        }
    },

    async guardarTema(btn, idSolicitudTema, idSolicitud) {
        const tr = btn.closest('tr');
        const calificacionVal = tr.querySelector('.tema-calif').value;
        const observaciones = tr.querySelector('.tema-obs').value;

        if (calificacionVal === '') {
            Swal.fire({ icon: 'warning', title: 'Calificación Requerida', text: 'Debes ingresar una calificación para este tema.', timer: 2000 });
            return;
        }

        try {
            btn.disabled = true;
            const btnTextSpan = btn.querySelector('.btn-text');
            if (btnTextSpan) btnTextSpan.innerText = 'Guardando...';

            const calificacion = parseInt(calificacionVal, 10);
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/solicitud-temas/${idSolicitudTema}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ calificacion, observaciones })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || 'Error al guardar');

            btn.className = 'btn btn-sm btn-success btn-guardar-tema';
            btn.innerHTML = '<i class="fa-solid fa-check"></i> <span class="btn-text">Guardado</span>';
            
            // Actualizar caché
            if (this.temasCache && this.temasCache[idSolicitud]) {
                const tema = this.temasCache[idSolicitud].find(t => t.id === idSolicitudTema);
                if (tema) {
                    tema.calificacion = calificacion;
                }
            }

            this.recalcularPromedio(idSolicitud);

        } catch (error) {
            console.error("Error al guardar tema:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
            btn.className = 'btn btn-sm btn-danger btn-guardar-tema';
            btn.innerHTML = '<i class="fa-solid fa-times"></i> <span class="btn-text">Reintentar</span>';
        } finally {
            btn.disabled = false;
        }
    },

    marcarComoModificado(input, idSolicitud) {
        if (input.classList.contains('tema-calif')) {
            // Regex y sanitización: solo enteros del 1 al 10, sin decimales
            let valStr = input.value.replace(/[^0-9]/g, '');
            if (valStr !== '') {
                let num = parseInt(valStr, 10);
                if (num > 10) num = 10;
                if (num < 1) num = 1;
                input.value = num;
            } else {
                input.value = '';
            }
        }

        const tr = input.closest('tr');
        const btn = tr.querySelector('.btn-guardar-tema');
        if (btn && !btn.className.includes('btn-primary')) {
            btn.className = 'btn btn-sm btn-primary btn-guardar-tema';
            btn.innerHTML = '<i class="fa-solid fa-save"></i> <span class="btn-text">Guardar</span>';
        }
        if (idSolicitud) {
            this.recalcularPromedio(idSolicitud);
        }
    },

    recalcularPromedio(idSolicitud) {
        const tbody = document.getElementById(`temas-tbody-${idSolicitud}`);
        if (!tbody) return;

        const inputs = tbody.querySelectorAll('.tema-calif');
        let suma = 0;
        let contador = 0;

        inputs.forEach(inp => {
            const val = parseFloat(inp.value);
            if (!isNaN(val)) {
                suma += val;
                contador++;
            }
        });

        const promedioStr = contador > 0 ? Math.round(suma / contador).toString() : '';

        const campoCalifCurso = document.getElementById('cap-curso-calificacion');
        const campoCalifExamen = document.getElementById('cap-examen-calificacion');

        if (campoCalifCurso) campoCalifCurso.value = promedioStr;
        if (campoCalifExamen) campoCalifExamen.value = promedioStr;
    },

    validarTodosEvaluados(idSolicitud) {
        // Bloquear si hubo error en la carga de temas
        if (this.errorCarga && this.errorCarga[idSolicitud]) return false;

        const tbody = document.getElementById(`temas-tbody-${idSolicitud}`);
        
        // Si no hay tbody, pero la caché indica que debería haber temas, es una inconsistencia
        if (!tbody) {
            if (this.temasCache && this.temasCache[idSolicitud] && this.temasCache[idSolicitud].length > 0) return false;
            return true; 
        }

        // Bloquear si hay algún botón en estado primario (lo que significa que hay temas sin guardar o modificados)
        const unsavedButtons = tbody.querySelectorAll('.btn-primary.btn-guardar-tema');
        return unsavedButtons.length === 0;
    }
};
