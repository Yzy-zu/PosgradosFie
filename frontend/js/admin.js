// Conexión Socket.io
const socket = io();
socket.on('actualizacionGlobal', () => {
    // Recargar vista actual si hay un cambio en el sistema
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash === 'dashboard' || currentHash === '') {
        if (typeof cargarDashboard === 'function') cargarDashboard();
    } else if (currentHash === 'usuarios') {
        if (typeof cargarUsuarios === 'function') cargarUsuarios();
    } else if (currentHash === 'convocatorias') {
        if (typeof cargarConvocatorias === 'function') cargarConvocatorias();
    } else if (currentHash === 'aspirantes') {
        if (typeof cargarAspirantes === 'function') cargarAspirantes();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    validarSesion();
    mostrarAdministrador();
    configurarBotones();
    configurarNavegacion(); // Configurar eventos de clic
    cargarDashboard();
    cargarUsuarios();
    cargarConvocatorias(); // Inicializar panel de convocatorias
    cargarPosgradosEnSelect();
    cargarAspirantes();
    cargarNotificacionesAdmin(); // Inicializar panel de notificaciones
    cargarCatalogoRequisitosUI(); // Inicializar catálogo de requisitos

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
    const usuario = sessionStorage.getItem("usuario");
    const token = sessionStorage.getItem("token");

    if (!usuario || !token) {
        alert("Sesión inválida o expirada. Por favor, inicie sesión.");
        sessionStorage.clear();
        window.location.href = "login.html";
        return;
    }
}

function mostrarAdministrador() {
    let usuario = JSON.parse(sessionStorage.getItem("usuario"));
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


}



function activarSeccionPorHash() {
    mostrarLoader();
    const hash = window.location.hash.replace("#", "");
    if (!hash) {
        ocultarLoader();
        return;
    }

    const enlaces = document.querySelectorAll("#sidebarMenu .nav-link");
    const secciones = document.querySelectorAll(".content-section");
    const tituloSeccion = document.getElementById("seccion-titulo");
    const descSeccion = document.getElementById("seccion-descripcion");

    // Remover estado activo de todos los enlaces en el menú
    enlaces.forEach(link => link.classList.remove("active"));

    // Ocultar todas las secciones del contenido y quitar fade-in
    secciones.forEach(sec => {
        sec.classList.add("d-none");
        sec.classList.remove("fade-in");
    });

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

    // Mostrar la sección correspondiente en el HTML con fade-in
    const seccionMostrar = document.getElementById(`seccion-${hash}`);
    if (seccionMostrar) {
        seccionMostrar.classList.remove("d-none");
        void seccionMostrar.offsetWidth; // Trigger reflow for animation
        seccionMostrar.classList.add("fade-in");
    }

    setTimeout(() => {
        ocultarLoader();
    }, 300); // Simulate brief loading for smooth transition
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
        const respuesta = await fetch("/api/usuario");
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
                <td>${usuario.correo}</td>
                <td>${usuario.rol || 'Usuario'}</td>
                <td><span class="badge bg-success">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) {
        console.error("Error en cargarUsuarios:", error);
    }
}

async function editarUsuario(id) {
    try {
        const respuesta = await fetch(`/api/usuario/${id}`);
        const usuario = await respuesta.json();
        console.log(usuario)

        if (!usuario) throw new Error("Usuario no encontrado");

        const inputId = document.getElementById("idUsuarioForm");
        if (inputId) inputId.value = usuario.id;

        const inputNombre = document.getElementById("nombre");
        if (inputNombre) inputNombre.value = usuario.nombre;

        const inputCorreo = document.getElementById("correo");
        if (inputCorreo) inputCorreo.value = usuario.correo;

        const inputRol = document.getElementById("rol");
        if (inputRol) inputRol.value = usuario.rol;

        const inputPassword = document.getElementById("password");
        if (inputPassword) inputPassword.value = "";
        const inputEstado = document.getElementById("activo");
        if (inputEstado) inputEstado.value = `${usuario.activo ? '1' : '0'}`;

        document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Usuario';

        const btnEliminar = document.getElementById("btnEliminarUsuario");
        if (btnEliminar) btnEliminar.style.display = "inline-block";

        // Renderizar los detalles extra y esconder/mostrar el contenedor
        renderizarCamposRol(usuario.rol, usuario.detalles || {});
        const contDetalles = document.getElementById("detallesExtendidos");
        const modalDialog = document.getElementById("dialogUsuario");
        if (contDetalles) {
            contDetalles.style.width = "0px";
            contDetalles.style.opacity = "0";
            contDetalles.style.padding = "0";
        }
        if (modalDialog) modalDialog.style.maxWidth = "500px";

        const btnTog = document.getElementById("btnToggleDetalles");
        if (btnTog) btnTog.innerHTML = '<i class="fa-solid fa-chevron-right"></i> Ver detalles específicos del rol';

        const modalElement = document.getElementById("modalUsuario");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

    } catch (error) {
        console.error("Error al preparar la edición:", error);
        alert("No se pudieron cargar los datos del usuario.");
    }
}

// Renderizar campos según el rol
function renderizarCamposRol(rol, detalles = {}) {
    const contenedorBtn = document.getElementById("contenedorBtnDetalles");
    const contenedorDetalles = document.getElementById("detallesExtendidos");

    let html = "";
    if (rol === "ASPIRANTE") {
        html = `
            <h6 class="text-primary mb-3"><i class="fa-solid fa-user-graduate"></i> Detalles de Aspirante</h6>
            <div class="row" style="max-height: 400px; overflow-y: auto; overflow-x: hidden;">
                <div class="col-md-4 mb-2"><label class="form-label small">Nombre</label><input type="text" id="det_nombre" class="form-control form-control-sm" value="${detalles.nombre || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Primer Apellido</label><input type="text" id="det_primerApellido" class="form-control form-control-sm" value="${detalles.primerApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Segundo Apellido</label><input type="text" id="det_segundoApellido" class="form-control form-control-sm" value="${detalles.segundoApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">CURP</label><input type="text" id="det_curp" class="form-control form-control-sm" value="${detalles.curp || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Teléfono</label><input type="text" id="det_telefono" class="form-control form-control-sm" value="${detalles.telefono || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Fecha Nacimiento</label><input type="date" id="det_fechaNacimiento" class="form-control form-control-sm" value="${detalles.fechaNacimiento ? detalles.fechaNacimiento.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2">
                    <label class="form-label small">Estado Civil</label>
                    <select id="det_estadoCivil" class="form-select form-select-sm">
                        <option value="SOLTERO" ${detalles.estadoCivil === 'SOLTERO' ? 'selected' : ''}>SOLTERO</option>
                        <option value="CASADO" ${detalles.estadoCivil === 'CASADO' ? 'selected' : ''}>CASADO</option>
                        <option value="UNION_LIBRE" ${detalles.estadoCivil === 'UNION_LIBRE' ? 'selected' : ''}>UNIÓN LIBRE</option>
                        <option value="DIVORCIADO" ${detalles.estadoCivil === 'DIVORCIADO' ? 'selected' : ''}>DIVORCIADO</option>
                        <option value="SEPARADO" ${detalles.estadoCivil === 'SEPARADO' ? 'selected' : ''}>SEPARADO</option>
                        <option value="VIUDO" ${detalles.estadoCivil === 'VIUDO' ? 'selected' : ''}>VIUDO</option>
                    </select>
                </div>
                <div class="col-md-8 mb-2"><label class="form-label small">Dirección</label><input type="text" id="det_direccion" class="form-control form-control-sm" value="${detalles.direccion || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Código Postal</label><input type="number" id="det_direccionPostal" class="form-control form-control-sm" value="${detalles.direccionPostal || ''}"></div>
                
                <h6 class="text-secondary mt-3 mb-2 w-100 border-bottom pb-1"><i class="fa-solid fa-graduation-cap"></i> Antecedentes Académicos</h6>
                <div class="col-md-6 mb-2"><label class="form-label small">Licenciatura</label><input type="text" id="det_licenciatura" class="form-control form-control-sm" value="${detalles.licenciatura || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small">Institución (Licenciatura)</label><input type="text" id="det_institucionLicenciatura" class="form-control form-control-sm" value="${detalles.institucionLicenciatura || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Fecha de Egreso</label><input type="date" id="det_fechaEgreso" class="form-control form-control-sm" value="${detalles.fechaEgreso ? detalles.fechaEgreso.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Fecha de Titulación</label><input type="date" id="det_fechaTitulacion" class="form-control form-control-sm" value="${detalles.fechaTitulacion ? detalles.fechaTitulacion.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Promedio</label><input type="number" step="0.01" id="det_promedio" class="form-control form-control-sm" value="${detalles.promedio || ''}"></div>
                <div class="col-md-12 mb-2"><label class="form-label small">Otros Estudios</label><input type="text" id="det_otrosEstudios" class="form-control form-control-sm" value="${detalles.otrosEstudios || ''}"></div>

                <h6 class="text-secondary mt-3 mb-2 w-100 border-bottom pb-1"><i class="fa-solid fa-briefcase"></i> Ocupación</h6>
                <div class="col-md-6 mb-2"><label class="form-label small">Ocupación Actual</label><input type="text" id="det_ocupacion" class="form-control form-control-sm" value="${detalles.ocupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small">Teléfono (Ocupación)</label><input type="text" id="det_telefonoOcupacion" class="form-control form-control-sm" value="${detalles.telefonoOcupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small">Ciudad (Ocupación)</label><input type="text" id="det_ciudadOcupacion" class="form-control form-control-sm" value="${detalles.ciudadOcupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small">Estado (Ocupación)</label><input type="text" id="det_estadoOcupacion" class="form-control form-control-sm" value="${detalles.estadoOcupacion || ''}"></div>
            </div>
        `;
        contenedorBtn.style.display = "block";
    } else if (rol === "DOCENTE") {
        html = `
            <h6 class="text-primary mb-3"><i class="fa-solid fa-chalkboard-user"></i> Detalles de Docente</h6>
            <div class="row">
                <div class="col-md-4 mb-2"><label class="form-label small">Nombre</label><input type="text" id="det_nombre" class="form-control form-control-sm" value="${detalles.nombre || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Primer Apellido</label><input type="text" id="det_primerApellido" class="form-control form-control-sm" value="${detalles.primerApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Segundo Apellido</label><input type="text" id="det_segundoApellido" class="form-control form-control-sm" value="${detalles.segundoApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Cargo</label><input type="text" id="det_cargo" class="form-control form-control-sm" value="${detalles.cargo || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Especialidad</label><input type="text" id="det_especialidad" class="form-control form-control-sm" value="${detalles.especialidad || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small">Cubículo</label><input type="text" id="det_cubiculo" class="form-control form-control-sm" value="${detalles.cubiculo || ''}"></div>
            </div>
        `;
        contenedorBtn.style.display = "block";
    } else if (rol === "SECRETARIO") {
        html = `
            <h6 class="text-primary mb-3"><i class="fa-solid fa-user-tie"></i> Detalles de Secretario</h6>
            <div class="row">
                <div class="col-md-6 mb-2"><label class="form-label small">Área</label><input type="text" id="det_area" class="form-control form-control-sm" value="${detalles.area || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small">Extensión</label><input type="text" id="det_extension" class="form-control form-control-sm" value="${detalles.extension || ''}"></div>
            </div>
        `;
        contenedorBtn.style.display = "block";
    } else {
        html = "";
        contenedorBtn.style.display = "none";

        contenedorDetalles.style.width = "0px";
        contenedorDetalles.style.opacity = "0";
        contenedorDetalles.style.padding = "0";
        const modalDialog = document.getElementById("dialogUsuario");
        if (modalDialog) modalDialog.style.maxWidth = "500px";
    }

    // Envolver en un div de ancho fijo para que no haga wrap al colapsar (y evitar altura extra en el flex row)
    if (html !== "") {
        html = `<div style="width: 560px;">${html}</div>`;
    }
    contenedorDetalles.innerHTML = html;
}

// Escuchar cambios en el selector de rol
document.getElementById("rol")?.addEventListener("change", function (e) {
    renderizarCamposRol(e.target.value);
});

// Funcionalidad para animación de detalles
function toggleDetallesUsuario() {
    const contenedor = document.getElementById("detallesExtendidos");
    const modalDialog = document.getElementById("dialogUsuario");
    const btn = document.getElementById("btnToggleDetalles");

    if (contenedor.style.width !== "0px" && contenedor.style.width !== "") {
        contenedor.style.width = "0px";
        contenedor.style.opacity = "0";
        contenedor.style.padding = "0";
        if (modalDialog) modalDialog.style.maxWidth = "500px";
        btn.innerHTML = '<i class="fa-solid fa-chevron-right"></i> Ver detalles específicos del rol';
    } else {
        contenedor.style.width = "600px";
        contenedor.style.opacity = "1";
        contenedor.style.padding = "1rem";
        if (modalDialog) modalDialog.style.maxWidth = "1100px";
        btn.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Ocultar detalles específicos';
    }
}

// Reset del modal al abrirlo para "Nuevo Usuario"
document.getElementById("modalUsuario")?.addEventListener('show.bs.modal', function (event) {
    const isEdit = document.getElementById("idUsuarioForm").value !== "";
    // Si no tiene ID asignado (se abrió por el botón de + Nuevo)
    if (!isEdit && !event.relatedTarget?.closest('.btn-sm')) {
        document.getElementById("formUsuario").reset();
        document.getElementById("idUsuarioForm").value = "";
        document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario';
        const btnElim = document.getElementById("btnEliminarUsuario");
        if (btnElim) btnElim.style.display = "none";
        renderizarCamposRol(document.getElementById("rol").value);
        const contDetalles = document.getElementById("detallesExtendidos");
        const modalDialog = document.getElementById("dialogUsuario");
        if (contDetalles) {
            contDetalles.style.width = "0px";
            contDetalles.style.opacity = "0";
            contDetalles.style.padding = "0";
        }
        if (modalDialog) modalDialog.style.maxWidth = "500px";

        const btnTog = document.getElementById("btnToggleDetalles");
        if (btnTog) btnTog.innerHTML = '<i class="fa-solid fa-chevron-right"></i> Ver detalles específicos del rol';
    }
});

document.getElementById("formUsuario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idUsuarioForm");
    const idUsuario = idInput ? idInput.value : "";
    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const rol = document.getElementById("rol").value;
    const activo = document.getElementById("activo").value;

    let detalles = null;
    if (rol === "ASPIRANTE") {
        detalles = {
            nombre: document.getElementById("det_nombre")?.value,
            primerApellido: document.getElementById("det_primerApellido")?.value,
            segundoApellido: document.getElementById("det_segundoApellido")?.value,
            curp: document.getElementById("det_curp")?.value,
            telefono: document.getElementById("det_telefono")?.value,
            fechaNacimiento: document.getElementById("det_fechaNacimiento")?.value,
            estadoCivil: document.getElementById("det_estadoCivil")?.value || 'SOLTERO',
            direccion: document.getElementById("det_direccion")?.value,
            direccionPostal: document.getElementById("det_direccionPostal")?.value,
            licenciatura: document.getElementById("det_licenciatura")?.value,
            institucionLicenciatura: document.getElementById("det_institucionLicenciatura")?.value,
            fechaEgreso: document.getElementById("det_fechaEgreso")?.value,
            fechaTitulacion: document.getElementById("det_fechaTitulacion")?.value,
            promedio: document.getElementById("det_promedio")?.value,
            otrosEstudios: document.getElementById("det_otrosEstudios")?.value,
            ocupacion: document.getElementById("det_ocupacion")?.value,
            telefonoOcupacion: document.getElementById("det_telefonoOcupacion")?.value,
            ciudadOcupacion: document.getElementById("det_ciudadOcupacion")?.value,
            estadoOcupacion: document.getElementById("det_estadoOcupacion")?.value
        };
    } else if (rol === "DOCENTE") {
        detalles = {
            nombre: document.getElementById("det_nombre")?.value,
            primerApellido: document.getElementById("det_primerApellido")?.value,
            segundoApellido: document.getElementById("det_segundoApellido")?.value,
            cargo: document.getElementById("det_cargo")?.value,
            especialidad: document.getElementById("det_especialidad")?.value,
            cubiculo: document.getElementById("det_cubiculo")?.value
        };
    } else if (rol === "SECRETARIO") {
        detalles = {
            area: document.getElementById("det_area")?.value,
            extension: document.getElementById("det_extension")?.value
        };
    }

    const datosUsuario = { correo, password, rol, activo, detalles };
    const token = sessionStorage.getItem("token"); // Por si requiere token más adelante

    try {
        let url = "/api/usuario";
        let metodo = "POST";

        if (idUsuario && idUsuario.trim() !== "") {
            url = `/api/usuario/${idUsuario}`;
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

    const token = sessionStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`/api/usuario/${id}`, {
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
        const respuesta = await fetch("/api/convocatorias");

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
            const fechaInicioFormateada = new Date(conv.fecha_inicio).toLocaleDateString('es-MX');
            const fechaFinFormateada = new Date(conv.fecha_fin).toLocaleDateString('es-MX');
            card.onclick = () => editarConvocatoria(conv.id);

            card.innerHTML = `
                <div class="mb-2" style="font-size: 2.5rem; color: #9b59b6;">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <h5 class="mb-1" style="font-weight:600; color:#2c3e50;">${conv.nombre}</h5>
                <p class="mb-2 text-muted" style="font-size:0.9rem;">${fechaInicioFormateada} a ${fechaFinFormateada}</p>
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
        const respuesta = await fetch("/api/posgrado");
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

function toggleCamposPorTipo() {
    const tipo = document.getElementById("convocatoria_tipo").value;
    const grupoEntrevistas = document.getElementById("grupo_entrevistas");
    const grupoAcademicas = document.getElementById("grupo_fechas_academicas");

    if (tipo === "MAESTRIA") {
        // Ocultar entrevistas y limpiar
        if (grupoEntrevistas) grupoEntrevistas.style.display = "none";
        document.getElementById("convocatoria_fechaEntrevistaInicio").value = "";
        document.getElementById("convocatoria_fechaEntrevistaFin").value = "";

        // Mostrar académicas
        if (grupoAcademicas) grupoAcademicas.style.display = "block";
    } else if (tipo === "DOCTORADO") {
        // Mostrar entrevistas
        if (grupoEntrevistas) grupoEntrevistas.style.display = "flex"; // row display flex by default in BS

        // Ocultar académicas y limpiar
        if (grupoAcademicas) grupoAcademicas.style.display = "none";
        document.getElementById("convocatoria_inicioCurso").value = "";
        document.getElementById("convocatoria_finCurso").value = "";
        document.getElementById("convocatoria_inicioExamen").value = "";
        document.getElementById("convocatoria_finExamen").value = "";
    }
}

document.getElementById("convocatoria_tipo")?.addEventListener("change", toggleCamposPorTipo);

function limpiarFormularioConvocatoria() {
    document.getElementById("formConvocatoria").reset();
    document.getElementById("idConvocatoriaForm").value = "";
    document.getElementById("convocatoria_posgrado").value = "";
    document.getElementById("tituloModalConvocatoria").innerHTML = '<i class="fa-solid fa-bullhorn"></i> Nueva Convocatoria';
    document.getElementById("btnEliminarConvocatoria").style.display = "none";
    toggleCamposPorTipo();

    // Desmarcar todos los checkboxes del catálogo
    const checkboxes = document.querySelectorAll("#contenedorRequisitos .req-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = false;
        const oblCb = document.getElementById(`obligatorio_${cb.value}`);
        if (oblCb) oblCb.checked = false;
    });
}

function crearConvocatoria() {
    limpiarFormularioConvocatoria();
    const modalElement = document.getElementById("modalConvocatoria");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

async function cargarCatalogoRequisitosUI() {
    const contenedor = document.getElementById("contenedorRequisitos");
    if (!contenedor) return;

    try {
        const respuesta = await fetch("/api/requisitos");
        if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo de requisitos");

        const requisitos = await respuesta.json();
        contenedor.innerHTML = "";

        if (requisitos.length === 0) {
            contenedor.innerHTML = "<p class='text-muted'>No hay requisitos en el catálogo.</p>";
            return;
        }

        requisitos.forEach(req => {
            const div = document.createElement("div");
            div.className = "d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-white";

            div.innerHTML = `
                <div class="form-check mb-0">
                    <input class="form-check-input req-checkbox" type="checkbox" value="${req.id}" id="req_${req.id}">
                    <label class="form-check-label text-dark" for="req_${req.id}" style="cursor:pointer;">
                        ${req.nombre}
                    </label>
                </div>
                <div class="form-check form-switch mb-0" style="margin-left: 10px;">
                    <input class="form-check-input req-obligatorio" type="checkbox" id="obligatorio_${req.id}">
                    <label class="form-check-label small text-muted" for="obligatorio_${req.id}" style="cursor:pointer;">Obligatorio</label>
                </div>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
        contenedor.innerHTML = "<p class='text-danger'>Error al cargar requisitos.</p>";
    }
}

async function editarConvocatoria(id) {
    try {
        const respuesta = await fetch(`/api/convocatorias/${id}`);
        const conv = await respuesta.json();

        if (!conv) throw new Error("Convocatoria no encontrada");

        // Limpiar selecciones primero
        limpiarFormularioConvocatoria();
        document.getElementById("idConvocatoriaForm").value = conv.id;
        document.getElementById("convocatoria_posgrado").value = conv.posgrado_id || "";
        document.getElementById("convocatoria_tipo").value = conv.tipo || "MAESTRIA";
        document.getElementById("convocatoria_nombre").value = conv.nombre || "";
        document.getElementById("convocatoria_descripcion").value = conv.descripcion || "";
        document.getElementById("convocatoria_estado").value = conv.estado || "Borrador";
        document.getElementById("convocatoria_modalidad").value = conv.modalidad || "Escolarizada";
        document.getElementById("convocatoria_duracion").value = conv.duracion || "";

        document.getElementById("convocatoria_fecha_inicio").value = conv.fecha_inicio ? conv.fecha_inicio.split('T')[0] : "";
        document.getElementById("convocatoria_fecha_fin").value = conv.fecha_fin ? conv.fecha_fin.split('T')[0] : "";
        document.getElementById("convocatoria_fechaInicioDocumentos").value = conv.fechaInicioDocumentos ? conv.fechaInicioDocumentos.split('T')[0] : "";
        document.getElementById("convocatoria_fechaFinDocumentos").value = conv.fechaFinDocumentos ? conv.fechaFinDocumentos.split('T')[0] : "";
        document.getElementById("convocatoria_fechaEntrevistaInicio").value = conv.fechaEntrevistaInicio ? conv.fechaEntrevistaInicio.split('T')[0] : "";
        document.getElementById("convocatoria_fechaEntrevistaFin").value = conv.fechaEntrevistaFin ? conv.fechaEntrevistaFin.split('T')[0] : "";
        document.getElementById("convocatoria_fechaInicioEscolar").value = conv.fechaInicioEscolar ? conv.fechaInicioEscolar.split('T')[0] : "";
        document.getElementById("convocatoria_fechaResultados").value = conv.fechaResultados ? conv.fechaResultados.split('T')[0] : "";

        document.getElementById("convocatoria_inicioCurso").value = conv.inicioCurso ? conv.inicioCurso.split('T')[0] : "";
        document.getElementById("convocatoria_finCurso").value = conv.finCurso ? conv.finCurso.split('T')[0] : "";
        document.getElementById("convocatoria_inicioExamen").value = conv.inicioExamen ? conv.inicioExamen.split('T')[0] : "";
        document.getElementById("convocatoria_finExamen").value = conv.finExamen ? conv.finExamen.split('T')[0] : "";

        // Cargar requisitos desde tabla pivote
        try {
            const reqRes = await fetch(`/api/convocatorias/${id}/requisitos`);
            if (reqRes.ok) {
                const requisitosAsignados = await reqRes.json();
                requisitosAsignados.forEach(req => {
                    const cb = document.getElementById(`req_${req.id}`);
                    const oblCb = document.getElementById(`obligatorio_${req.id}`);
                    if (cb) {
                        cb.checked = true;
                        if (oblCb) oblCb.checked = req.obligatorio === 1;
                    }
                });
            }
        } catch (e) {
            console.error("Error al cargar requisitos de la convocatoria", e);
        }

        toggleCamposPorTipo();

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
    const posgrado_id = document.getElementById("convocatoria_posgrado").value;
    const tipo = document.getElementById("convocatoria_tipo").value;
    const nombre = document.getElementById("convocatoria_nombre").value;
    const descripcion = document.getElementById("convocatoria_descripcion").value;
    const estado = document.getElementById("convocatoria_estado").value;
    const modalidad = document.getElementById("convocatoria_modalidad").value;
    const duracion = document.getElementById("convocatoria_duracion").value;

    const fecha_inicio = document.getElementById("convocatoria_fecha_inicio").value;
    const fecha_fin = document.getElementById("convocatoria_fecha_fin").value;
    const fechaInicioDocumentos = document.getElementById("convocatoria_fechaInicioDocumentos").value;
    const fechaFinDocumentos = document.getElementById("convocatoria_fechaFinDocumentos").value;
    const fechaEntrevistaInicio = document.getElementById("convocatoria_fechaEntrevistaInicio").value;
    const fechaEntrevistaFin = document.getElementById("convocatoria_fechaEntrevistaFin").value;
    const fechaInicioEscolar = document.getElementById("convocatoria_fechaInicioEscolar").value;
    const fechaResultados = document.getElementById("convocatoria_fechaResultados").value;

    const inicioCurso = document.getElementById("convocatoria_inicioCurso").value;
    const finCurso = document.getElementById("convocatoria_finCurso").value;
    const inicioExamen = document.getElementById("convocatoria_inicioExamen").value;
    const finExamen = document.getElementById("convocatoria_finExamen").value;

    // Recopilar requisitos del DOM (los checkboxes marcados)
    const checkboxes = document.querySelectorAll("#contenedorRequisitos .req-checkbox:checked");
    const requisitos = [];
    checkboxes.forEach(cb => {
        const idReq = cb.value;
        const oblCb = document.getElementById(`obligatorio_${idReq}`);
        requisitos.push({
            id: idReq,
            obligatorio: oblCb ? oblCb.checked : false
        });
    });

    const datosConvocatoria = { nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id, tipo, modalidad, duracion, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, inicioCurso, finCurso, inicioExamen, finExamen, requisitos };
    const token = sessionStorage.getItem("token") || "";

    try {
        let url = "/api/convocatorias";
        let metodo = "POST";

        if (idInput && idInput.trim() !== "") {
            url = `/api/convocatorias/${idInput}`;
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

    const token = sessionStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`/api/convocatorias/${id}`, {
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
        const respuesta = await fetch("/api/aspirante");

        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const aspirantes = await respuesta.json();
        if (totalAspirantes) {
            totalAspirantes.textContent = aspirantes.length || 0;
        }

        tbody.innerHTML = "";

        if (!aspirantes || aspirantes.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>No hay aspirantes registrados.</td></tr>";
            return;
        }

        for (const aspirante of aspirantes) {
            const tr = document.createElement("tr");
            // Formatear nombre completo
            const nombreCompleto = `${aspirante.nombre || ''} ${aspirante.primerApellido || ''} ${aspirante.segundoApellido || ''}`.trim();

            async function correoAspirante(idUsuario) {
                if (!idUsuario) return null;
                try {
                    const respuesta1 = await fetch(`/api/usuario/${idUsuario}`);
                    const usuario1 = await respuesta1.json();
                    return usuario1.correo;
                } catch (e) {
                    return null;
                }
            }

            const correoReal = (await correoAspirante(aspirante.idUsuario)) || aspirante.correo || 'Sin correo';

            tr.style.cursor = "pointer";
            tr.onclick = () => verExpedienteAspirante(aspirante.id);
            tr.innerHTML = `
                <td>${nombreCompleto || 'Sin nombre'}</td>
                <td>${correoReal}</td>
                <td><span class="badge bg-secondary">Registrado</span></td>
            `;
            tbody.appendChild(tr);
        }
    } catch (error) {
        console.error("Error al cargar aspirantes:", error);
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>Esperando API de aspirantes...</td></tr>";
    }
}

async function verExpedienteAspirante(id) {
    try {
        const respuesta = await fetch(`/api/aspirante/${id}/expediente`);
        if (!respuesta.ok) throw new Error("Aspirante no encontrado");

        const expediente = await respuesta.json();
        const perfil = expediente.perfil;
        const solicitudes = expediente.solicitudes || [];

        // Llenar el perfil resumido
        const nombreCompleto = `${perfil.nombre || ''} ${perfil.primerApellido || ''} ${perfil.segundoApellido || ''}`.trim();
        document.getElementById("perfil_nombreCompleto").textContent = nombreCompleto;
        document.getElementById("perfil_correo").textContent = perfil.correo || "Sin correo";

        document.getElementById("perfil_curp").textContent = perfil.curp || "N/A";
        document.getElementById("perfil_telefono").textContent = perfil.telefono || "N/A";

        let fechaNac = "N/A";
        if (perfil.fechaNacimiento) {
            fechaNac = new Date(perfil.fechaNacimiento).toLocaleDateString();
        }
        document.getElementById("perfil_nacimiento").textContent = fechaNac;
        document.getElementById("perfil_direccion").textContent = perfil.direccion || "N/A";

        const badgeEstado = document.getElementById("perfil_estado");
        if (perfil.activo) {
            badgeEstado.className = "badge bg-success mb-4";
            badgeEstado.textContent = "Usuario Activo";
        } else {
            badgeEstado.className = "badge bg-danger mb-4";
            badgeEstado.textContent = "Usuario Inactivo";
        }

        // Llenar las solicitudes
        const contSolicitudes = document.getElementById("contenedorSolicitudes");
        contSolicitudes.innerHTML = ""; // Limpiar

        if (solicitudes.length === 0) {
            contSolicitudes.innerHTML = `
                <div class="text-center py-4">
                    <i class="fa-solid fa-inbox text-muted fs-1 mb-2"></i>
                    <p class="text-muted">El aspirante aún no ha iniciado ningún proceso de admisión.</p>
                </div>
            `;
        } else {
            solicitudes.forEach(sol => {
                let colorBadge = "bg-secondary";
                if (sol.estado === "APROBADO") colorBadge = "bg-success";
                else if (sol.estado === "RECHAZADO") colorBadge = "bg-danger";
                else if (sol.estado === "EN_REVISION") colorBadge = "bg-info text-dark";
                else if (sol.estado === "PENDIENTE") colorBadge = "bg-warning text-dark";

                const d = new Date(sol.creadoEn).toLocaleDateString();

                // Armar la lista de documentos
                let htmlDocs = "";
                if (sol.documentos && sol.documentos.length > 0) {
                    htmlDocs = `<div class="mt-3"><h6 class="small fw-bold text-muted border-bottom pb-1 mb-2">Documentos Adjuntos:</h6><ul class="list-group list-group-flush border rounded">`;
                    sol.documentos.forEach(doc => {
                        let colorDoc = "text-secondary";
                        let iconoDoc = "fa-clock";
                        if (doc.estadoValidacion === "APROBADO") { colorDoc = "text-success"; iconoDoc = "fa-check-circle"; }
                        else if (doc.estadoValidacion === "RECHAZADO") { colorDoc = "text-danger"; iconoDoc = "fa-times-circle"; }
                        else if (doc.estadoValidacion === "PENDIENTE") { colorDoc = "text-warning"; iconoDoc = "fa-clock"; }

                        htmlDocs += `
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                                <div>
                                    <i class="fa-solid fa-file-pdf text-danger me-2"></i>
                                    <span class="small">${doc.requisitoNombre}</span>
                                </div>
                                <div>
                                    <span class="badge bg-light ${colorDoc} border me-2" title="Estado: ${doc.estadoValidacion}">
                                        <i class="fa-solid ${iconoDoc}"></i> ${doc.estadoValidacion}
                                    </span>
                                    <a href="/uploads/${doc.rutaArchivo}" target="_blank" class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size: 0.75rem;">
                                        Ver <i class="fa-solid fa-up-right-from-square ms-1"></i>
                                    </a>
                                </div>
                            </li>
                        `;
                    });
                    htmlDocs += `</ul></div>`;
                } else {
                    htmlDocs = `<div class="mt-3"><p class="text-muted small"><i class="fa-solid fa-folder-minus"></i> No se han adjuntado documentos aún.</p></div>`;
                }

                contSolicitudes.innerHTML += `
                    <div class="card border-0 shadow-sm mb-4 bg-light">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 class="card-title text-primary fw-bold mb-1">${sol.convocatoriaNombre}</h5>
                                    <h6 class="card-subtitle text-muted small"><i class="fa-regular fa-calendar me-1"></i> Iniciado el: ${d} &nbsp;|&nbsp; <i class="fa-solid fa-graduation-cap me-1"></i> ${sol.tipoAdmision}</h6>
                                </div>
                                <span class="badge ${colorBadge} fs-6 px-3 py-2 rounded-pill">${sol.estado}</span>
                            </div>
                            ${htmlDocs}
                        </div>
                    </div>
                `;
            });
        }

        // Intercambiar vistas
        document.getElementById("vistaTablaAspirantes").classList.add("d-none");
        document.getElementById("vistaPerfilAspirante").classList.remove("d-none");

    } catch (error) {
        console.error("Error al cargar expediente:", error);
        alert("No se pudo cargar el expediente del aspirante.");
    }
}

function cerrarExpedienteAspirante() {
    document.getElementById("vistaPerfilAspirante").classList.add("d-none");
    document.getElementById("vistaTablaAspirantes").classList.remove("d-none");
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

    const token = sessionStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`/api/aspirante/${id}`, {
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
    const contenedor = document.getElementById("tablaNotificaciones");
    if (!contenedor) return;

    try {
        const respuesta = await fetch("/api/notificaciones");
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const notificaciones = await respuesta.json();
        contenedor.innerHTML = "";

        if (!notificaciones || notificaciones.length === 0) {
            contenedor.innerHTML = `<tr><td colspan='5' class='text-center text-muted py-5'>
                <i class="fa-solid fa-inbox fs-2 mb-3 opacity-25"></i>
                <p class="mb-0">No hay notificaciones registradas.</p>
            </td></tr>`;
            return;
        }

        notificaciones.forEach(notif => {
            const tr = document.createElement("tr");

            // Etiqueta de destino y estado
            let destinoIcon = 'fa-users';
            let destinoText = notif.destino || 'todos';
            let destinoBg = 'bg-primary bg-opacity-10 text-primary';

            if (destinoText === 'aspirantes') { destinoIcon = 'fa-graduation-cap'; destinoBg = 'bg-info bg-opacity-10 text-info'; }
            if (destinoText === 'docentes') { destinoIcon = 'fa-chalkboard-user'; destinoBg = 'bg-warning bg-opacity-10 text-warning'; }
            if (destinoText === 'secretario') { destinoIcon = 'fa-file-signature'; destinoBg = 'bg-success bg-opacity-10 text-success'; }

            let estadoClass = notif.activa == 1 || notif.activa === 'true' || notif.activa === true ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger';
            let estadoText = notif.activa == 1 || notif.activa === 'true' || notif.activa === true ? 'Activa' : 'Inactiva';

            tr.style.cursor = "pointer";
            tr.onclick = () => editarNotificacion(notif.id);

            tr.innerHTML = `
                <td>${notif.id}</td>
                <td><span class="fw-bold text-dark">${notif.nombre}</span></td>
                <td><span class="text-muted small d-inline-block text-truncate" style="max-width: 250px;">${notif.mensaje}</span></td>
                <td><span class="badge rounded-pill px-3 py-2 ${destinoBg}"><i class="fa-solid ${destinoIcon} me-1"></i> ${destinoText}</span></td>
                <td><span class="badge rounded-pill px-3 py-2 ${estadoClass}">${estadoText}</span></td>
            `;
            contenedor.appendChild(tr);
        });
    } catch (error) {
        console.warn("Error al cargar notificaciones (API no lista):", error);
        contenedor.innerHTML = `<tr><td colspan='5' class='text-center text-muted py-5'>
                <i class="fa-solid fa-plug-circle-exclamation fs-2 mb-3 opacity-25"></i>
                <p class="mb-0">Esperando conexión con el backend...</p>
            </td></tr>`;
    }
}

function limpiarFormularioNotificacion() {
    const form = document.getElementById("formNotificacion");
    if (form) form.reset();
    document.getElementById("idNotificacionForm").value = "";
    document.getElementById("tituloModalNotificacion").innerHTML = '<i class="fa-solid fa-bell text-primary me-2"></i> Nueva Notificación';
    document.getElementById("btnEliminarNotificacion").style.display = "none";

    const divIdDestino = document.getElementById('div_notif_idDestino');
    if (divIdDestino) divIdDestino.style.display = 'none';
}

async function editarNotificacion(id) {
    try {
        const respuesta = await fetch(`/api/notificaciones/${id}`);
        if (!respuesta.ok) throw new Error("Notificación no encontrada");

        const notif = await respuesta.json();

        document.getElementById("idNotificacionForm").value = notif.id;
        document.getElementById("notif_titulo").value = notif.nombre || "";
        document.getElementById("notif_mensaje").value = notif.mensaje || "";
        document.getElementById("notif_destino").value = notif.destino || "todos";
        document.getElementById("notif_estado").value = (notif.activa == 1 || notif.activa === 'true' || notif.activa === true) ? "1" : "0";

        const notifDestino = document.getElementById("notif_destino");
        if (notifDestino) {
            notifDestino.dispatchEvent(new Event('change'));
        }

        const idDestinoEl = document.getElementById("notif_idDestino");
        if (idDestinoEl && notif.destino === 'individual') {
            await llenarSelectAspirantes();
            idDestinoEl.value = notif.idDestino || "";
        }

        document.getElementById("tituloModalNotificacion").innerHTML = '<i class="fa-solid fa-pen-to-square text-warning me-2"></i> Editar Notificación';

        const btnEliminar = document.getElementById("btnEliminarNotificacion");
        if (btnEliminar) {
            btnEliminar.style.display = "inline-block";
        }

        // Abrir el Modal de Bootstrap
        const modalElement = document.getElementById("modalNotificacion");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

    } catch (error) {
        console.warn("API de edición de notificaciones no lista:", error);
        Swal.fire('Error', 'La API para obtener la notificación falló.', 'error');
    }
}

document.getElementById("formNotificacion")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idNotificacionForm").value;
    const nombre = document.getElementById("notif_titulo").value;
    const mensaje = document.getElementById("notif_mensaje").value;
    const activa = document.getElementById("notif_estado").value;
    const destino = document.getElementById("notif_destino").value;

    let idDestino = null;
    const idDestinoEl = document.getElementById("notif_idDestino");
    if (idDestinoEl && idDestinoEl.value.trim() !== "") {
        idDestino = idDestinoEl.value.trim();
    }

    let rolRemitente = "ADMIN";
    let nombreRemitente = "Administrador del Sistema";
    try {
        const usr = JSON.parse(sessionStorage.getItem("usuario"));
        if (usr) {
            rolRemitente = usr.rol || "ADMIN";
            nombreRemitente = `${usr.nombre || ''} ${usr.primerApellido || ''}`.trim() || "Administrador del Sistema";
        }
    } catch (e) { }

    const datosNotif = { nombre, mensaje, destino, activa, rolRemitente, nombreRemitente, idDestino };
    const token = sessionStorage.getItem("token") || "";

    try {
        let url = "/api/notificaciones";
        let metodo = "POST";

        if (idInput && idInput.trim() !== "") {
            url = `/api/notificaciones/${idInput}`;
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
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: resultado.mensaje || 'Notificación guardada',
                showConfirmButton: false,
                timer: 3000
            });

            limpiarFormularioNotificacion();
            cargarNotificacionesAdmin();

            // Cerrar el modal
            const modalElement = document.getElementById('modalNotificacion');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        } else {
            Swal.fire('Error', resultado.mensaje || 'No se pudo guardar.', 'error');
        }
    } catch (error) {
        console.warn("API de guardar notificaciones no lista:", error);
        Swal.fire('Error de red', 'La conexión falló.', 'error');
    }
});

async function eliminarNotificacion(id) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar Aviso?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const token = sessionStorage.getItem("token") || "";

    try {
        const respuesta = await fetch(`/api/notificaciones/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            Swal.fire('Eliminado', 'Notificación eliminada.', 'success');

            // Cerrar modal si está abierto (ya que el botón de eliminar también vive allí)
            const modalElement = document.getElementById('modalNotificacion');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            limpiarFormularioNotificacion();
            cargarNotificacionesAdmin();
        } else {
            Swal.fire('Error', resultado.mensaje || "No se pudo eliminar.", 'error');
        }
    } catch (error) {
        console.warn("API de eliminar notificaciones no lista:", error);
        alert("Ocurrió un error al intentar eliminar la notificación. (API no implementada)");
    }
}

async function llenarSelectAspirantes() {
    const select = document.getElementById('notif_idDestino');
    if (!select || select.options.length > 1) return;

    try {
        const respuesta = await fetch('/api/aspirante');
        if (!respuesta.ok) return;
        const aspirantes = await respuesta.json();

        let html = '<option value="">Seleccione un aspirante...</option>';
        for (const asp of aspirantes) {
            const nombre = `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim();
            if (asp.idUsuario) {
                html += `<option value="${asp.idUsuario}">${nombre}</option>`;
            }
        }
        select.innerHTML = html;
    } catch (e) {
        console.warn('Error al cargar aspirantes en el select:', e);
    }
}

document.getElementById('notif_destino')?.addEventListener('change', async function (e) {
    const divIdDestino = document.getElementById('div_notif_idDestino');
    if (!divIdDestino) return;

    if (e.target.value === 'individual') {
        divIdDestino.style.display = 'block';
        await llenarSelectAspirantes();
    } else {
        divIdDestino.style.display = 'none';
        const selectDestino = document.getElementById('notif_idDestino');
        if (selectDestino) selectDestino.value = '';
    }
});
