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

// ==== SIDEBAR TOGGLE ====
// Bug 5 Fix: implementación canónica con toggle sincronizado
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (mainContent) {
        mainContent.classList.toggle('expanded', isCollapsed);
    }
    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
}

// Inicializar estado de interfaz al cargar (Sidebar y Tema)
document.addEventListener("DOMContentLoaded", () => {
    // Restaurar Sidebar
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        if (sidebar) sidebar.classList.add('collapsed');
        if (mainContent) mainContent.classList.add('expanded');
    }

    // Restaurar Tema
    const temaSeleccionado = localStorage.getItem('temaSeleccionado') || 'Claro';
    cambiarTema(temaSeleccionado);
    
    // Sincronizar el select del UI si existe
    const selectTema = document.getElementById('setting-tema');
    if (selectTema) {
        selectTema.value = temaSeleccionado;
    }
});

// ==== MANEJO DE SESIÓN ====
function cerrarSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: '¿Estás seguro de que deseas salir del sistema?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8a1c24',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fa-solid fa-right-from-bracket"></i> Sí, salir',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
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

// ==== RESTABLECER CONTRASEÑA ====
async function abrirModalCambiarPassword() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.remove('show');

    const usuarioStr = sessionStorage.getItem('usuario');
    const token = sessionStorage.getItem('token');
    
    if (!usuarioStr || !token) {
        Swal.fire('Error', 'Sesión no válida', 'error');
        return;
    }
    
    const usuario = JSON.parse(usuarioStr);

    const { value: formValues } = await Swal.fire({
        title: `<i class="fa-solid fa-key" style="color: #8a1c24;"></i> Cambiar Contraseña`,
        html: `
            <div style="text-align: left; font-size: 14px; color: #334155; margin-top: 10px;">
                <p style="margin-bottom: 15px; color: #475569;">Por favor, ingresa tu contraseña actual y la nueva contraseña que deseas utilizar.</p>
                
                <label style="font-weight: 600; margin-bottom: 5px; display: block; color: #1e293b;">Contraseña Actual:</label>
                <input id="swal-pass-actual" type="password" class="swal2-input" placeholder="••••••••" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box; border-radius: 6px;">
                
                <label style="font-weight: 600; margin-bottom: 5px; display: block; color: #1e293b;">Nueva Contraseña:</label>
                <input id="swal-pass-nueva" type="password" class="swal2-input" placeholder="••••••••" style="margin: 0 0 15px 0; width: 100%; box-sizing: border-box; border-radius: 6px;">
                
                <label style="font-weight: 600; margin-bottom: 5px; display: block; color: #1e293b;">Confirmar Nueva Contraseña:</label>
                <input id="swal-pass-confirm" type="password" class="swal2-input" placeholder="••••••••" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 6px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8a1c24',
        preConfirm: () => {
            const passActual = document.getElementById('swal-pass-actual').value;
            const passNueva = document.getElementById('swal-pass-nueva').value;
            const passConfirm = document.getElementById('swal-pass-confirm').value;

            if (!passActual || !passNueva || !passConfirm) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }
            if (passNueva !== passConfirm) {
                Swal.showValidationMessage('La nueva contraseña y la confirmación no coinciden');
                return false;
            }
            if (passActual === passNueva) {
                Swal.showValidationMessage('La nueva contraseña debe ser diferente a la actual');
                return false;
            }
            
            return { passwordActual: passActual, passwordNueva: passNueva };
        }
    });

    if (formValues) {
        try {
            mostrarLoader();
            const response = await fetch(`/api/usuario/${usuario.id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formValues)
            });

            const data = await response.json();
            ocultarLoader();

            if (response.ok && data.success) {
                Swal.fire({
                    title: '¡Actualizada!',
                    text: data.mensaje || 'Tu contraseña ha sido actualizada correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#8a1c24'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.mensaje || 'Hubo un problema al cambiar la contraseña.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            ocultarLoader();
            Swal.fire({
                title: 'Error',
                text: 'Error de conexión con el servidor.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    }
}

// ==== MANEJO DEL TEMA VISUAL (MODO OSCURO) ====
function cambiarTema(tema) {
    if (tema === 'Oscuro') {
        document.body.classList.add('dark-mode');
    } else if (tema === 'Claro') {
        document.body.classList.remove('dark-mode');
    } else if (tema === 'Sistema') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    localStorage.setItem('temaSeleccionado', tema);
}

// Escuchar cambios a nivel de sistema operativo si está en modo "Sistema"
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const tema = localStorage.getItem('temaSeleccionado') || 'Claro';
    if (tema === 'Sistema') {
        if (e.matches) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
});

