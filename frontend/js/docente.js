// Variables de Estado Global de la Interfaz
let aspirantes = [];
let idAspiranteActivo = null;

// Registro de Módulos (Data-Driven Architecture)
const DOCENTE_MODULOS_REGISTRY = {
    'PROGRAMAR_EXAMEN': typeof moduloProgramacionExamen !== 'undefined' ? moduloProgramacionExamen : null,
    'HABILITAR_CAPTURA_RESULTADO': typeof moduloProgramacionExamen !== 'undefined' ? moduloProgramacionExamen : null,
    'CAPTURAR_RESULTADO_EXAMEN': typeof moduloProgramacionExamen !== 'undefined' ? moduloProgramacionExamen : null,
    'PROGRAMAR_CURSO': typeof moduloCurso !== 'undefined' ? moduloCurso : null,
    'CAPTURAR_RESULTADO_CURSO': typeof moduloCurso !== 'undefined' ? moduloCurso : null,
    'CAPTURAR_RESULTADO_PROPEDEUTICO': typeof moduloCurso !== 'undefined' ? moduloCurso : null,
    'VALIDAR_PROMEDIO': typeof moduloPromedio !== 'undefined' ? moduloPromedio : null
};

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
        alert("Ocurrió un error al cargar la acción.");
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
            alert("No se pudo cargar el módulo de programación de examen.");
        }
    } catch (error) {
        console.error("Error al abrir reprogramación:", error);
        alert("Ocurrió un error al abrir el formulario de reprogramación.");
    }
}

// Conexión Socket.io
const socket = io();
socket.on('actualizacionGlobal', () => {
    // Recargar vista actual si hay un cambio (ej. aspirante sube nuevo documento)
    cargarAspirantesAPI();
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
                        url: `/api/files/${d.rutaArchivo}?token=${sessionStorage.getItem('token') || localStorage.getItem('token')}`,
                        estado: d.estadoValidacion.toLowerCase(),
                        note: d.comentarios || "",
                        historial: d.historial || []
                    }));
                }

                return {
                    id: asp.id,
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
        topbarTitle.innerHTML = `<i class="fa-solid fa-folder-open me-2" style="color: var(--color-primary); font-size: 20px;"></i> ${typeof t === 'function' ? t('docente_revision_expedientes') : 'Revisión y Expedientes'}`;
    } else if (viewId === 'aspirantes') {
        topbarTitle.innerHTML = `<i class="fa-solid fa-users me-2" style="color: var(--color-primary); font-size: 20px;"></i> ${typeof t === 'function' ? t('sb_aspirantes') : 'Aspirantes'}`;
    } else if (viewId === 'examenes') {
        topbarTitle.innerHTML = `<i class="fa-solid fa-file-pen me-2" style="color: var(--color-primary); font-size: 20px;"></i> ${typeof t === 'function' ? t('sb_examenes') : 'Exámenes'}`;
    } else if (viewId === 'curso-propedeutico') {
        topbarTitle.innerHTML = `<i class="fa-solid fa-book-open-reader me-2" style="color: var(--color-primary); font-size: 20px;"></i> ${typeof t === 'function' ? t('sb_curso_propedeutico') : 'Curso Propedéutico'}`;
    } else if (viewId === 'promedio') {
        topbarTitle.innerHTML = `<i class="fa-solid fa-calculator me-2" style="color: var(--color-primary); font-size: 20px;"></i> ${typeof t === 'function' ? t('sb_promedio') : 'Promedio'}`;
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
    document.getElementById('stat-total').innerText = totalAspirantes;
    document.getElementById('stat-revisados').innerText = revisadosCompleto;
    document.getElementById('stat-incompletos').innerText = incompletos;
    document.getElementById('stat-pendientes').innerText = pendientes;

    // Actualizar leyenda de gráfica de documentos
    document.getElementById('lbl-aprobados').innerText = docsAprobados;
    document.getElementById('lbl-rechazados').innerText = docsRechazados;
    document.getElementById('lbl-pendientes').innerText = docsPendientes;

    // Calcular porcentajes para la gráfica circular (Pie Chart Conic-Gradient)
    if (totalDocs > 0) {
        let porcAprobado = (docsAprobados / totalDocs) * 100;
        let porcRechazado = (docsRechazados / totalDocs) * 100;

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
    } else {
        const txtPorcentaje = document.getElementById('txt-porcentaje');
        if (txtPorcentaje) txtPorcentaje.innerText = "0%";
    }
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

        if (tieneRechazados) {
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
        if (tieneRechazados) {
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

/**
 * Abre el expediente del aspirante seleccionado en el panel de detalle derecho
 */
function seleccionarAspirante(id) {
    idAspiranteActivo = id;

    // Volver a renderizar la lista para actualizar el resaltado ".active"
    filtrarYMostrarAspirantes();

    const asp = aspirantes.find(a => a.id === id);
    if (!asp) return;

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
    if (tieneRechazados) {
        badgeEstado.classList.add('badge-rechazado');
        badgeEstado.innerText = typeof t === 'function' ? t('docente_estado_incompletos') : "Rechazado / Incompleto";
    } else if (tienePendientes) {
        badgeEstado.classList.add('badge-pendiente');
        badgeEstado.innerText = typeof t === 'function' ? t('docente_estado_pendientes') : "Pendiente de Revisión";
    } else {
        badgeEstado.classList.add('badge-aprobado');
        badgeEstado.innerText = typeof t === 'function' ? t('docente_completos') : "Expediente Completo";
    }

    // Ocultar previsualización de documentos previos
    // cerrarVistaPrevia(); (No lo necesitamos ejecutar aquí porque ahora es modal y ya debería estar cerrado)

    // Rellenar cuadrícula de documentos
    const container = document.getElementById('docs-dinamicos-container');
    let html = '';

    asp.documentos.forEach(doc => {
        let badgeHtml = '';
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

        if (doc.estado === 'aprobado') {
            badgeHtml = `<span class="doc-badge-aprobado"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> ${typeof t === 'function' ? t('doc_aprobado') : 'APROBADO'}</span>`;
        } else if (doc.estado === 'rechazado') {
            badgeHtml = `<span class="doc-badge-rechazado"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> ${typeof t === 'function' ? t('doc_rechazado') : 'RECHAZADO'}</span>`;
        } else {
            badgeHtml = `<span class="doc-badge-pendiente"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> ${typeof t === 'function' ? t('doc_pendiente') : 'PENDIENTE'}</span>`;
        }

        html += `
            <div class="doc-card-v2" onclick="abrirModalEvaluacion('${doc.id}')" style="cursor: pointer;">
                <div class="doc-card-v2-header">
                    <div class="doc-card-v2-icon" style="background: ${iconBg}; color: ${iconColor};">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div>
                        <div class="doc-card-v2-title">${doc.nombre || 'Documento'}</div>
                        <div class="doc-card-v2-date">${doc.estado === 'aprobado' ? (typeof t === 'function' ? t('doc_subido_reciente') : 'Aprobado') : (typeof t === 'function' ? t('docente_btn_evaluar') : 'Evaluar Documento')}</div>
                    </div>
                </div>
                <div class="doc-card-v2-footer">
                    ${badgeHtml}
                    <span class="doc-action-ver">${typeof t === 'function' ? t('doc_ver_doc') : 'Ver Documento'}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Variables globales para la evaluación en modal
let documentoAEvaluar = null;

function abrirModalEvaluacion(docId) {
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

    // Generar visor
    const extension = doc.url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        visor.innerHTML = `<img src="${doc.url}" alt="${doc.nombre}" style="max-width: 100%; max-height: 100%; display: block; object-fit: contain;">`;
    } else {
        visor.innerHTML = `<iframe src="${doc.url}" width="100%" height="100%" style="border: none;"></iframe>`;
    }

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
                    <div style="font-weight: bold; color: var(--color-primary); margin-bottom: 5px; font-size: 12px;">${notif.nombre}</div>
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

function cerrarModalEvaluacion() {
    document.getElementById('modal-evaluacion-doc').style.display = 'none';
    document.getElementById('eval-tab-documento').innerHTML = '';
    documentoAEvaluar = null;
}

function mostrarOpcionesRechazo() {
    document.getElementById('eval-botones-container').style.display = 'none';
    document.getElementById('eval-panel-rechazo').style.display = 'block';
    document.getElementById('eval-modal-nota').focus();
}

function ocultarOpcionesRechazo() {
    document.getElementById('eval-botones-container').style.display = 'flex';
    document.getElementById('eval-panel-rechazo').style.display = 'none';
}

async function aprobarDocumentoModal() {
    if (!documentoAEvaluar) return;

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == documentoAEvaluar);
    if (docIndex === -1) return;

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
        ocultarLoader();
    }
}

async function rechazarDocumentoModal() {
    if (!documentoAEvaluar) return;
    const noteText = document.getElementById('eval-modal-nota').value.trim();

    if (noteText === "") {
        Swal.fire({ icon: 'warning', title: 'Campo requerido', text: typeof t === 'function' ? t('docente_err_motivo') : 'Por favor, ingresa el motivo detallado del rechazo.', confirmButtonColor: '#f59e0b' });
        return;
    }

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == documentoAEvaluar);
    if (docIndex === -1) return;

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
                                <div style="font-weight: bold; font-size: 13px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${grupo.remitente}</div>
                                <div style="font-size: 11px; color: var(--color-text-muted); flex-shrink: 0;">${formattedDate}</div>
                            </div>
                            <div style="font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${ultMsg.nombre}</strong> - ${ultMsg.mensaje}</div>
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
    document.getElementById('settings-drawer').classList.add('open');
    document.getElementById('settings-drawer-overlay').classList.add('show');
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
        showConfirmButton: true,
        confirmButtonText: typeof t === 'function' ? t('docente_modal_cerrar') : 'Cerrar',
        buttonsStyling: false,
        width: '720px',
        customClass: {
            popup: 'pm-popup',
            confirmButton: 'pm-btn-close',
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
    if(!confirm('¿Estás seguro de confirmar que este examen ya se aplicó? Esto habilitará la captura de resultados.')) return;

    try {
        const res = await fetch(`/api/programacion-examen/confirmar/${idSolicitud}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
            }
        });
        const data = await res.json();
        if(data.success) {
            Swal.fire('¡Confirmado!', 'Examen confirmado. Ahora puedes capturar resultados.', 'success');
            cargarTablaExamenesPorCodigo('EXAMEN');
        } else {
            Swal.fire('Error', data.mensaje, 'error');
        }
    } catch(e) {
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
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">No hay aspirantes en proceso de examen que coincidan con los filtros.</div>`;
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
            <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button class="${disableProgramar ? '' : 'btn-primary'}" onclick="abrirWorkflowSolicitud(${item.idAspi})" style="flex: 1; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px 4px; transition: all 0.2s; ${disableProgramar ? 'background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); cursor: not-allowed;' : 'border: none; cursor: pointer;'}" ${disableProgramar}>
                    <i class="fa-solid fa-calendar-plus" style="margin-right: 4px;"></i> ${t('docente_btn_programar')}</button>
                <button class="${disableEditar ? '' : 'btn-secondary'}" onclick="abrirModalReprogramarExamen(${item.idAspi})" style="flex: 1; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px 4px; transition: all 0.2s; ${disableEditar ? 'background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); cursor: not-allowed;' : 'cursor: pointer;'}" ${disableEditar}>
                    <i class="fa-solid fa-pen" style="margin-right: 4px;"></i> ${t('docente_btn_reprogramar')}</button>
                <button class="${disableCapturar ? '' : 'btn-primary'}" onclick="${accionCapturar}" style="flex: 1; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px 4px; transition: all 0.2s; ${disableCapturar ? 'background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); cursor: not-allowed;' : 'border: none; cursor: pointer; background: var(--color-primary); color: white;'}" ${disableCapturar}>
                    <i class="fa-solid fa-graduation-cap" style="margin-right: 4px;"></i> ${t('docente_btn_capturar')}</button>
            </div>
        `;

        item.uiEstadoId = uiEstadoId; // Guardamos para el filtro

        let programBadge = '';
        if (item.posgradoTipo === 'DOCTORADO') {
            programBadge = `<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">D</span>`;
        } else if (item.posgradoTipo === 'MAESTRIA') {
            programBadge = `<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-right: 5px;">M</span>`;
        }

        const formattedDate = fechaObj ? fechaObj.toLocaleDateString() : '--';
        const formattedTime = item.hora ? item.hora.substring(0, 5) : '--';
        const formattedLugar = item.lugar || '--';

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
            
            if (accionValida) {
                return { ...sol, accionActual: accionValida.codigo };
            }
            if (sol.etapaNombre && sol.etapaNombre.toLowerCase().includes('propedéutico')) {
                return { ...sol, accionActual: sol.idProgramacion ? 'CAPTURAR_RESULTADO_CURSO' : 'PROGRAMAR_CURSO' };
            }
            return { ...sol, accionActual: 'FINALIZADO' };
        }).filter(resultado => resultado !== null);

        cursosActivos = nuevosCursos;
        renderCursosCards(cursosActivos);
    } catch (error) {
        console.error("Error al cargar la tabla propedéutico:", error);
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">Error al cargar datos del servidor.</div>`;
    }
}

function renderCursosCards(dataList) {
    const contenedor = document.getElementById('contenedor-curso-cards');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    let contPendientes = 0;
    let contProgramados = 0;
    let contEsperando = 0;
    let contFinalizados = 0;

    if (dataList.length === 0) {
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">No hay aspirantes en proceso de propedéutico que coincidan con los filtros.</div>`;
    }

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
            uiEstadoId = 'esperando';
            contEsperando++;
            borderColor = 'var(--color-primary)';
            estadoLabel = 'Esperando resultado';
            disableEditar = '';
            disableCapturar = '';
        } else {
            uiEstadoId = 'finalizado';
            contFinalizados++;
            borderColor = '#22c55e';
            estadoLabel = t('docente_resultado_registrado');
        }

        const botonHTML = `
            <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button class="${disableProgramar ? '' : 'btn-primary'}" onclick="abrirProgramacionCurso(${item.idSolicitud}, '${(item.aspiranteNombre || '').replace(/'/g, "\\'")}')" style="flex: 1; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px 4px; transition: all 0.2s; ${disableProgramar ? 'background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); cursor: not-allowed;' : 'border: none; cursor: pointer;'}" ${disableProgramar}>
                    <i class="fa-solid fa-calendar-plus" style="margin-right: 4px;"></i> ${t('docente_btn_programar')}</button>
                <button class="${disableEditar ? '' : 'btn-secondary'}" onclick="abrirReprogramacionCurso(${item.idSolicitud}, '${(item.aspiranteNombre || '').replace(/'/g, "\\'")}')" style="flex: 1; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px 4px; transition: all 0.2s; ${disableEditar ? 'background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); cursor: not-allowed;' : 'cursor: pointer;'}" ${disableEditar}>
                    <i class="fa-solid fa-pen" style="margin-right: 4px;"></i> ${t('docente_btn_reprogramar')}</button>
                <button class="${disableCapturar ? '' : 'btn-primary'}" onclick="abrirCapturaCurso(${item.idSolicitud}, '${(item.aspiranteNombre || '').replace(/'/g, "\\'")}')" style="flex: 1; border-radius: 8px; font-size: 12px; font-weight: 600; padding: 8px 4px; transition: all 0.2s; ${disableCapturar ? 'background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); cursor: not-allowed;' : 'border: none; cursor: pointer; background: var(--color-primary); color: white;'}" ${disableCapturar}>
                    <i class="fa-solid fa-graduation-cap" style="margin-right: 4px;"></i> ${t('docente_btn_capturar')}</button>
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
    if (elemProg) elemProg.textContent = contProgramados;
    if (elemEsp) elemEsp.textContent = contEsperando;
    if (elemFin) elemFin.textContent = contFinalizados;
}

function filtrarTablaPropedeuticoUI() {
    const textoInput = document.getElementById('filtro-curso-texto');
    const estadoSelect = document.getElementById('filtro-curso-estado');
    const programaSelect = document.getElementById('filtro-curso-programa');

    const texto = textoInput ? textoInput.value.toLowerCase() : '';
    const estado = estadoSelect ? estadoSelect.value : '';
    const programa = programaSelect ? programaSelect.value : '';

    const filtrados = cursosActivos.filter(item => {
        const matchTexto = item.aspiranteNombre.toLowerCase().includes(texto) || (item.opcionNombre && item.opcionNombre.toLowerCase().includes(texto));
        const matchEstado = estado === '' || item.uiEstadoId === estado;
        const matchPrograma = programa === '' || (item.posgradoTipo && item.posgradoTipo.toLowerCase().includes(programa.toLowerCase()));
        return matchTexto && matchEstado && matchPrograma;
    });

    renderCursosCards(filtrados);
}

function abrirProgramacionCurso(idSolicitud, aspiranteNombre) {
    const modal = document.getElementById('modal-docente-dinamico');
    const body = document.getElementById('modal-dinamico-body');
    if (!modal || !body) return;
    body.innerHTML = '';
    modal.style.display = 'flex';
    
    moduloCurso.ejecutar({
        idSolicitud,
        aspiranteNombre,
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
    
    moduloCurso.ejecutar({
        idSolicitud,
        aspiranteNombre,
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
    
    moduloCurso.ejecutar({
        idSolicitud,
        aspiranteNombre,
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
        contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 25px;">No hay aspirantes registrados por promedio FIE.</div>`;
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
            tbody.innerHTML = "<tr><td colspan='3' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>No hay aspirantes registrados.</td></tr>";
            return;
        }

        for (const aspirante of aspirantes) {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid var(--color-border)";
            // Formatear nombre completo
            const nombreCompleto = `${aspirante.nombre || ''} ${aspirante.primerApellido || ''} ${aspirante.segundoApellido || ''}`.trim();

            async function correoAspirante(idUsuario) {
                if (!idUsuario) return null;
                try {
                    const respuesta1 = await fetch(`/api/usuario/${idUsuario}`);
                    const usuario1 = await respuesta1.json();
                    return usuario1.correo;
                    if (typeof aplicarIdioma === "function") aplicarIdioma();
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
                    if (typeof aplicarIdioma === "function") aplicarIdioma();
        } catch (e) {
                    return null;
                }
                return null;
            }

            const correoReal = (await correoAspirante(aspirante.idUsuario)) || aspirante.correo || 'Sin correo';
            const posgradoNombreReal = await posgradoAspirante(aspirante);

            const posgradoTxt = posgradoNombreReal || 'Sin posgrado seleccionado';
            const badgeClass = posgradoNombreReal ? 'soft-badge-primary' : 'soft-badge-secondary';

            tr.style.cursor = "pointer";
            tr.onclick = () => verExpedienteAspirante(aspirante.id);
            tr.innerHTML = `
                <td style="padding: 12px 15px;">
                    <strong style="color: var(--color-text); font-size: 0.95rem;">${nombreCompleto || 'Sin nombre'}</strong><br>
                    <small style="color: var(--color-text-muted); font-size: 0.82rem;">${correoReal}</small>
                </td>
                <td style="padding: 12px 15px;">
                    <span class="soft-badge ${badgeClass}"><i class="fa-solid fa-graduation-cap me-1"></i> ${posgradoTxt}</span>
                </td>
                <td style="padding: 12px 15px; text-align: center;">
                    <button onclick="event.stopPropagation(); verExpedienteAspirante(${aspirante.id});" title="Ver expediente" style="background: transparent; border: none; color: var(--color-primary); font-size: 1.1rem; cursor: pointer; padding: 6px 10px; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='transparent'">
                        <i class="fa-solid fa-folder-open"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    } catch (error) {
        console.error("Error al cargar aspirantes:", error);
        tbody.innerHTML = "<tr><td colspan='3' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>Esperando API de aspirantes...</td></tr>";
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
                    <i class="fa-solid fa-inbox text-muted fs-1 mb-2"></i>
                    <p class="text-muted">El aspirante aún no ha iniciado ningún proceso de admisión.</p>
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
                            <div class="doc-row-premium" onclick="window.open('/api/files/${doc.rutaArchivo}?token=' + (sessionStorage.getItem('token') || localStorage.getItem('token')), '_blank')">
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
        alert("No se pudo cargar el expediente del aspirante.");
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
window.filtrarTablaAspirantesUI = function() {
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
