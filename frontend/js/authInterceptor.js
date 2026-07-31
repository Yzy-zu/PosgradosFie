// authInterceptor.js
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    let [resource, config] = args;

    // 1. Obtener el token (asegúrate de que el nombre coincida con tu login)
    const token = sessionStorage.getItem('token');

    config = config || {};
    config.headers = config.headers || {};

    // 2. Inyectar el token en las cabeceras si existe
    if (token) {
        if (config.headers instanceof Headers) {
            config.headers.append('Authorization', `Bearer ${token}`);
        } else {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await originalFetch.call(window, resource, config);

        if (response.status === 401 || response.status === 403) {
            const url = typeof resource === 'string' ? resource : resource?.url || '';

            if (!url.includes('/api/auth/login')) {
                // Bug 3 Fix: usar SweetAlert2 si está disponible, sin alert() nativo
                const mensaje = 'Tu sesión ha expirado o no tienes permisos. Serás redirigido al inicio de sesión.';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Sesión Expirada',
                        text: mensaje,
                        icon: 'warning',
                        confirmButtonColor: '#8a1c24',
                        confirmButtonText: 'Entendido',
                        allowOutsideClick: false
                    }).then(() => {
                        sessionStorage.clear();
                        window.location.href = 'login.html';
                    });
                } else {
                    console.warn('[Auth] Sesión expirada. Redirigiendo a login...');
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                }
                return Promise.reject(new Error("Sesión expirada"));
            }
        }

        return response;
    } catch (error) {
        throw error;
    }
};