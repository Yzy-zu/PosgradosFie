// ==========================================================
// INTERCEPTOR GLOBAL DE FETCH
// ==========================================================

const originalFetch = window.fetch.bind(window);

window.fetch = async (resource, config = {}) => {

    // Buscar el token en ambos almacenamientos
    const token =
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        "";

    /*
     * Usar Headers permite conservar las cabeceras existentes
     * y evita problemas cuando config.headers es un objeto,
     * una instancia de Headers o un arreglo.
     */
    const headers =
        new Headers(config.headers || {});

    // Agregar el token únicamente cuando exista
    if (token && !headers.has("Authorization")) {
        headers.set(
            "Authorization",
            `Bearer ${token}`
        );
    }

    const configuracionFinal = {
        ...config,
        headers
    };

    const url =
        typeof resource === "string"
            ? resource
            : resource?.url || "";

    try {

        const response =
            await originalFetch(
                resource,
                configuracionFinal
            );

        /*
         * 401: token ausente, inválido o expirado.
         * En este caso sí se elimina la sesión.
         */
        if (
            response.status === 401 &&
            !url.includes("/api/auth/login")
        ) {

            const mensaje =
                "Tu sesión ha expirado. Inicia sesión nuevamente.";

            if (typeof Swal !== "undefined") {

                await Swal.fire({
                    title: "Sesión expirada",
                    text: mensaje,
                    icon: "warning",
                    confirmButtonColor: "#8a1c24",
                    confirmButtonText: "Entendido",
                    allowOutsideClick: false
                });
            }

            sessionStorage.clear();
            localStorage.removeItem("token");

            window.location.href =
                "login.html";

            throw new Error(
                "Sesión expirada."
            );
        }

        /*
         * 403: el usuario está autenticado, pero el servidor
         * no le permite realizar esa operación.
         *
         * No se debe cerrar la sesión automáticamente.
         */
        if (
            response.status === 403 &&
            !url.includes("/api/auth/login")
        ) {

            let detalle =
                "Tu usuario no tiene permiso para realizar esta operación.";

            try {

                const copia =
                    response.clone();

                const resultado =
                    await copia.json();

                detalle =
                    resultado.mensaje ||
                    resultado.message ||
                    detalle;

            } catch (error) {

                // La respuesta no contenía JSON.
            }

            if (typeof Swal !== "undefined") {

                Swal.fire({
                    title: "Acceso denegado",
                    text: detalle,
                    icon: "error",
                    confirmButtonColor: "#8a1c24"
                });
            }

            console.error(
                `[Auth] Error 403 en ${url}:`,
                detalle
            );
        }

        return response;

    } catch (error) {

        console.error(
            "[Fetch] Error en la petición:",
            error
        );

        throw error;
    }
};