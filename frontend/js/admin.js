
document.addEventListener("DOMContentLoaded", () => {
    validarSesion();
    mostrarAdministrador();
    configurarBotones();
    configurarNavegacion(); // Configurar eventos de clic
    cargarDashboard();
    cargarUsuarios();
    cargarConvocatorias(); // Inicializar panel de convocatorias
    cargarAspirantes();
    cargarNotificacionesAdmin(); // Inicializar panel de notificaciones

    // Router inicial: si no hay hash, lo ponemos en dashboard
    if (!window.location.hash) {
        window.location.hash = "#dashboard";
    } else {
        activarSeccionPorHash(); // Procesar el hash que ya venía en la URL
    }
});

// Escuchar cambios en la URL (Botón Atrás/Adelante o clics en el menú)
window.addEventListener("hashchange", activarSeccionPorHash);

function validarSesion() {
    const usuario = localStorage.getItem("usuario");
    const token = localStorage.getItem("token");

    if (!usuario || !token) {
        alert("Sesión inválida o expirada. Por favor, inicie sesión.");
        localStorage.clear();
        window.location.href = "login.html";
        return;
    }
}

function mostrarAdministrador() {
    let usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) return; // Si no hay usuario, validarSesion() ya se encargó de redirigir al login

    // Actualizar nombre en el header superior
    const nombreHeader = document.getElementById("nombreAdministrador");
    if (nombreHeader) {
        nombreHeader.textContent = usuario.nombre || usuario.correo.split('@')[0];
    }

    // Actualizar información en el menú desplegable (perfil)
    const menuNombre = document.getElementById("menu-nombre-admin");
    const menuCorreo = document.getElementById("menu-correo-admin");

    if (menuNombre) menuNombre.textContent = usuario.nombre || "Administrador";
    if (menuCorreo) menuCorreo.textContent = usuario.correo || "";
}

function configurarBotones() {
    const btnCerrar = document.getElementById("btnCerrarSesion");
    if (btnCerrar) {
        btnCerrar.addEventListener("click", cerrarSesion);
    }

    // Asegurarnos de limpiar el formulario cuando se abre el modal para "Nuevo Usuario"
    const btnNuevoUsuario = document.querySelector('[data-bs-target="#modalUsuario"]');
    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener("click", () => {
            document.getElementById("formUsuario").reset();
            const idInput = document.getElementById("idUsuarioForm");
            if (idInput) idInput.value = "";
            document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario';
            const btnEliminar = document.getElementById("btnEliminarUsuario");
            if (btnEliminar) btnEliminar.style.display = "none";
        });
    }

    // Lógica para el menú desplegable del perfil (antes estaba en el HTML)
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
        profileContainer.addEventListener('click', function (event) {
            event.stopPropagation();
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) dropdown.classList.toggle('show');
        });
    }

    // Cierra el menú desplegable si se hace clic fuera de él
    window.addEventListener('click', function () {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });
}

function activarSeccionPorHash() {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const enlaces = document.querySelectorAll("#sidebarMenu .nav-link");
    const secciones = document.querySelectorAll(".content-section");
    const tituloSeccion = document.getElementById("seccion-titulo");
    const descSeccion = document.getElementById("seccion-descripcion");

    // Remover estado activo de todos los enlaces en el menú
    enlaces.forEach(link => link.classList.remove("active"));

    // Ocultar todas las secciones del contenido
    secciones.forEach(sec => sec.classList.add("d-none"));

    // Activar el enlace correspondiente
    const enlaceActivo = document.querySelector(`#sidebarMenu .nav-link[data-target="${hash}"]`);
    if (enlaceActivo) {
        enlaceActivo.classList.add("active");

        // Actualizar el título dinámicamente basado en el texto del enlace
        const textoEnlace = enlaceActivo.textContent.trim();
        if (tituloSeccion && descSeccion) {
            if (hash === "dashboard") {
                tituloSeccion.textContent = "Panel de Administración";
                descSeccion.textContent = "Bienvenido al sistema de gestión de Posgrados.";
            } else {
                tituloSeccion.textContent = "Gestión de " + textoEnlace;
                descSeccion.textContent = "Administra la información de " + textoEnlace.toLowerCase() + ".";
            }
        }
    }

    // Mostrar la sección correspondiente en el HTML
    const seccionMostrar = document.getElementById(`seccion-${hash}`);
    if (seccionMostrar) {
        seccionMostrar.classList.remove("d-none");
    }
}

function configurarNavegacion() {
    const enlaces = document.querySelectorAll("#sidebarMenu .nav-link");

    enlaces.forEach(enlace => {
        enlace.addEventListener("click", (e) => {
            e.preventDefault();
            // Al hacer clic, simplemente cambiamos la URL. 
            // Esto dispara el evento 'hashchange' automáticamente.
            const target = e.currentTarget.getAttribute("data-target");
            window.location.hash = `#${target}`;
        });
    });
}

function cerrarSesion() {
    if (!confirm("¿Desea cerrar sesión?")) return;
    localStorage.clear();
    window.location.href = "login.html";
}

function cargarDashboard() {
    // Inicializar contadores en 0 hasta que existan las APIs correspondientes
    const totalUsuarios = document.getElementById("totalUsuarios");
    const totalPosgrados = document.getElementById("totalPosgrados");
    const totalAspirantes = document.getElementById("totalAspirantes");
    const totalSolicitudes = document.getElementById("totalSolicitudes");
    const totalConvocatorias = document.getElementById("totalConvocatorias");
    const totalDocumentos = document.getElementById("totalDocumentos");

    if (totalUsuarios) totalUsuarios.textContent = "0";
    if (totalPosgrados) totalPosgrados.textContent = "0";
    if (totalAspirantes) totalAspirantes.textContent = "0";
    if (totalSolicitudes) totalSolicitudes.textContent = "0";
    if (totalConvocatorias) totalConvocatorias.textContent = "0";
    if (totalDocumentos) totalDocumentos.textContent = "0";
}

async function cargarUsuarios() {
    try {
        const respuesta = await fetch("http://localhost:4000/api/usuario");
        const usuarios = await respuesta.json();

        // Actualizar contador del dashboard
        const totalUsuarios = document.getElementById("totalUsuarios");
        if (totalUsuarios) totalUsuarios.textContent = usuarios.length || 0;

        const tbody = document.getElementById("tablaUsuarios");
        if (!tbody) return;
        tbody.innerHTML = "";

        usuarios.forEach(usuario => {
            const fila = document.createElement("tr");
            
            fila.style.cursor = "pointer";
            fila.onclick = () => editarUsuario(usuario.id);

            fila.innerHTML = `
                <td>${usuario.id}</td>
                <td>${usuario.nombre || 'Sin nombre'}</td>
                <td>${usuario.correo}</td>
                <td>${usuario.rol || 'Usuario'}</td>
                <td><span class="badge bg-success">${usuario.estado || 'Activo'}</span></td>
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
        const usuario = await respuesta.json();

        if (!usuario) throw new Error("Usuario no encontrado");

        const inputId = document.getElementById("idUsuarioForm");
        if (inputId) inputId.value = usuario.id;

        const inputNombre = document.getElementById("nombre");
        if (inputNombre) inputNombre.value = usuario.nombre || "";

        const inputCorreo = document.getElementById("correo");
        if (inputCorreo) inputCorreo.value = usuario.correo || "";

        const inputRol = document.getElementById("rol");
        if (inputRol) inputRol.value = usuario.rol || "ADMIN";

        const inputPassword = document.getElementById("password");
        if (inputPassword) inputPassword.value = "";

        document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Usuario';

        const btnEliminar = document.getElementById("btnEliminarUsuario");
        if (btnEliminar) btnEliminar.style.display = "inline-block";

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
    const nombre = document.getElementById("nombre").value;
    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const rol = document.getElementById("rol").value;

    const datosUsuario = { nombre, correo, password, rol };
    const token = localStorage.getItem("token") || ""; // Por si requiere token más adelante

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

        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Operación realizada con éxito");

            const modalElement = document.getElementById("modalUsuario");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            document.getElementById("formUsuario").reset();
            if (idInput) idInput.value = "";
            document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario';
            const btnElim = document.getElementById("btnEliminarUsuario");
            if (btnElim) btnElim.style.display = "none";

            cargarUsuarios();
        } else {
            alert(resultado.mensaje || "Hubo un error al procesar la solicitud.");
        }

    } catch (error) {
        console.error("Error al guardar el usuario:", error);
        alert("Ocurrió un error en la conexión con el servidor.");
    }
});

async function eliminarUsuario(id) {
    if (!confirm(`¿Está seguro de eliminar al usuario con ID: ${id}?`)) {
        return;
    }

    const token = localStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`http://localhost:4000/api/usuario/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Usuario eliminado con éxito.");
            const modalElement = document.getElementById("modalUsuario");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            cargarUsuarios();
        } else {
            alert(resultado.mensaje || "No se pudo eliminar el usuario.");
        }

    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        alert("Ocurrió un error al intentar eliminar el usuario.");
    }
}

// ==========================================
// MÓDULO CONVOCATORIAS
// ==========================================

async function cargarConvocatorias() {
    const contenedor = document.getElementById("contenedorConvocatorias");
    const totalConvocatorias = document.getElementById("totalConvocatorias");

    if (!contenedor) return;

    try {
        const respuesta = await fetch("http://localhost:4000/api/convocatorias");

        // Si el endpoint no existe o falla, detenemos el renderizado
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const convocatorias = await respuesta.json();

        if (totalConvocatorias) {
            totalConvocatorias.textContent = convocatorias.length || 0;
        }

        contenedor.innerHTML = "";

        if (!convocatorias || convocatorias.length === 0) {
            contenedor.innerHTML = "<p class='text-muted' style='grid-column: 1 / -1;'>No hay convocatorias registradas.</p>";
            return;
        }

        convocatorias.forEach(conv => {
            let colorEstado = "#6c757d"; // Borrador / Cerrada
            if (conv.estado === "Activa") colorEstado = "#2ecc71";
            if (conv.estado === "Evaluacion") colorEstado = "#f1c40f";

            const card = document.createElement("div");
            card.className = "card p-3 shadow-sm text-center";
            card.style.cursor = "pointer";
            card.style.transition = "transform 0.2s, box-shadow 0.2s";
            card.onmouseover = () => { card.style.transform = "scale(1.02)"; };
            card.onmouseout = () => { card.style.transform = "scale(1)"; };

            card.onclick = () => editarConvocatoria(conv.id);

            card.innerHTML = `
                <div class="mb-2" style="font-size: 2.5rem; color: #9b59b6;">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <h5 class="mb-1" style="font-weight:600; color:#2c3e50;">${conv.nombre}</h5>
                <p class="mb-2 text-muted" style="font-size:0.9rem;">${conv.fecha_inicio} a ${conv.fecha_fin}</p>
                <div>
                    <span class="badge" style="background-color: ${colorEstado}; font-size:0.8rem;">${conv.estado}</span>
                </div>
            `;

            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error("Error en cargarConvocatorias:", error);
        contenedor.innerHTML = "<p class='text-muted' style='grid-column: 1 / -1;'>Esperando API de convocatorias...</p>";
    }
}

async function cargarPosgradosEnSelect() {
    try {
        const respuesta = await fetch("http://localhost:4000/api/posgrado");
        if (!respuesta.ok) return;
        const posgrados = await respuesta.json();
        const select = document.getElementById("convocatoria_posgrado");
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione un posgrado...</option>';
        if (Array.isArray(posgrados)) {
            posgrados.forEach(pos => {
                const option = document.createElement("option");
                option.value = pos.id;
                option.textContent = pos.nombre;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error al cargar posgrados en select:", error);
    }
}

function limpiarFormularioConvocatoria() {
    document.getElementById("formConvocatoria").reset();
    document.getElementById("idConvocatoriaForm").value = "";
    document.getElementById("tituloModalConvocatoria").innerHTML = '<i class="fa-solid fa-bullhorn"></i> Nueva Convocatoria';
    document.getElementById("btnEliminarConvocatoria").style.display = "none";
    document.getElementById("contenedorRequisitos").innerHTML = ""; // Limpiar requisitos
}

function agregarRequisitoUI(descripcion = "", obligatorio = true) {
    const contenedor = document.getElementById("contenedorRequisitos");

    const div = document.createElement("div");
    div.className = "input-group mb-2 requisito-item";

    const checkedHtml = obligatorio ? "checked" : "";

    div.innerHTML = `
        <input type="text" class="form-control req-descripcion" placeholder="Descripción del requisito..." value="${descripcion}" required>
        <div class="input-group-text bg-light">
            <input class="form-check-input mt-0 req-obligatorio" type="checkbox" ${checkedHtml} title="¿Obligatorio?">
            <label class="ms-1 mb-0 text-muted" style="font-size:0.8rem; cursor:pointer;" onclick="this.previousElementSibling.click()">Obligatorio</label>
        </div>
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()" title="Eliminar requisito">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    contenedor.appendChild(div);
}

async function editarConvocatoria(id) {
    try {
        const respuesta = await fetch(`http://localhost:4000/api/convocatorias/${id}`);
        const conv = await respuesta.json();

        if (!conv) throw new Error("Convocatoria no encontrada");

        document.getElementById("idConvocatoriaForm").value = conv.id;
        document.getElementById("convocatoria_nombre").value = conv.nombre || "";
        document.getElementById("convocatoria_descripcion").value = conv.descripcion || "";
        document.getElementById("convocatoria_fecha_inicio").value = conv.fecha_inicio || "";
        document.getElementById("convocatoria_fecha_fin").value = conv.fecha_fin || "";
        document.getElementById("convocatoria_estado").value = conv.estado || "Borrador";

        // Cargar requisitos dinámicos
        const contenedor = document.getElementById("contenedorRequisitos");
        contenedor.innerHTML = "";
        if (conv.requisitos && Array.isArray(conv.requisitos)) {
            conv.requisitos.forEach(req => agregarRequisitoUI(req.descripcion, req.obligatorio));
        }

        document.getElementById("tituloModalConvocatoria").innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Convocatoria';

        const btnEliminar = document.getElementById("btnEliminarConvocatoria");
        if (btnEliminar) {
            btnEliminar.style.display = "inline-block";
            btnEliminar.onclick = () => eliminarConvocatoria(conv.id);
        }

        const modalElement = document.getElementById("modalConvocatoria");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

    } catch (error) {
        console.error("Error al preparar la edición:", error);
        alert("No se pudieron cargar los datos de la convocatoria.");
    }
}

document.getElementById("formConvocatoria")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idConvocatoriaForm").value;
    const nombre = document.getElementById("convocatoria_nombre").value;
    const descripcion = document.getElementById("convocatoria_descripcion").value;
    const fecha_inicio = document.getElementById("convocatoria_fecha_inicio").value;
    const fecha_fin = document.getElementById("convocatoria_fecha_fin").value;
    const estado = document.getElementById("convocatoria_estado").value;

    // Recopilar requisitos del DOM
    const reqItems = document.querySelectorAll("#contenedorRequisitos .requisito-item");
    const requisitos = [];
    reqItems.forEach(item => {
        const desc = item.querySelector(".req-descripcion").value;
        const oblig = item.querySelector(".req-obligatorio").checked;
        if (desc.trim() !== "") {
            requisitos.push({ descripcion: desc.trim(), obligatorio: oblig });
        }
    });

    const datosConvocatoria = { nombre, descripcion, fecha_inicio, fecha_fin, estado, requisitos };
    const token = localStorage.getItem("token") || "";

    try {
        let url = "http://localhost:4000/api/convocatorias";
        let metodo = "POST";

        if (idInput && idInput.trim() !== "") {
            url = `http://localhost:4000/api/convocatorias/${idInput}`;
            metodo = "PUT";
        }

        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(datosConvocatoria)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Operación realizada con éxito");

            const modalElement = document.getElementById("modalConvocatoria");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            limpiarFormularioConvocatoria();
            cargarConvocatorias();
        } else {
            alert(resultado.mensaje || "Hubo un error al procesar la solicitud.");
        }

    } catch (error) {
        console.error("Error al guardar la convocatoria:", error);
        alert("Ocurrió un error en la conexión con el servidor.");
    }
});

async function eliminarConvocatoria(id) {
    if (!confirm(`¿Está seguro de eliminar la convocatoria con ID: ${id}?`)) {
        return;
    }

    const token = localStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`http://localhost:4000/api/convocatorias/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Convocatoria eliminada con éxito.");

            const modalElement = document.getElementById("modalConvocatoria");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            cargarConvocatorias();
        } else {
            alert(resultado.mensaje || "No se pudo eliminar la convocatoria.");
        }

    } catch (error) {
        console.error("Error en eliminarConvocatoria:", error);
        alert("Ocurrió un error al intentar eliminar la convocatoria.");
    }
}
// ==========================================
// MÓDULO ASPIRANTES
// ==========================================

async function cargarAspirantes() {
    const totalAspirantes = document.getElementById("totalAspirantes");
    const tbody = document.getElementById("tablaAspirantes");
    if (!tbody) return;

    try {
        const respuesta = await fetch("http://localhost:4000/api/aspirante");

        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const aspirantes = await respuesta.json();
        console.log(aspirantes)

        if (totalAspirantes) {
            totalAspirantes.textContent = aspirantes.length || 0;
        }

        tbody.innerHTML = "";

        if (!aspirantes || aspirantes.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>No hay aspirantes registrados.</td></tr>";
            return;
        }

        aspirantes.forEach(aspirante => {
            const tr = document.createElement("tr");
            // Formatear nombre completo
            const nombreCompleto = `${aspirante.nombre || ''} ${aspirante.primerApellido || ''} ${aspirante.segundoApellido || ''}`.trim();

            tr.style.cursor = "pointer";
            tr.onclick = () => editarAspirante(aspirante.id);
            tr.innerHTML = `
                <td>${nombreCompleto || 'Sin nombre'}</td>
                <td>${aspirante.correo || 'Sin correo'}</td>
                <td><span class="badge bg-secondary">Registrado</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error al cargar aspirantes:", error);
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>Esperando API de aspirantes...</td></tr>";
    }
}

async function editarAspirante(id) {
    try {
        const respuesta = await fetch(`http://localhost:4000/api/aspirante/${id}`);
        if (!respuesta.ok) throw new Error("Aspirante no encontrado");

        const aspirante = await respuesta.json();

        // Llenar el modal
        document.getElementById("detalleAspId").value = aspirante.id || "";
        document.getElementById("detalleAspNombre").value = aspirante.nombre || "";
        document.getElementById("detalleAspPrimerApellido").value = aspirante.primerApellido || "";
        document.getElementById("detalleAspSegundoApellido").value = aspirante.segundoApellido || "";
        document.getElementById("detalleAspCurp").value = aspirante.curp || "";
        document.getElementById("detalleAspCorreo").value = aspirante.correo || "";
        document.getElementById("detalleAspTelefono").value = aspirante.telefono || "";

        // Formatear la fecha si existe
        let fechaFormat = "";
        if (aspirante.fechaNacimiento) {
            const d = new Date(aspirante.fechaNacimiento);
            if (!isNaN(d.getTime())) {
                fechaFormat = d.toISOString().split('T')[0];
            } else {
                fechaFormat = aspirante.fechaNacimiento;
            }
        }
        document.getElementById("detalleAspFechaNac").value = fechaFormat;

        document.getElementById("detalleAspDireccion").value = aspirante.direccion || "";

        // Mostrar modal
        const modalElement = document.getElementById("modalAspirante");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

    } catch (error) {
        console.error("Error al cargar detalles del aspirante:", error);
        alert("Ocurrió un error al cargar los detalles del aspirante.");
    }
}

document.getElementById("formAspirante")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("detalleAspId").value;
    
    const datos = {
        nombre: document.getElementById("detalleAspNombre").value,
        primerApellido: document.getElementById("detalleAspPrimerApellido").value,
        segundoApellido: document.getElementById("detalleAspSegundoApellido").value,
        curp: document.getElementById("detalleAspCurp").value,
        correo: document.getElementById("detalleAspCorreo").value,
        telefono: document.getElementById("detalleAspTelefono").value,
        fechaNacimiento: document.getElementById("detalleAspFechaNac").value,
        direccion: document.getElementById("detalleAspDireccion").value
    };
    
    const token = localStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`http://localhost:4000/api/aspirante/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();
        
        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Aspirante actualizado con éxito");
            const modalElement = document.getElementById("modalAspirante");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            cargarAspirantes();
        } else {
            alert(resultado.mensaje || "Hubo un error al procesar la solicitud.");
        }
    } catch (error) {
        console.error("Error al guardar aspirante:", error);
        alert("Ocurrió un error en la conexión con el servidor.");
    }
});

// ==========================================
// MÓDULO NOTIFICACIONES
// ==========================================

async function cargarNotificacionesAdmin() {
    const tbody = document.getElementById("tablaNotificaciones");
    if (!tbody) return;

    try {
        const respuesta = await fetch("http://localhost:4000/api/notificaciones"); // API futura
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const notificaciones = await respuesta.json();
        tbody.innerHTML = "";

        if (!notificaciones || notificaciones.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>No hay notificaciones registradas.</td></tr>";
            return;
        }

        notificaciones.forEach(notif => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.onclick = () => editarNotificacion(notif.id);
            tr.innerHTML = `
                <td>${notif.id}</td>
                <td>${notif.nombre}</td>
                <td>${notif.mensaje.substring(0, 50)}...</td>
                <td>${notif.fecha_creacion || 'N/A'}</td>
                <td><span class="badge ${notif.activa === 'true' ? 'bg-success' : 'bg-secondary'}">${notif.activa || 'true'}</span></td>
                <td><span class="badge ${notif.destino === 'Todos' ? 'bg-success' : 'bg-secondary'}">${notif.destino || 'Todos'}</span></td>
                `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.warn("Error al cargar notificaciones (API no lista):", error);
        tbody.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>Esperando que se habilite la API de notificaciones...</td></tr>";
    }
}

function limpiarFormularioNotificacion() {
    const form = document.getElementById("formNotificacion");
    if (form) form.reset();
    document.getElementById("idNotificacionForm").value = "";
    document.getElementById("tituloModalNotificacion").innerHTML = '<i class="fa-solid fa-bell"></i> Nueva Notificación';
    document.getElementById("btnEliminarNotificacion").style.display = "none";
}

async function editarNotificacion(id) {
    try {
        const respuesta = await fetch(`http://localhost:4000/api/notificaciones/${id}`);
        if (!respuesta.ok) throw new Error("Notificación no encontrada");

        const notif = await respuesta.json();

        document.getElementById("idNotificacionForm").value = notif.id;
        document.getElementById("notif_titulo").value = notif.nombre || "";
        document.getElementById("notif_mensaje").value = notif.mensaje || "";
        document.getElementById("notif_destino").value = notif.destino || "Todos";
        document.getElementById("notif_estado").value = notif.activa || "Activa";

        document.getElementById("tituloModalNotificacion").innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Notificación';

        const btnEliminar = document.getElementById("btnEliminarNotificacion");
        if (btnEliminar) {
            btnEliminar.style.display = "inline-block";
            btnEliminar.onclick = () => eliminarNotificacion(notif.id);
        }

        const modalElement = document.getElementById("modalNotificacion");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    } catch (error) {
        console.warn("API de edición de notificaciones no lista:", error);
        alert("La API para obtener la notificación aún no está habilitada.");
    }
}

document.getElementById("formNotificacion")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idNotificacionForm").value;
    const nombre = document.getElementById("notif_titulo").value;
    const mensaje = document.getElementById("notif_mensaje").value;
    const activa = document.getElementById("notif_estado").value;
    const destino = document.getElementById("notif_destino").value;

    const datosNotif = { nombre, mensaje, destino, activa };
    const token = localStorage.getItem("token") || "";

    try {
        let url = "http://localhost:4000/api/notificaciones";
        let metodo = "POST";

        if (idInput && idInput.trim() !== "") {
            url = `http://localhost:4000/api/notificaciones/${idInput}`;
            metodo = "PUT";
        }

        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(datosNotif)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Notificación guardada con éxito");

            const modalElement = document.getElementById("modalNotificacion");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            limpiarFormularioNotificacion();
            cargarNotificacionesAdmin();
        } else {
            alert(resultado.mensaje || "Hubo un error al guardar la notificación.");
        }
    } catch (error) {
        console.warn("API de guardar notificaciones no lista:", error);
        alert("La conexión con la API de notificaciones falló. (Aún no implementada)");
    }
});

async function eliminarNotificacion(id) {
    if (!confirm(`¿Está seguro de eliminar la notificación con ID: ${id}?`)) return;

    const token = localStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`http://localhost:4000/api/notificaciones/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            alert(resultado.mensaje || "Notificación eliminada con éxito.");

            const modalElement = document.getElementById("modalNotificacion");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            cargarNotificacionesAdmin();
        } else {
            alert(resultado.mensaje || "No se pudo eliminar la notificación.");
        }
    } catch (error) {
        console.warn("API de eliminar notificaciones no lista:", error);
        alert("Ocurrió un error al intentar eliminar la notificación. (API no implementada)");
    }
}

