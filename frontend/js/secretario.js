// F-08 FIX: 4 bloques DOMContentLoaded consolidados en uno solo.
// También se corrigen: cargarPerfilUsuario (clave sesión correcta) y cargarDatosInicio (URLs relativas reales).

document.addEventListener('DOMContentLoaded', function () {

    // ── 1. Cargar perfil del usuario ────────────────────────────
    cargarPerfilUsuario();

    // ── 2. Cargar tabla de aspirantes ───────────────────────────
    cargarAspirantes();

    // ── 3. Cargar métricas del dashboard ────────────────────────
    cargarDatosInicio();

    // ── 4. Dropdown del perfil ──────────────────────────────────
    const btnPerfil = document.getElementById('btn-perfil');
    const dropdown  = document.getElementById('profile-dropdown');

    if (btnPerfil && dropdown) {
        btnPerfil.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            // Abre el modal de perfil directamente
            abrirModalPerfil();
        });

        window.addEventListener('click', function () {
            dropdown.style.display = 'none';
        });
    }

    // ── 5. Botón cerrar sesión (dropdown en header) ──────────────
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function () {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // ── 6. Botón cerrar sesión (sidebar) ────────────────────────
    const iconSalir = document.querySelector('.fa-right-from-bracket');
    const btnSidebarLogout = iconSalir
        ? iconSalir.closest('[onclick*="cerrarSesion"], .sidebar-logout, button')
        : null;
    if (btnSidebarLogout && !btnSidebarLogout.dataset.logoutBound) {
        btnSidebarLogout.addEventListener('click', function () {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'login.html';
        });
        btnSidebarLogout.dataset.logoutBound = 'true';
    }

    // ── 7. Modal de perfil: cerrar con X y con clic fuera ───────
    const modalPerfil    = document.getElementById('modal-perfil-secretario');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-perfil');

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModalPerfil);
    }

    if (modalPerfil) {
        window.addEventListener('click', function (event) {
            if (event.target === modalPerfil) {
                cerrarModalPerfil();
            }
        });
    }
});

// ────────────────────────────────────────────────────────────────
// PERFIL DE USUARIO
// F-B05 FIX: leer 'usuario' (clave real del sistema) en lugar de
// 'usuarioLogueado' (clave que nunca se escribe al hacer login).
// ────────────────────────────────────────────────────────────────
function cargarPerfilUsuario() {
    let nombreCompleto = 'Secretario Académico';

    try {
        const usuarioStr = sessionStorage.getItem('usuario');
        if (usuarioStr) {
            const datos = JSON.parse(usuarioStr);
            const nombre    = datos.nombre    || datos.usu_nombre    || '';
            const apellido  = datos.primerApellido  || datos.primer_apellido  || '';
            const apellido2 = datos.segundoApellido || datos.segundo_apellido || '';
            const full = `${nombre} ${apellido} ${apellido2}`.trim();
            if (full) nombreCompleto = full;
        }
    } catch (e) {
        console.warn('Error al parsear usuario de sesión:', e);
    }

    const elNombreSaludo = document.getElementById('nombre-usuario-saludo');
    const elNombreMenu   = document.getElementById('menu-nombre-secretario');
    const elNombreHeader = document.getElementById('header-nombre-usuario');

    if (elNombreSaludo) elNombreSaludo.innerText = nombreCompleto;
    if (elNombreMenu)   elNombreMenu.innerText   = nombreCompleto;
    if (elNombreHeader) elNombreHeader.innerText  = nombreCompleto;

    // Actualizar iniciales en el topbar
    const iniciales = obtenerIniciales(nombreCompleto);
    const topbarIniciales = document.getElementById('topbar-iniciales');
    if (topbarIniciales) topbarIniciales.innerText = iniciales;
}

// ────────────────────────────────────────────────────────────────
// MODAL DE PERFIL DEL SECRETARIO
// ────────────────────────────────────────────────────────────────
function obtenerIniciales(nombreCompleto) {
    if (!nombreCompleto) return 'SA';
    const palabras = nombreCompleto.trim().split(/\s+/);
    let iniciales = palabras[0].charAt(0);
    if (palabras.length > 1) {
        iniciales += palabras[palabras.length - 1].charAt(0);
    }
    return iniciales.toUpperCase();
}

function llenarDatosTarjetaModal() {
    const usuarioStored = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
    if (!usuarioStored) return;

    let datos = null;
    try {
        datos = JSON.parse(usuarioStored);
    } catch (e) {
        console.error('Error al parsear el usuario', e);
        return;
    }
    if (!datos) return;

    const nombre          = datos.nombre          || datos.usu_nombre          || datos.nombre_completo || '';
    const primerApellido  = datos.primerApellido  || datos.primer_apellido     || '';
    const segundoApellido = datos.segundoApellido || datos.segundo_apellido    || '';
    let nombreCompleto = `${nombre} ${primerApellido} ${segundoApellido}`.trim();
    if (!nombreCompleto) nombreCompleto = 'Secretario Académico';

    const correo    = datos.correo    || datos.usu_correo || 'Sin correo registrado';
    // F-B02 FIX: etiquetas de labels corregidas en el HTML; aquí accedemos al campo real con fallbacks
    const area      = datos.area      || datos.secre_area      || datos.SECRE_AREA      || 'Sin área asignada';
    const extension = datos.extension || datos.secre_extension || datos.SECRE_EXTENSION || 'Sin extensión';

    const modalNombre    = document.getElementById('modal-nombre-secretario');
    const modalCorreo    = document.getElementById('modal-correo-secretario');
    const modalArea      = document.getElementById('modal-area-secretario');
    const modalExtension = document.getElementById('modal-extension-secretario');

    if (modalNombre)    modalNombre.innerText    = nombreCompleto;
    if (modalCorreo)    modalCorreo.innerText    = correo;
    if (modalArea)      modalArea.innerText      = area;
    if (modalExtension) modalExtension.innerText = extension;

    const iniciales   = obtenerIniciales(nombreCompleto);
    const avatarModal = document.getElementById('modal-avatar-iniciales');
    if (avatarModal) {
        avatarModal.innerText = iniciales;
        const coloresBG   = ['#1e293b', '#2980b9', '#16a085', '#d35400', '#273c75'];
        const indiceColor = iniciales.charCodeAt(0) % coloresBG.length;
        avatarModal.style.backgroundColor = coloresBG[indiceColor];
    }
}

function abrirModalPerfil() {
    const modalPerfil = document.getElementById('modal-perfil-secretario');
    if (!modalPerfil) return;
    llenarDatosTarjetaModal();

    modalPerfil.style.display = 'flex';
    modalPerfil.style.opacity = '0';
    setTimeout(() => {
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
    setTimeout(() => {
        modalPerfil.style.display = 'none';
    }, 300);
}

// ────────────────────────────────────────────────────────────────
// MAPA DE TÍTULOS / ENRUTADOR
// ────────────────────────────────────────────────────────────────
const configTitulos = {
    'inicio':     { texto: 'Secretario Académico',    icono: 'fa-solid fa-house' },
    'aspirantes': { texto: 'Aspirantes Registrados',  icono: 'fa-solid fa-users' },
    'documentos': { texto: 'Auditoría de Documentos', icono: 'fa-solid fa-folder-open' }
};

function switchView(viewId) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.style.display = 'none');

    const target = document.getElementById(`view-${viewId}`);
    if (target) target.style.display = 'block';

    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeNav) activeNav.classList.add('active');

    const headerTitleContainer = document.getElementById('page-header-title');
    if (headerTitleContainer) {
        const config = configTitulos[viewId] || configTitulos['inicio'];
        let textoFinal = config.texto;
        if (viewId === 'inicio') {
            try {
                const u = JSON.parse(sessionStorage.getItem('usuario') || '{}');
                const n = u.nombre || u.usu_nombre || '';
                const a = u.primerApellido || u.primer_apellido || '';
                const full = `${n} ${a}`.trim();
                if (full) textoFinal = full;
            } catch (e) { /* mantener texto por defecto */ }
        }
        headerTitleContainer.innerHTML = `
            <i class="${config.icono}" style="font-size: 1.3rem; color: var(--color-text-muted);"></i>
            ${textoFinal}
        `;
    }
}

// ────────────────────────────────────────────────────────────────
// TABLA DE ASPIRANTES
// ────────────────────────────────────────────────────────────────
async function cargarAspirantes() {
    const tbody = document.getElementById('tablaAspirantesSecretario');
    if (!tbody) return;

    const token = sessionStorage.getItem('token') || '';
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
    };

    try {
        let respuesta = await fetch('/api/aspirante', { headers });

        if (respuesta.ok) {
            const aspirantes = await respuesta.json();

            const statAspirantes = document.getElementById('stat-aspirantes');
            if (statAspirantes) statAspirantes.innerText = aspirantes.length;

            tbody.innerHTML = '';

            if (!aspirantes || aspirantes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 15px;">No hay aspirantes registrados.</td></tr>`;
                return;
            }

            aspirantes.forEach(asp => {
                const tr = document.createElement('tr');
                const nombreCompleto = `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim();
                // F-B12 FIX: columna CURP muestra CURP real; el correo se mantiene como referencia secundaria
                const curp     = asp.curp     || '—';
                const telefono = asp.telefono || 'Sin teléfono';

                tr.innerHTML = `
                    <td><strong>${nombreCompleto || 'Aspirante'}</strong></td>
                    <td>${curp}</td>
                    <td>${telefono}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#dc2626; padding: 15px;">Error al obtener datos (${respuesta.status}). Cierra sesión y vuelve a entrar.</td></tr>`;
        }
    } catch (error) {
        console.error('Error al conectar con la API:', error);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#dc2626; padding: 15px;">Error de conexión con el servidor.</td></tr>`;
    }
}

// ────────────────────────────────────────────────────────────────
// MÉTRICAS DEL DASHBOARD
// F-B01/F-B20 FIX: eliminadas URLs absolutas localhost:4000 y
// endpoints inexistentes (/api/secretario/aspirantes).
// Se usa el endpoint real /api/aspirantes.
// ────────────────────────────────────────────────────────────────
async function cargarDatosInicio() {
    const token = sessionStorage.getItem('token') || '';
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const resAspirantes = await fetch('/api/aspirante', { headers });
        if (resAspirantes.ok) {
            const aspirantes = await resAspirantes.json();
            // Por ahora, los documentos no tienen endpoint propio en secretario.
            // Se pasan vacíos hasta que el backend lo implemente.
            actualizarMetricas(aspirantes, []);
        }
    } catch (error) {
        console.error('Error al actualizar métricas:', error);
    }
}

// ────────────────────────────────────────────────────────────────
// CONTADORES VISUALES
// ────────────────────────────────────────────────────────────────
function actualizarMetricas(aspirantes = [], documentos = []) {
    const totalAspirantes = aspirantes.length;
    const totalDocumentos = documentos.length;
    const pendientes = documentos.filter(d => d.estado === 'pendiente' || d.estado === 'en_revision').length;
    const completos  = documentos.filter(d => d.estado === 'aprobado'  || d.estado === 'completo').length;

    const el = id => document.getElementById(id);
    if (el('stat-aspirantes')) el('stat-aspirantes').textContent = totalAspirantes;
    if (el('stat-documentos')) el('stat-documentos').textContent = totalDocumentos;
    if (el('stat-pendientes')) el('stat-pendientes').textContent = pendientes;
    if (el('stat-completos'))  el('stat-completos').textContent  = completos;
}
