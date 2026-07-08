const URL_TUNEL_ADMIN = " https://open-zoos-kneel.loca.lt";
document.addEventListener("DOMContentLoaded", () => {
    validarSesion();
    mostrarAdministrador();
    configurarBotones();
    cargarUsuarios();
});

function validarSesion() {
    const usuario = localStorage.getItem("usuario");
    const token = localStorage.getItem("token");

    // Si falta el usuario o el token, lo mandamos directo a loguearse
    if (!usuario || !token) {
        alert("Sesión inválida o expirada. Por favor, inicie sesión.");
        localStorage.clear();
        window.location.href = "login.html";
        return;
    }
}

function mostrarAdministrador() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) return;

    const nombre = document.getElementById("nombreAdministrador");
    if (nombre) {
        nombre.textContent = usuario.correo;
    }
}

function configurarBotones() {
    const btnCerrar = document.getElementById("btnCerrarSesion");
    if (btnCerrar) {
        btnCerrar.addEventListener("click", cerrarSesion);
    }
}

function cerrarSesion() {
    if (!confirm("¿Desea cerrar sesión?")) return;
    localStorage.clear(); // Limpia token y usuario de golpe
    window.location.href = "login.html";
}

async function cargarUsuarios() {
    try {
        const respuesta = await fetch("http://localhost:4000/api/usuario");
        if (!respuesta.ok) throw new Error("Error al obtener los usuarios");

        const usuarios = await respuesta.json();
        const tbody = document.getElementById("tablaUsuarios");
        if (!tbody) return;
        tbody.innerHTML = "";

        usuarios.forEach(usuario => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${usuario.id}</td>
                <td>${usuario.correo}</td>
                <td>${usuario.rol || 'Usuario'}</td>
                <td><span class="badge bg-success">Activo</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarUsuario(${usuario.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) {
        console.error("Error en cargarUsuarios:", error);
    }
}

async function editarUsuario(id) {
    try {
        const respuesta = await fetch(`http://localhost:4000/api/usuario/${id}`);
        if (!respuesta.ok) throw new Error("No se pudo obtener la información");

        const usuario = await respuesta.json();

        const inputId = document.getElementById("idUsuarioForm");
        if (inputId) inputId.value = usuario.id;
        
        document.getElementById("correo").value = usuario.correo;
        document.getElementById("rol").value = usuario.rol;
        document.getElementById("password").value = ""; 

        document.querySelector("#modalUsuario .modal-title").textContent = "Editar Usuario";

        const modalElement = document.getElementById("modalUsuario");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

    } catch (error) {
        console.error("Error al preparar la edición:", error);
        alert("No se pudieron cargar los datos del usuario.");
    }
}

document.getElementById("formUsuario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idUsuarioForm");
    const idUsuario = idInput ? idInput.value : "";
    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const rol = document.getElementById("rol").value;

    const datosUsuario = { correo, password, rol };
    const token = localStorage.getItem("token");

    try {
        let url = "http://localhost:4000/api/usuario";
        let metodo = "POST"; 

        if (idUsuario && idUsuario.trim() !== "") {
            url = `http://localhost:4000/api/usuario/${idUsuario}`; 
            metodo = "PUT"; 
        }

        const respuesta = await fetch(url, {
            method: metodo,
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(datosUsuario)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert(resultado.mensaje || "Operación realizada con éxito");
            
            const modalElement = document.getElementById("modalUsuario");
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();

            document.getElementById("formUsuario").reset();
            if (idInput) idInput.value = "";
            document.querySelector("#modalUsuario .modal-title").textContent = "Nuevo Usuario";

            cargarUsuarios();
        } else {
            alert(resultado.mensaje || "Hubo un error al procesar la solicitud.");
        }

    } catch (error) {
        console.error("Error al guardar el usuario:", error);
        alert("Ocurrió un error de conexión con el servidor.");
    }
});

async function eliminarUsuario(id) {
    if (!confirm(`¿Está seguro de eliminar al usuario con ID: ${id}?`)) {
        return; 
    }

    const token = localStorage.getItem("token");

    try {
        const respuesta = await fetch(`http://localhost:4000/api/usuario/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert(resultado.mensaje || "Usuario eliminado con éxito");
            cargarUsuarios();
        } else {
            alert(resultado.mensaje || "No se pudo eliminar el usuario.");
        }

    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        alert("Ocurrió un error al intentar eliminar el usuario.");
    }
}
