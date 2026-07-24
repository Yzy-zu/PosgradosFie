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
            const data = await docente.json()
            return data
        } catch (error) {
            console.log(error)
        }

    }
    // Configurar el saludo de usuario personalizado
    const token = sessionStorage.getItem('usuario');
    const usuario = JSON.parse(token);
    const saludo = document.getElementById('saludo-usuario');
    const datitos = await cargarDocente(usuario.id);
    console.log(datitos);
    if (saludo) {
        saludo.innerText = `Hola Bienvenid@, ${datitos.nombre}`;
        const lblNombre = document.getElementById('menu-nombre-docente');
        const lblCorreo = document.getElementById('menu-correo-docente');
        if (lblNombre) lblNombre.innerText = `${datitos.nombre}`;
        if (lblCorreo) lblCorreo.innerText = `${usuario.correo}`;

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
                        note: d.comentarios || ""
                    }));
                }

                return {
                    id: asp.id,
                    nombre: `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim() || "Sin nombre",
                    programa: sol ? sol.convocatoriaNombre : "Sin Solicitud",
                    correo: asp.correo || "Sin correo",
                    fechaRegistro: sol ? new Date(sol.creadoEn).toISOString().split('T')[0] : (asp.fechaNacimiento ? asp.fechaNacimiento.split('T')[0] : "N/A"),
                    mecanismo: sol ? sol.tipoAdmision.replace(/_/g, ' ') : "N/A",
                    nivel: sol && sol.posgrado_id == 2 ? "Doctorado" : (sol && sol.posgrado_id == 1 ? "Maestría" : "Por asignar"),
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
            badgeHtml = `<span class="badge badge-rechazado">Rechazado / Inc.</span>`;
        } else if (tienePendientes) {
            badgeHtml = `<span class="badge badge-pendiente">Pendiente (${asp.documentos.filter(d => d.estado === 'pendiente').length})</span>`;
        } else {
            badgeHtml = `<span class="badge badge-aprobado">Exp. Completo</span>`;
        }

        const item = document.createElement('div');
        item.className = `aspirante-item ${idAspiranteActivo === asp.id ? 'active' : ''}`;
        item.onclick = () => seleccionarAspirante(asp.id);

        item.innerHTML = `
            <h4>${asp.nombre}</h4>
            <p><strong>Nivel:</strong> ${asp.nivel}</p>
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
        badgeEstado.innerText = "Rechazado / Incompleto";
    } else if (tienePendientes) {
        badgeEstado.classList.add('badge-pendiente');
        badgeEstado.innerText = "Pendiente de Revisión";
    } else {
        badgeEstado.classList.add('badge-aprobado');
        badgeEstado.innerText = "Expediente Completo";
    }

    // Ocultar previsualización de documentos previos
    // cerrarVistaPrevia(); (No lo necesitamos ejecutar aquí porque ahora es modal y ya debería estar cerrado)

    // Rellenar tabla de documentos
    const tbody = document.getElementById('tabla-documentos-cuerpo');
    tbody.innerHTML = "";

    asp.documentos.forEach(doc => {
        const tr = document.createElement('tr');

        // Estatus visual del documento
        let statusBadge = "";
        if (doc.estado === 'aprobado') {
            statusBadge = `<span class="badge badge-aprobado">✓ Aprobado</span>`;
        } else if (doc.estado === 'rechazado') {
            statusBadge = `<span class="badge badge-rechazado">✗ Rechazado</span>`;
        } else {
            statusBadge = `<span class="badge badge-pendiente">? Pendiente</span>`;
        }

        // Fila de notas si existe rechazo
        let noteHtml = "";
        if (doc.estado === 'rechazado' && doc.note) {
            noteHtml = `<div class="rejection-note-text"><strong>Motivo del rechazo:</strong> ${doc.note}</div>`;
        }

        tr.innerHTML = `
            <td>
                <span style="font-weight: bold; color: #1a1f2c;">${doc.nombre}</span>
                ${noteHtml}
            </td>
            <td>${statusBadge}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn-view-doc" onclick="verDocumento('${doc.id}')">👁️ Ver</button>
                <button class="btn-stat btn-accept" title="Aprobar Documento" onclick="aprobarDocumento('${doc.id}')">✓</button>
                <button class="btn-stat btn-reject" title="Rechazar Documento" onclick="rechazarDocumentoPrompt('${doc.id}')">✗</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Despliega el bloque simulado de lectura del documento en el pie del detalle
 */
function verDocumento(docId) {
    const asp = aspirantes.find(a => a.id === idAspiranteActivo);
    if (!asp) return;

    const doc = asp.documentos.find(d => d.id == docId);
    if (!doc) return;

    const previewBox = document.getElementById('modal-visor-documento');
    const previewNombre = document.getElementById('preview-nombre-doc');
    const previewTexto = document.getElementById('preview-contenido-texto');

    previewNombre.innerText = doc.nombre;

    // Generar visor dependiendo si es imagen o PDF
    const extension = doc.url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        previewTexto.innerHTML = `<img src="${doc.url}" alt="${doc.nombre}" style="max-width: 100%; max-height: 100%; display: block; margin: 0 auto; object-fit: contain;">`;
    } else {
        previewTexto.innerHTML = `<iframe src="${doc.url}" width="100%" height="100%" style="border: none; flex: 1;"></iframe>`;
    }

    previewBox.style.display = 'flex';
}

/**
 * Oculta el visor del documento
 */
function cerrarVistaPrevia() {
    const previewBox = document.getElementById('modal-visor-documento');
    if (previewBox) {
        previewBox.style.display = 'none';
        // Limpiar el contenido para que deje de cargar el iframe
        document.getElementById('preview-contenido-texto').innerHTML = '';
    }
}

/**
 * Aprueba el documento indicado del aspirante activo, guardando los cambios
 */
async function aprobarDocumento(docId) {
    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == docId);
    if (docIndex === -1) return;

    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await fetch(`/api/documentos/evaluar/${docId}`, {
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
            seleccionarAspirante(idAspiranteActivo);
        } else {
            const err = await res.json();
            alert("No se pudo aprobar el documento: " + (err.mensaje || "Error"));
        }
    } catch (e) {
        console.error("Error al aprobar documento:", e);
        alert("Ocurrió un error al comunicarse con el servidor.");
    }
}

/**
 * Abre el cuadro modal de captura para definir el por qué del rechazo
 */
function rechazarDocumentoPrompt(docId) {
    const asp = aspirantes.find(a => a.id === idAspiranteActivo);
    if (!asp) return;

    const doc = asp.documentos.find(d => d.id == docId);
    if (!doc) return;

    documentoARechazar = docId;

    // Mostrar el modal overlay
    const modal = document.getElementById('modal-rechazo');
    modal.style.display = 'flex';

    // Rellenar metadatos en el modal
    document.getElementById('modal-titulo-documento').innerText = `Rechazar: ${doc.nombre}`;
    document.getElementById('modal-nota-texto').value = doc.note || "";
    document.getElementById('modal-nota-texto').focus();
}

/**
 * Cierra el modal de captura sin guardar modificaciones
 */
function cerrarModalRechazo() {
    document.getElementById('modal-rechazo').style.display = 'none';
    documentoARechazar = null;
}

/**
 * Confirma el cambio del estatus a rechazado guardando la nota explicativa
 */
async function guardarRechazoDocumento() {
    const noteText = document.getElementById('modal-nota-texto').value.trim();

    if (noteText === "") {
        alert("Por favor, ingresa el motivo del rechazo del archivo. Es obligatorio informarle al aspirante el por qué.");
        return;
    }

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id == documentoARechazar);
    if (docIndex === -1) return;

    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await fetch(`/api/documentos/evaluar/${documentoARechazar}`, {
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

            cerrarModalRechazo();
            actualizarEstadisticas();
            seleccionarAspirante(idAspiranteActivo);
        } else {
            const err = await res.json();
            alert("No se pudo rechazar el documento: " + (err.mensaje || "Error"));
        }
    } catch (e) {
        console.error("Error al rechazar documento:", e);
        alert("Ocurrió un error al comunicarse con el servidor.");
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
                    <div class="notification-item-modern ${itemClass}" style="cursor: pointer;">
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
