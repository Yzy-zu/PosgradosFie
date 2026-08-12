// Exponer funciones inmediatamente al scope global
window.switchView = switchView;
window.cerrarSesion = cerrarSesion;
window.abrirModalPerfil = abrirModalPerfil;
window.cerrarModalPerfil = cerrarModalPerfil;

document.addEventListener("DOMContentLoaded", function() {
    inicializarNavegacion();
    cargarPerfilUsuario();
    cargarAspirantes();
    cargarDatosInicio();
    cargarDocumentos();

    const btnPerfil = document.getElementById('btn-perfil');
    const modalPerfil = document.getElementById('modal-perfil-secretario');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-perfil');

    if (btnPerfil && modalPerfil) {
        btnPerfil.addEventListener('click', function(e) {
            e.stopPropagation();
            abrirModalPerfil();
        });
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModalPerfil);
    }

    window.addEventListener('click', function(event) {
        if (event.target === modalPerfil) {
            cerrarModalPerfil();
        }
    });
});

const configTitulos = {
    'inicio': { texto: 'Secretario Académico', icono: 'fa-solid fa-house' },
    'aspirantes': { texto: 'Aspirantes Registrados', icono: 'fa-solid fa-users' },
    'documentos': { texto: 'Auditoría de Documentos', icono: 'fa-solid fa-folder-open' }
};

function switchView(viewId) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(function(sec) { sec.style.display = 'none'; });

    const target = document.getElementById('view-' + viewId);
    if (target) {
        target.style.display = 'block';
    }

    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(function(link) { link.classList.remove('active'); });

    const activeNav = document.getElementById('nav-' + viewId);
    if (activeNav) activeNav.classList.add('active');

    const headerTitleContainer = document.getElementById('page-header-title');
    if (headerTitleContainer && configTitulos[viewId]) {
        const config = configTitulos[viewId];
        let textoFinal = config.texto;
        if (viewId === 'inicio') {
            const usuarioLogueado = sessionStorage.getItem('usuarioLogueado');
            if (usuarioLogueado) textoFinal = usuarioLogueado;
        }

        headerTitleContainer.innerHTML = '<i class="' + config.icono + '" style="font-size: 1.3rem; color: var(--color-text-muted);"></i> ' + textoFinal;
    }
}

function inicializarNavegacion() {
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash && document.getElementById('view-' + currentHash)) {
        switchView(currentHash);
    } else {
        switchView('inicio');
    }
}

async function cargarAspirantes() {
    const tbody = document.getElementById("tablaAspirantesSecretario");
    if (!tbody) return;

    const token = sessionStorage.getItem("token") || "";
    const headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
    };

    try {
        let respuesta = await fetch('/api/aspirantes', { headers });
        if (respuesta.status === 404) {
            respuesta = await fetch('/api/aspirante', { headers });
        }

        if (respuesta.ok) {
            const aspirantes = await respuesta.json();
            
            const statAspirantes = document.getElementById("stat-aspirantes");
            if (statAspirantes) statAspirantes.innerText = aspirantes.length;

            tbody.innerHTML = "";

            if (!aspirantes || aspirantes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px;">No hay aspirantes registrados.</td></tr>';
                return;
            }

            aspirantes.forEach(function(asp) {
                const tr = document.createElement("tr");
                const nom = asp.nombre || '';
                const ap1 = asp.primerApellido || '';
                const ap2 = asp.segundoApellido || '';
                const nombreCompleto = (nom + ' ' + ap1 + ' ' + ap2).trim();
                const correo = asp.curp || asp.email || (asp.Usuario ? asp.Usuario.correo : '') || "Sin CURP";
                const telefono = asp.telefono || "Sin teléfono";

                tr.innerHTML = '<td><strong>' + (nombreCompleto || "Aspirante") + '</strong></td>' +
                             '<td>' + correo + '</td>' +
                             '<td>' + telefono + '</td>';
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#dc2626; padding: 15px;">Error al obtener datos (Status ' + respuesta.status + ').</td></tr>';
        }
    } catch (error) {
        console.error("Error al conectar con la API:", error);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#dc2626; padding: 15px;">Error de conexión con el servidor backend.</td></tr>';
    }
}

async function cargarDatosInicio() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const resAspirantes = await fetch('/api/aspirantes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const resDocumentos = await fetch('/api/documentos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (resAspirantes.ok && resDocumentos.ok) {
            const aspirantes = await resAspirantes.json();
            const documentos = await resDocumentos.json();
            actualizarMetricas(aspirantes, documentos);
        }
    } catch (error) {
        console.error('Error al actualizar métricas:', error);
    }
}

function actualizarMetricas(aspirantes, documentos) {
    aspirantes = aspirantes || [];
    documentos = documentos || [];
    const totalAspirantes = aspirantes.length;
    const totalDocumentos = documentos.length;
    const pendientes = documentos.filter(function(doc) { return doc.estado === 'pendiente' || doc.estado === 'en_revision'; }).length;
    const completos = documentos.filter(function(doc) { return doc.estado === 'aprobado' || doc.estado === 'completo'; }).length;

    if (document.getElementById('stat-aspirantes')) document.getElementById('stat-aspirantes').textContent = totalAspirantes;
    if (document.getElementById('stat-documentos')) document.getElementById('stat-documentos').textContent = totalDocumentos;
    if (document.getElementById('stat-pendientes')) document.getElementById('stat-pendientes').textContent = pendientes;
    if (document.getElementById('stat-completos')) document.getElementById('stat-completos').textContent = completos;
}

window.cargarDocumentos = cargarDocumentos;

async function cargarDocumentos() {
    const tbody = document.getElementById("tablaDocumentosSecretario") || document.querySelector("#view-documentos tbody");
    if (!tbody) return;

    const token = sessionStorage.getItem("token") || localStorage.getItem("token") || "";
    const headers = { "Authorization": "Bearer " + token };

    try {
        // Petición al endpoint real de tu backend
        let respuesta = await fetch('/api/documentos/explorador', { headers });

        if (respuesta.ok) {
            const data = await respuesta.json();
            // Adapta según la estructura que devuelva getExploradorDocumentos
            const documentos = Array.isArray(data) ? data : (data.documentos || data.data || []);

            tbody.innerHTML = "";

            if (!documentos || documentos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 15px;">No hay documentos registrados.</td></tr>';
                return;
            }

            documentos.forEach(function(doc) {
                const tr = document.createElement("tr");

                const idDoc = doc.id || doc.id_documento || "-";
                const nombreAspirante = doc.Aspirante 
                    ? ((doc.Aspirante.nombre || '') + ' ' + (doc.Aspirante.primerApellido || '')).trim() 
                    : (doc.aspirante || doc.nombre_aspirante || "Aspirante");
                const tipoDoc = doc.tipo || doc.nombre_documento || doc.tipo_documento || "Documento";
                const estadoDoc = doc.estado || doc.estatus || "Pendiente";
                
                const rutaArchivo = doc.ruta_archivo || doc.url || doc.archivo || "";
                const linkArchivo = rutaArchivo 
                    ? '<a href="/' + rutaArchivo + '" target="_blank" style="padding: 5px 10px; background: #2563eb; color: #fff; border-radius: 4px; text-decoration: none; font-size: 0.85rem;">Ver Archivo</a>'
                    : '<span style="color:#94a3b8;">Sin archivo</span>';

                tr.innerHTML = '<td>' + idDoc + '</td>' +
                             '<td><strong>' + nombreAspirante + '</strong></td>' +
                             '<td>' + tipoDoc + '</td>' +
                             '<td><span class="badge ' + estadoDoc.toLowerCase() + '">' + estadoDoc + '</span></td>' +
                             '<td>' + linkArchivo + '</td>';
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#dc2626; padding: 15px;">Error status ' + respuesta.status + ' al cargar documentos.</td></tr>';
        }
    } catch (error) {
        console.error("Error al cargar documentos:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#dc2626; padding: 15px;">Error de conexión con el servidor backend.</td></tr>';
    }
}

function abrirModalPerfil() {
    const modalPerfil = document.getElementById('modal-perfil-secretario');
    if (!modalPerfil) return;
    
    llenarDatosTarjetaModal();
    modalPerfil.style.display = 'flex';
    modalPerfil.style.opacity = '0';
    setTimeout(function() {
        modalPerfil.style.opacity = '1';
        const card = modalPerfil.querySelector('.modal-card-perfil');
        if (card) card.style.transform = 'translateY(-20px)';
    }, 10);
}

function cerrarModalPerfil() {
    const modalPerfil = document.getElementById('modal-perfil-secretario');
    if (!modalPerfil) return;

    modalPerfil.style.opacity = '0';
    const card = modalPerfil.querySelector('.modal-card-perfil');
    if (card) card.style.transform = 'translateY(0px)';
    
    setTimeout(function() {
        modalPerfil.style.display = 'none';
    }, 300);
}

function llenarDatosTarjetaModal() {
    const usuarioStored = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!usuarioStored) return;

    let datos = null;
    try {
        datos = JSON.parse(usuarioStored);
    } catch (e) {
        return;
    }

    if (!datos) return;

    const nombre = datos.nombre || datos.usu_nombre || datos.nombre_completo || "";
    const primerApellido = datos.primerApellido || datos.primer_apellido || "";
    const segundoApellido = datos.segundoApellido || datos.segundo_apellido || "";
    let nombreCompleto = (nombre + ' ' + primerApellido + ' ' + segundoApellido).trim() || "Secretario Académico";

    const correo = datos.correo || datos.usu_correo || "Sin correo registrado";
    const area = datos.area || datos.secre_area || datos.SECRE_AREA || "Sin área asignada";
    const extension = datos.extension || datos.secre_extension || datos.SECRE_EXTENSION || "Sin extensión";

    const modalNombre = document.getElementById('modal-nombre-secretario');
    const modalCorreo = document.getElementById('modal-correo-secretario');
    const modalArea = document.getElementById('modal-area-secretario');
    const modalExtension = document.getElementById('modal-extension-secretario');

    if (modalNombre) modalNombre.innerText = nombreCompleto;
    if (modalCorreo) modalCorreo.innerText = correo;
    if (modalArea) modalArea.innerText = area;
    if (modalExtension) modalExtension.innerText = extension;

    const iniciales = obtenerIniciales(nombreCompleto);
    const avatarModal = document.getElementById('modal-avatar-iniciales');
    if (avatarModal) {
        avatarModal.innerText = iniciales;
        const coloresBG = ['#1e293b', '#2980b9', '#16a085', '#d35400', '#273c75'];
        const indiceColor = iniciales.charCodeAt(0) % coloresBG.length;
        avatarModal.style.backgroundColor = coloresBG[indiceColor];
    }
}

function obtenerIniciales(nombreCompleto) {
    if (!nombreCompleto) return "SA";
    const palabras = nombreCompleto.trim().split(/\s+/);
    let iniciales = palabras[0].charAt(0);
    if (palabras.length > 1) {
        iniciales += palabras[palabras.length - 1].charAt(0);
    }
    return iniciales.toUpperCase();
}

function cargarPerfilUsuario() {
    const usuarioLogueado = sessionStorage.getItem('usuarioLogueado') || "Secretario Académico";
    const elNombreHeader = document.getElementById('header-nombre-usuario');
    if (elNombreHeader) elNombreHeader.innerText = usuarioLogueado;
}

function cerrarSesion() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: "¿Estás seguro de que deseas salir del sistema?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then(function(result) {
            if (result.isConfirmed) {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    } else {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
    }
}