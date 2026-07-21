const URL_TUNEL_ADMIN = " https://open-zoos-kneel.loca.lt";
const formulario = document.getElementById("loginForm");
console.log(formulario);

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value;
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
            alert(datos.mensaje);
            return;
        }

        // Guardar token e información del usuario usando la variable 'datos'
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
                alert("Rol no válido");
        }

    } catch (error) {
        console.error(error);
        alert("No fue posible conectar con el servidor.");
    }
});