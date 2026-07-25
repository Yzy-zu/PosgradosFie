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
                alert("Tu sesión ha expirado o no tienes permisos.");
                sessionStorage.clear();
                window.location.href = 'login.html';
                return Promise.reject(new Error("Sesión expirada"));
            }
        }

        return response;
    } catch (error) {
        throw error;
    }
};