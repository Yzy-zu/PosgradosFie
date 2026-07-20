// Interceptor global para capturar tokens expirados en cualquier petición fetch
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const [resource, config] = args;
    
    try {
        const response = await originalFetch(resource, config);
        
        // Si el backend responde 401 (Unauthorized) o 403 (Forbidden - Token Expirado)
        if (response.status === 401 || response.status === 403) {
            // No redirigir si la petición original era para hacer login
            if (typeof resource === 'string' && !resource.includes('/api/auth/login')) {
                alert("Tu sesión ha expirado por inactividad. Por favor, vuelve a iniciar sesión.");
                sessionStorage.clear();
                window.location.href = 'login.html';
                
                // Detenemos la ejecución de promesas encadenadas
                return Promise.reject(new Error("Sesión expirada"));
            }
        }
        
        return response;
    } catch (error) {
        // Dejar pasar errores de red normales
        throw error;
    }
};
