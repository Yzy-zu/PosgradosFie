// Variables de Estado Global de la Interfaz
let aspirantes = [];
let idAspiranteActivo = null;
let documentoARechazar = null;

// Conexión Socket.io
const socket = io();
socket.on('actualizacionGlobal', () => {
    // Recargar vista actual si hay un cambio (ej. aspirante sube nuevo documento)
    if (typeof cargarExpedientesAspirantes === 'function') {
        cargarExpedientesAspirantes();
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
    const saludo = document.getElementById('saludo-usuario');

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

    await cargarAspirantesAPI();
    cargarNotificaciones();

    // Restaurar vista desde la URL (Persistencia)
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash) {
        switchView(currentHash);
    } else {
        switchView('inicio');
    }
});

async function cargarAspirantesAPI() {
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
                    ? (exp.solicitudes.find(s => ['EN_REVISION', 'PENDIENTE', 'RECHAZADO', 'INCOMPLETO', 'APROBADO'].includes(s.estado)) || exp.solicitudes[0])
                    : null;

                let docList = [];
                if (sol && sol.documentos) {
                    docList = sol.documentos.map(d => ({
                        id: d.idDocumento,
                        nombre: d.requisitoNombre,
                        url: `/uploads/${d.rutaArchivo}`,
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
                    mecanismo: sol ? sol.tipoAdmision.replace(/_/g, ' ') : "N/A",
                    nivel: sol && sol.posgrado_id == 2 ? (typeof t === 'function' ? t('sb_doctorado') : "Doctorado") : (sol && sol.posgrado_id == 1 ? (typeof t === 'function' ? t('sb_maestria') : "Maestría") : (typeof t === 'function' ? t('docente_por_asignar') : "Por asignar")),
                    documentos: docList
                };
            });

            actualizarEstadisticas();
            filtrarYMostrarAspirantes();
        } else {
            console.error("Error al obtener aspirantes de la API");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
}

/**
 * Control de Navegación Lateral (Cambio de Secciones)
 */
function switchView(viewId) {
    mostrarLoader();

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

    // Actualizar estado activo en la barra lateral
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${viewId}`);
    if (activeLink) activeLink.classList.add('active');

    setTimeout(() => {
        ocultarLoader();
    }, 300);
}

/**
 * Cierre de Sesión Limpiando Variables No Persistentes de Login
 */


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

function ocultarPanelNotificaciones() {
    const p = document.getElementById('panel-notificaciones');
    if (p) p.style.display = 'none';
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
            alert((typeof t === 'function' ? t('docente_err_aprobar') : "No se pudo aprobar el documento: ") + (err.mensaje || "Error"));
        }
    } catch (e) {
        console.error("Error al aprobar documento:", e);
        alert(typeof t === 'function' ? t('docente_err_servidor') : "Ocurrió un error al comunicarse con el servidor.");
    }
}

async function rechazarDocumentoModal() {
    if (!documentoAEvaluar) return;
    const noteText = document.getElementById('eval-modal-nota').value.trim();

    if (noteText === "") {
        alert(typeof t === 'function' ? t('docente_err_motivo') : "Por favor, ingresa el motivo detallado del rechazo.");
        return;
    }

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == documentoAEvaluar);
    if (docIndex === -1) return;

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
            alert((typeof t === 'function' ? t('docente_err_rechazar') : "No se pudo rechazar el documento: ") + (err.mensaje || "Error"));
        }
    } catch (e) {
        console.error("Error al rechazar documento:", e);
        alert(typeof t === 'function' ? t('docente_err_servidor') : "Ocurrió un error al comunicarse con el servidor.");
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

// ==== PERFIL DOCENTE ====
function abrirModalPerfilDocente() {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr || !window.docenteData) return;
    const usuario = JSON.parse(usuarioStr);
    const d = window.docenteData;
    const iniciales = (d.nombre.charAt(0) + (d.primerApellido ? d.primerApellido.charAt(0) : '')).toUpperCase();

    const noReg = typeof t === 'function' ? t('prof_no_reg') : 'No registrado';

    Swal.fire({
        title: typeof t === 'function' ? t('docente_perfil') : 'Mi Perfil',
        html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.5; color: var(--color-text); padding-right: 15px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border);">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; flex-shrink: 0;">
                        ${iniciales}
                    </div>
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start;">
                        <h4 style="margin: 0; color: var(--color-text); font-size: 18px; text-transform: capitalize; line-height: 1.2;">${d.nombre} ${d.primerApellido || ''} ${d.segundoApellido || ''}</h4>
                        <span style="background: #fce7f3; color: #be185d; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-top: 6px; letter-spacing: 0.5px;">${typeof t === 'function' ? t('docente_revisor') : 'Docente / Revisor'}</span>
                    </div>
                </div>

                <h5 class="profile-section-title"><i class="fa-solid fa-address-card"></i> ${typeof t === 'function' ? t('docente_info_contacto') : 'Datos de Contacto'}</h5>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px 15px; margin-bottom: 25px;">
                    <div class="profile-info-box"><span class="profile-info-label">${typeof t === 'function' ? t('prof_correo') : 'Correo'}</span> <span class="profile-info-value" style="text-transform: none;">${usuario.correo}</span></div>
                </div>
                
                <h5 class="profile-section-title"><i class="fa-solid fa-graduation-cap"></i> ${typeof t === 'function' ? t('docente_info_academica') : 'Información Académica'}</h5>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px 15px; margin-bottom: 25px;">
                    <div class="profile-info-box"><span class="profile-info-label">${typeof t === 'function' ? t('docente_cargo') : 'Cargo'}</span> <span class="profile-info-value" style="text-transform: capitalize;">${d.cargo || noReg}</span></div>
                    <div class="profile-info-box"><span class="profile-info-label">${typeof t === 'function' ? t('docente_especialidad') : 'Especialidad'}</span> <span class="profile-info-value" style="text-transform: capitalize;">${d.especialidad || noReg}</span></div>
                    <div class="profile-info-box"><span class="profile-info-label">${typeof t === 'function' ? t('docente_cubiculo') : 'Cubículo'}</span> <span class="profile-info-value">${d.cubiculo || noReg}</span></div>
                </div>
            </div>
        `,
        showConfirmButton: true,
        confirmButtonText: typeof t === 'function' ? t('docente_modal_cerrar') : 'Cerrar',
        buttonsStyling: false,
        width: '900px',
        customClass: {
            popup: 'profile-modal-bg',
            confirmButton: 'profile-btn-close'
        }
    });
}

