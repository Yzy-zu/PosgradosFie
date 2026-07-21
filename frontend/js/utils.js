// ==== MANEJO DE ESTADO Y UX (GLOBAL LOADER) ====
function mostrarLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'flex'; // Usado por admin y secretario
        loader.classList.add('active'); // Usado por aspirante y docente
    }
}

function ocultarLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none';
        loader.classList.remove('active');
    }
}

// ==== MANEJO DE SESIÓN ====
function cerrarSesion() {
    if (confirm("¿Desea cerrar sesión?")) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// ==== MANEJO DEL PERFIL DESPLEGABLE ====
function toggleProfileMenu(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

// Inicializar eventos globales al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    // Cierra el menú si se hace clic fuera de él
    window.addEventListener('click', function () {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });

    // Vincular clic del contenedor del perfil si existe (para admin.js que lo hacía por JS)
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
        profileContainer.addEventListener('click', toggleProfileMenu);
    }
});
