const moduloEntrevistaAPI = {
    /**
     * Obtiene los datos de la entrevista programada para una solicitud.
     * @param {number} idSolicitud
     */
    async obtenerDatos(idSolicitud) {
        try {
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`/api/entrevista/solicitud/${idSolicitud}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const ct = res.headers.get('content-type');
            if (ct && ct.includes('application/json')) {
                return await res.json();
            }
            return null;
        } catch (e) {
            console.error('moduloEntrevistaAPI.obtenerDatos error:', e);
            return null;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduloEntrevistaAPI;
}
