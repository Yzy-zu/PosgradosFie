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

function toggleSidebarMobile() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-mobile-overlay');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('mobile-open');
    if (overlay) {
        overlay.classList.toggle('active', isOpen);
    }
}

function cerrarSidebarMobile() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-mobile-overlay');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }
}

// Inicializar estado de interfaz y eventos globales al cargar el DOM
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

    // F-B21 FIX: sincronizar el select de tema al abrir la página
    // (antes solo se sincronizaba si el elemento ya existía — race condition en SPAs)
    const selectTema = document.getElementById('setting-tema');
    if (selectTema) selectTema.value = temaSeleccionado;

    // F-B07 FIX: restaurar y vincular el select de densidad de interfaz
    const densidad = localStorage.getItem('densidadInterfaz') || 'Cómoda';
    const selectDensidad = document.getElementById('setting-densidad');
    if (selectDensidad) {
        selectDensidad.value = densidad;
        aplicarDensidad(densidad);
    }

    // F-B08 FIX: restaurar estado de los toggles de notificaciones
    ['setting-notif-push', 'setting-notif-correo', 'setting-notif-boletin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const stored = localStorage.getItem(id);
            if (stored !== null) el.checked = stored === 'true';
        }
    });

    // Cierra el menú de perfil si se hace clic fuera de él
    window.addEventListener('click', function () {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });

    // Vincular clic del contenedor del perfil si existe
    const profileContainer = document.querySelector('.profile-container');
    if (profileContainer) {
        profileContainer.addEventListener('click', toggleProfileMenu);
    }

    // Funcionalidad para submenús en táctil
    document.querySelectorAll('.sidebar .has-submenu').forEach(submenu => {
        submenu.addEventListener('click', function(e) {
            // Solo prevenir default si hicimos clic en el enlace principal
            if (e.target.closest('a') && e.target.closest('a').nextElementSibling && e.target.closest('a').nextElementSibling.classList.contains('sub-menu')) {
                e.preventDefault();
                this.classList.toggle('open');
            }
        });
    });
});
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
    const profileContainer = document.querySelector('.profile-container');
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
        title: 'Cambiar contraseña',
        showCloseButton: true,
        customClass: {
            popup: 'fb-style-modal'
        },
        html: `
            <div style="text-align: left; font-size: 14px; margin-top: 14px;">
                <p style="margin-bottom: 20px; color: var(--color-text-muted); font-size: 13px; line-height: 1.4;">
                    Ingresa tu contraseña actual y define una nueva contraseña para mantener tu cuenta segura.
                </p>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display: block; color: var(--color-text);">Contraseña Actual</label>
                    <input id="swal-pass-actual" type="password" placeholder="••••••••" 
                        style="width: 100%; height: 42px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='var(--color-primary, #8a1c24)'" onblur="this.style.borderColor='var(--color-border)'">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display: block; color: var(--color-text);">Nueva Contraseña</label>
                    <input id="swal-pass-nueva" type="password" placeholder="••••••••" 
                        style="width: 100%; height: 42px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='var(--color-primary, #8a1c24)'" onblur="this.style.borderColor='var(--color-border)'">
                </div>
                
                <div style="margin-bottom: 5px;">
                    <label style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display: block; color: var(--color-text);">Confirmar Nueva Contraseña</label>
                    <input id="swal-pass-confirm" type="password" placeholder="••••••••" 
                        style="width: 100%; height: 42px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='var(--color-primary, #8a1c24)'" onblur="this.style.borderColor='var(--color-border)'">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--color-guinda, #8a1c24)',
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
                    confirmButtonColor: 'var(--color-primary, #8a1c24)',
                    background: 'var(--color-card-bg)',
                    color: 'var(--color-text)'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.mensaje || 'Hubo un problema al cambiar la contraseña.',
                    icon: 'error',
                    confirmButtonColor: 'var(--color-danger, #ef4444)',
                    background: 'var(--color-card-bg)',
                    color: 'var(--color-text)'
                });
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            ocultarLoader();
            Swal.fire({
                title: 'Error',
                text: 'Error de conexión con el servidor.',
                icon: 'error',
                confirmButtonColor: 'var(--color-danger, #ef4444)',
                background: 'var(--color-card-bg)',
                color: 'var(--color-text)'
            });
        }
    }
}

function cambiarTema(tema) {
    if (tema === 'Oscuro') {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else if (tema === 'Claro') {
        document.body.classList.remove('dark-mode');
        document.documentElement.removeAttribute('data-bs-theme');
    } else if (tema === 'Sistema') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.removeAttribute('data-bs-theme');
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
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.removeAttribute('data-bs-theme');
        }
    }
});

// ==== PREVENCIÓN DE XSS (SANITIZACIÓN DE HTML) ====
function escaparHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==== VISUALIZACIÓN SEGURA DE ARCHIVOS SIN TOKEN EN URL ====
async function abrirArchivoSeguro(rutaArchivo) {
    if (!rutaArchivo) return;
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
    
    // Quitar cualquier query string previo si existe
    let cleanPath = String(rutaArchivo).split('?')[0];

    // Si la ruta ya es un data URI o blob URI
    if (cleanPath.startsWith('data:') || cleanPath.startsWith('blob:')) {
        window.open(cleanPath, '_blank');
        return;
    }

    // Asegurar prefijo /api/files/
    let fetchUrl = cleanPath;
    if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://') && !fetchUrl.startsWith('/api/files/')) {
        fetchUrl = `/api/files/${cleanPath}`;
    }

    try {
        mostrarLoader();
        const res = await fetch(fetchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error al obtener el archivo');

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');

        setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    } catch (error) {
        console.error("Error al abrir archivo seguro:", error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo abrir el documento.',
                confirmButtonColor: '#ef4444'
            });
        }
    } finally {
        ocultarLoader();
    }
}

// ==== F-B07 FIX: DENSIDAD DE INTERFAZ ====
// Aplica padding CSS real según la preferencia del usuario.
function aplicarDensidad(densidad) {
    const root = document.documentElement;
    if (densidad === 'Compacta') {
        root.style.setProperty('--density-padding', '6px 12px');
        root.style.setProperty('--density-gap', '6px');
        root.style.setProperty('--density-row-height', '36px');
    } else {
        // Cómoda (default)
        root.style.setProperty('--density-padding', '10px 18px');
        root.style.setProperty('--density-gap', '12px');
        root.style.setProperty('--density-row-height', '48px');
    }
    localStorage.setItem('densidadInterfaz', densidad);
}

// ==== F-B08 FIX: PERSISTENCIA DE NOTIFICACIONES ====
// Persiste el estado checked de los toggles en localStorage.
function guardarPreferenciaNotif(id, checked) {
    localStorage.setItem(id, String(checked));
}

// ==== F-B21 FIX: SINCRONIZAR DRAWER AL ABRIRLO ====
// Garantiza que todos los controles del drawer reflejen el estado guardado
// CADA VEZ que se abre, no solo al cargar la página.
function sincronizarDrawerAjustes() {
    // Tema
    const tema = localStorage.getItem('temaSeleccionado') || 'Claro';
    const selTema = document.getElementById('setting-tema');
    if (selTema) selTema.value = tema;

    // Densidad
    const densidad = localStorage.getItem('densidadInterfaz') || 'Cómoda';
    const selDens = document.getElementById('setting-densidad');
    if (selDens) selDens.value = densidad;

    // Idioma
    const idiomaGuardado = localStorage.getItem('idiomaSeleccionado');
    const selIdioma = document.getElementById('setting-idioma');
    if (selIdioma && idiomaGuardado) {
        // Buscar la opción cuyo value coincida con el idioma guardado
        const opt = Array.from(selIdioma.options).find(o =>
            o.value === idiomaGuardado || o.value.startsWith(idiomaGuardado)
        );
        if (opt) selIdioma.value = opt.value;
    }

    // Toggles de notificaciones
    ['setting-notif-push', 'setting-notif-correo', 'setting-notif-boletin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const stored = localStorage.getItem(id);
            if (stored !== null) el.checked = stored === 'true';
        }
    });
}


