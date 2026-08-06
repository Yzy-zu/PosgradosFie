document.addEventListener("DOMContentLoaded", function() {
    cargarPerfilUsuario();
    cargarAspirantes();

    // Evento desplegable perfil
    const btnPerfil = document.getElementById('btn-perfil');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (btnPerfil && dropdown) {
        btnPerfil.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
        });

        window.addEventListener('click', function() {
            dropdown.style.display = 'none';
        });
    }

    // Evento cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
});


document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Elementos del DOM necesarios
    const btnPerfilDropdown = document.getElementById('btn-perfil'); // El disparador original en el header
    const profileDropdownMenu = document.getElementById('profile-dropdown'); // El menú dropdown original
    const modalPerfil = document.getElementById('modal-perfil-secretario');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-perfil');

    // 2. Función para obtener las iniciales del nombre
    function obtenerIniciales(nombreCompleto) {
        if (!nombreCompleto) return "SA"; // Valor por defecto
        
        const palabras = nombreCompleto.trim().split(/\s+/);
        let iniciales = palabras[0].charAt(0);
        if (palabras.length > 1) {
            iniciales += palabras[palabras.length - 1].charAt(0);
        }
        return iniciales.toUpperCase();
    }

    // 3. Función para LLENAR LOS DATOS de tu tabla de base de datos
    // Supone que los datos ya están en variables globales o localStorage
function llenarDatosTarjetaModal() {
    // 1. Buscar el usuario tanto en localStorage como en sessionStorage
    const usuarioStored = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (!usuarioStored) return;

    let datos = null;
    try {
        datos = JSON.parse(usuarioStored);
    } catch (e) {
        console.error("Error al parsear el usuario", e);
        return;
    }

    if (!datos) return;

    // 2. Obtención del nombre completo
    const nombre = datos.nombre || datos.usu_nombre || datos.nombre_completo || "";
    const primerApellido = datos.primerApellido || datos.primer_apellido || "";
    const segundoApellido = datos.segundoApellido || datos.segundo_apellido || "";

    let nombreCompleto = `${nombre} ${primerApellido} ${segundoApellido}`.trim();
    if (!nombreCompleto) nombreCompleto = "Secretario Académico";

    const correo = datos.correo || datos.usu_correo || "Sin correo registrado";

    // 3. Obtención de Área y Extensión (revisa todas las variaciones de backend/BD)
    const area = datos.area || datos.secre_area || datos.SECRE_AREA || "Sin área asignada";
    const extension = datos.extension || datos.secre_extension || datos.SECRE_EXTENSION || "Sin extensión";

    // 4. Inyección en los elementos del Modal
    const modalNombre = document.getElementById('modal-nombre-secretario');
    const modalCorreo = document.getElementById('modal-correo-secretario');
    const modalArea = document.getElementById('modal-area-secretario');
    const modalExtension = document.getElementById('modal-extension-secretario');

    if (modalNombre) modalNombre.innerText = nombreCompleto;
    if (modalCorreo) modalCorreo.innerText = correo;
    if (modalArea) modalArea.innerText = area;
    if (modalExtension) modalExtension.innerText = extension;

    // 5. Actualizar Avatar con Iniciales
    const iniciales = obtenerIniciales(nombreCompleto);
    const avatarModal = document.getElementById('modal-avatar-iniciales');
    if (avatarModal) {
        avatarModal.innerText = iniciales;
        const coloresBG = ['#1e293b', '#2980b9', '#16a085', '#d35400', '#273c75'];
        const indiceColor = iniciales.charCodeAt(0) % coloresBG.length;
        avatarModal.style.backgroundColor = coloresBG[indiceColor];
    }
}

    // 4. Lógica para abrir el modal
    function abrirModalPerfil() {
        // Llenar datos antes de mostrar
        llenarDatosTarjetaModal();

        // Mostrar Modal con animación
        modalPerfil.style.display = 'flex';
        modalPerfil.style.opacity = '0';
        setTimeout(() => {
            modalPerfil.style.opacity = '1';
            // Animación sutil de la tarjeta blanca subiendo
            modalPerfil.querySelector('.modal-card-perfil').style.transform = 'translateY(-20px)';
        }, 10);
    }

    // 5. Lógica para cerrar el modal
    function cerrarModalPerfil() {
        // Animación de salida
        modalPerfil.style.opacity = '0';
        modalPerfil.querySelector('.modal-card-perfil').style.transform = 'translateY(0px)';
        
        // Ocultar después de la animación
        setTimeout(() => {
            modalPerfil.style.display = 'none';
        }, 300);
    }

    // 6. EVENT LISTENER para el disparador del perfil en el Header
    if (btnPerfilDropdown) {
        btnPerfilDropdown.addEventListener('click', (event) => {
            // Evitar que el clic en el botón abra el dropdown y el modal a la vez
            event.stopPropagation();
            event.preventDefault();

            // Si haces clic específicamente en la imagen o el nombre del avatar grande, abre el Modal.
            if (event.target.closest('#btn-perfil')) {
                abrirModalPerfil();
            }
            
            // Lógica existente del dropdown
            // if (profileDropdownMenu.style.display === 'none') { ... }
        });
    }

    // 7. EVENT LISTENER para cerrar el modal (X y fuera de la tarjeta)
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModalPerfil);
    }

    window.addEventListener('click', (event) => {
        // Cerrar si haces clic en el fondo semitransparente (fuera de la tarjeta)
        if (event.target === modalPerfil) {
            cerrarModalPerfil();
        }
    });
});

function cargarPerfilUsuario() {
    const usuarioLogueado = sessionStorage.getItem('usuarioLogueado') || "Secretario Académico";
    
    const elNombreSaludo = document.getElementById('nombre-usuario-saludo');
    const elNombreMenu = document.getElementById('menu-nombre-secretario');
    const elNombreHeader = document.getElementById('header-nombre-usuario');

    if (elNombreSaludo) elNombreSaludo.innerText = usuarioLogueado;
    if (elNombreMenu) elNombreMenu.innerText = usuarioLogueado;
    if (elNombreHeader) elNombreHeader.innerText = usuarioLogueado;
}

// --- NUEVO MAPA DE CONFIGURACIÓN DE TÍTULOS E ICONOS ---
// Define el texto y el icono (clase de FontAwesome) para cada apartado.
const configTitulos = {
    'inicio': {
        texto: 'Secretario Académico',
        icono: 'fa-solid fa-house'
    },
    'aspirantes': {
        texto: 'Aspirantes Registrados',
        icono: 'fa-solid fa-users' // El mismo icono que en la barra lateral
    },
    'documentos': {
        texto: 'Auditoría de Documentos',
        icono: 'fa-solid fa-folder-open' // El mismo icono que en la barra lateral
    }
};

function switchView(viewId) {
    // 1. Lógica existente para cambiar de sección visible
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.style.display = 'none');

    const target = document.getElementById(`view-${viewId}`);
    if (target) target.style.display = 'block';

    // 2. Lógica existente para actualizar el estado activo en la barra lateral
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeNav) activeNav.classList.add('active');

    const headerTitleContainer = document.getElementById('page-header-title');
    
    if (headerTitleContainer) {
        // Obtenemos la configuración para la vista actual, o usamos 'inicio' por defecto
        const config = configTitulos[viewId] || configTitulos['inicio'];

        // Si estamos en inicio, intentamos obtener el nombre del usuario logueado
        let textoFinal = config.texto;
        if (viewId === 'inicio') {
            const usuarioLogueado = sessionStorage.getItem('usuarioLogueado');
            if (usuarioLogueado) {
                textoFinal = usuarioLogueado;
            }
        }

        // Construimos e inyectamos el HTML dinámico (Icono + Texto)
        headerTitleContainer.innerHTML = `
            <i class="${config.icono}" style="font-size: 1.3rem; color: var(--color-text-muted);"></i>
            ${textoFinal}
        `;
    }
}

async function cargarAspirantes() {
    const tbody = document.getElementById("tablaAspirantesSecretario");
    if (!tbody) return;

    const token = sessionStorage.getItem("token") || "";
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    try {
        // Intenta primero la ruta en plural (/api/aspirantes) y si da 404 intenta en singular (/api/aspirante)
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
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 15px;">No hay aspirantes registrados.</td></tr>`;
                return;
            }

            aspirantes.forEach(asp => {
                const tr = document.createElement("tr");
                const nombreCompleto = `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim();
                const correo = asp.curp || asp.email || asp.Usuario?.correo || "Sin CURP";
                const telefono = asp.telefono || "Sin teléfono";

                tr.innerHTML = `
                    <td><strong>${nombreCompleto || "Aspirante"}</strong></td>
                    <td>${correo}</td>
                    <td>${telefono}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#dc2626; padding: 15px;">Error al obtener datos (Status ${respuesta.status}). Cierra sesión y vuelve a entrar.</td></tr>`;
        }
    } catch (error) {
        console.error("Error al conectar con la API:", error);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#dc2626; padding: 15px;">Error de conexión con el servidor backend.</td></tr>`;
    }
}

// Función para actualizar los contadores del panel principal
function actualizarMetricas(aspirantes = [], documentos = []) {
    // 1. Total de aspirantes
    const totalAspirantes = aspirantes.length;
    
    // 2. Total de documentos subidos
    const totalDocumentos = documentos.length;

    // 3. Documentos o expedientes pendientes (estado 'pendiente' o 'en_revision')
    const pendientes = documentos.filter(doc => 
        doc.estado === 'pendiente' || doc.estado === 'en_revision'
    ).length;

    // 4. Expedientes completos (estado 'aprobado' o 'completo')
    const completos = documentos.filter(doc => 
        doc.estado === 'aprobado' || doc.estado === 'completo'
    ).length;

    // Inserción de valores en el DOM
    document.getElementById('stat-aspirantes').textContent = totalAspirantes;
    document.getElementById('stat-documentos').textContent = totalDocumentos;
    document.getElementById('stat-pendientes').textContent = pendientes;
    document.getElementById('stat-completos').textContent = completos;
}

// Carga e integración de datos desde la API
async function cargarDatosInicio() {
    try {
        const resAspirantes = await fetch('http://localhost:4000/api/secretario/aspirantes', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const resDocumentos = await fetch('http://localhost:4000/api/secretario/documentos', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (resAspirantes.ok && resDocumentos.ok) {
            const aspirantes = await resAspirantes.json();
            const documentos = await resDocumentos.json();
            
            // Actualizar contadores
            actualizarMetricas(aspirantes, documentos);
        }
    } catch (error) {
        console.error('Error al actualizar métricas:', error);
    }
}

// Ejecutar al cargar la vista
document.addEventListener('DOMContentLoaded', cargarDatosInicio);

document.addEventListener('DOMContentLoaded', () => {
    // Buscar el botón de cerrar sesión en el menú lateral por su icono o clase
    const btnCerrarSesion = document.querySelector('button i.fa-sign-out-alt')?.parentElement || 
                            document.querySelector('.fa-right-from-bracket')?.parentElement;

    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
        });
    }
});