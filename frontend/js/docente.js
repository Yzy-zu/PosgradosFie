// Variables de Estado Global de la Interfaz
let aspirantes = [];
let idAspiranteActivo = null;
let documentoARechazar = null;

// Inicialización de la Aplicación
document.addEventListener("DOMContentLoaded", async function() {
    console.log("Portal de Docente Inicializado.");

    // Configurar el saludo de usuario personalizado
    const usuarioLogueado = localStorage.getItem('usuarioLogueado') || "Docente Evaluador";
    const saludo = document.getElementById('saludo-usuario');
    if (saludo) {
        saludo.innerText = `Hola Bienvenid@, ${usuarioLogueado}`;
    }

    await cargarAspirantesAPI();
});

async function cargarAspirantesAPI() {
    try {
        const token = localStorage.getItem("token") || "";
        const respuesta = await fetch('/api/aspirante', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (respuesta.ok) {
            const data = await respuesta.json();
            // Mapear los datos de la BD a la estructura que requiere la vista
            aspirantes = data.map(asp => ({
                id: asp.id,
                nombre: `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim() || "Sin nombre",
                programa: "Por asignar",
                correo: asp.correo || "Sin correo",
                fechaRegistro: asp.fechaNacimiento ? asp.fechaNacimiento.split('T')[0] : "N/A",
                mecanismo: "Regular",
                nivel: "Por asignar",
                documentos: [] // Vacío por ahora, se llenará cuando se tenga la API de documentos
            }));
            
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
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.style.display = 'none');

    // Mostrar sección de destino
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Actualizar clase activa en enlaces de navegación
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNavLink = document.getElementById(`nav-${viewId}`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
}

/**
 * Cierre de Sesión Limpiando Variables No Persistentes de Login
 */
function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "login.html";
}

// Función para abrir/cerrar el menú desplegable del perfil
function toggleProfileMenu(event) {
    event.stopPropagation(); // Evita que se cierre inmediatamente al hacer click
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('show');
}

// Cerrar el menú si se hace click fuera de él en la pantalla
window.addEventListener('click', function() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
});

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
    cerrarVistaPrevia();

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

    const doc = asp.documentos.find(d => d.id === docId);
    if (!doc) return;

    const previewBox = document.getElementById('contenedor-preview');
    const previewNombre = document.getElementById('preview-nombre-doc');
    const previewTexto = document.getElementById('preview-contenido-texto');

    previewNombre.innerText = doc.nombre;
    previewTexto.innerText = doc.content;
    
    previewBox.style.display = 'block';
    
    // Hacer scroll automático hacia la visualización de la vista previa
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Oculta el visor del documento
 */
function cerrarVistaPrevia() {
    const previewBox = document.getElementById('contenedor-preview');
    if (previewBox) {
        previewBox.style.display = 'none';
    }
}

/**
 * Aprueba el documento indicado del aspirante activo, guardando los cambios
 */
function aprobarDocumento(docId) {
    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id === docId);
    if (docIndex === -1) return;

    // Actualizar estado en memoria
    aspirantes[aspIndex].documentos[docIndex].estado = 'aprobado';
    aspirantes[aspIndex].documentos[docIndex].note = ''; // Limpiar nota previa si existía

    // Guardar en almacenamiento local
    localStorage.setItem("docenteAspirantes", JSON.stringify(aspirantes));

    // Refrescar vistas
    actualizarEstadisticas();
    seleccionarAspirante(idAspiranteActivo);
}

/**
 * Abre el cuadro modal de captura para definir el por qué del rechazo
 */
function rechazarDocumentoPrompt(docId) {
    const asp = aspirantes.find(a => a.id === idAspiranteActivo);
    if (!asp) return;

    const doc = asp.documentos.find(d => d.id === docId);
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
function guardarRechazoDocumento() {
    const noteText = document.getElementById('modal-nota-texto').value.trim();
    
    if (noteText === "") {
        alert("Por favor, ingresa el motivo del rechazo del archivo. Es obligatorio informarle al aspirante el por qué.");
        return;
    }

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id === documentoARechazar);
    if (docIndex === -1) return;

    // Actualizar estado y nota en memoria
    aspirantes[aspIndex].documentos[docIndex].estado = 'rechazado';
    aspirantes[aspIndex].documentos[docIndex].note = noteText;

    // Guardar en almacenamiento local
    localStorage.setItem("docenteAspirantes", JSON.stringify(aspirantes));

    // Cerrar modal
    cerrarModalRechazo();

    // Refrescar vistas
    actualizarEstadisticas();
    seleccionarAspirante(idAspiranteActivo);
}
