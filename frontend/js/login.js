document.addEventListener("DOMContentLoaded", () => {
    // 1. Auto-llenar correo si proviene de URL (ej. tras registro exitoso)
    const urlParams = new URLSearchParams(window.location.search);
    const correoParam = urlParams.get("correo");
    const usuarioInput = document.getElementById("usuario");
    if (correoParam && usuarioInput) {
        usuarioInput.value = correoParam;
        const passwordInput = document.getElementById("password");
        if (passwordInput) passwordInput.focus();
    }

    // 2. Toggle visibilidad de contraseña (ojo)
    const togglePasswordIcon = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    if (togglePasswordIcon && passwordInput) {
        togglePasswordIcon.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePasswordIcon.classList.remove("fa-eye");
                togglePasswordIcon.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                togglePasswordIcon.classList.remove("fa-eye-slash");
                togglePasswordIcon.classList.add("fa-eye");
            }
        });
    }
});

const formulario = document.getElementById("loginForm");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value;

    try {
        const respuesta = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario,
                password
            })
        });

        const datos = await respuesta.json();

        if (!datos.success) {
            Swal.fire({
                icon: 'error',
                title: 'No pudimos iniciar sesión',
                text: datos.mensaje || 'Correo o contraseña incorrectos.',
                confirmButtonColor: '#003366',
                confirmButtonText: 'Intentar de nuevo'
            });
            return;
        }

        // Guardar token e información del usuario
        sessionStorage.setItem("usuario", JSON.stringify(datos.usuario));
        sessionStorage.setItem("token", datos.token);

        switch (datos.usuario.rol) {
            case "ADMIN":
                window.location.replace("admin.html");
                break;

            case "COORDINADOR":
                window.location.replace("coor.html");
                break;

            case "SECRETARIO":
                window.location.replace("secretario.html");
                break;

            case "ASPIRANTE":
                window.location.replace("aspirante.html");
                break;

            case "DOCENTE":
                window.location.replace("docente.html");
                break;

            default:
                Swal.fire({
                    icon: 'warning',
                    title: 'Acceso no autorizado',
                    text: 'Tu cuenta no tiene un rol asignado. Contacta al administrador.',
                    confirmButtonColor: '#003366',
                    confirmButtonText: 'Cerrar'
                });
        }

    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No fue posible conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
            confirmButtonColor: '#003366',
            confirmButtonText: 'Cerrar'
        });
    }
});