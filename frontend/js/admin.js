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
    } else if (currentHash === 'solicitudes') {
        if (typeof cargarSolicitudesAdmin === 'function') cargarSolicitudesAdmin();
    } else if (currentHash === 'documentos') {
        if (typeof cargarExploradorDocumentos === 'function') cargarExploradorDocumentos();
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
    cargarPosgradosAdmin(); // Inicializar tarjetas de posgrado
    cargarPosgradosEnSelect();
    cargarOpcionesPosgradoGlobal();
    cargarAspirantes();
    cargarSolicitudesAdmin(); // Inicializar panel de solicitudes
    cargarNotificacionesAdmin(); // Inicializar panel de notificaciones
    cargarCatalogoRequisitosUI(); // Inicializar catálogo de requisitos
    cargarExploradorDocumentos(); // Inicializar explorador de documentos
    inicializarFlatpickr();

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
        Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'Sesión inválida o expirada. Por favor, inicie sesión.',
            confirmButtonColor: '#8a1c24'
        }).then(() => {
            sessionStorage.clear();
            window.location.href = "login.html";
        });
        return;
    }
}

function mostrarAdministrador() {
    let usuario = JSON.parse(sessionStorage.getItem("usuario"));
    if (!usuario) return; // Si no hay usuario, validarSesion() ya se encargó de redirigir al login

    const nombreMostrado = usuario.nombre || usuario.correo.split('@')[0];
    const topbarFirstName = document.getElementById("topbar-first-name");
    const topbarIniciales = document.getElementById("topbar-iniciales");

    if (topbarFirstName) {
        topbarFirstName.textContent = nombreMostrado.split(' ')[0];
    }

    if (topbarIniciales) {
        topbarIniciales.textContent = nombreMostrado.substring(0, 2).toUpperCase();
    }

    // Actualizar información en el menú desplegable (perfil)
    const menuNombre = document.getElementById("menu-nombre-admin");
    const menuCorreo = document.getElementById("menu-correo-admin");

    if (menuNombre) menuNombre.textContent = nombreMostrado;
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
            document.querySelector("#modalUsuario .modal-title").textContent = 'Nuevo Usuario';
            const btnEliminar = document.getElementById("btnEliminarUsuario");
            if (btnEliminar) btnEliminar.style.display = "none";
        });
    }


}



function activarSeccionPorHash() {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const enlaces = document.querySelectorAll("#sidebarMenu .nav-link");
    const secciones = document.querySelectorAll(".view-section");
    const tituloSeccion = document.getElementById("seccion-titulo");

    // Remover estado activo de todos los enlaces en el menú
    enlaces.forEach(link => link.classList.remove("active"));

    // Ocultar todas las secciones del contenido y quitar fade-in
    secciones.forEach(sec => {
        sec.classList.remove("active");
        sec.classList.remove("fade-in");
    });

    // Activar el enlace correspondiente
    const enlaceActivo = document.querySelector(`#sidebarMenu .nav-link[data-target="${hash}"]`);
    if (enlaceActivo) {
        enlaceActivo.classList.add("active");

        // Actualizar el título dinámicamente basado en el texto del enlace
        const textoEnlace = enlaceActivo.querySelector(".text") ? enlaceActivo.querySelector(".text").textContent.trim() : enlaceActivo.textContent.trim();
        if (tituloSeccion) {
            if (hash === "dashboard") {
                tituloSeccion.textContent = "Panel de Administración";
            } else {
                tituloSeccion.textContent = textoEnlace;
            }
        }
    }

    // Mostrar la sección correspondiente en el HTML con fade-in
    const seccionMostrar = document.getElementById(`seccion-${hash}`);
    if (seccionMostrar) {
        seccionMostrar.classList.add("active");
        void seccionMostrar.offsetWidth; // Trigger reflow for animation
        seccionMostrar.classList.add("fade-in");
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

let usuariosGlobalesAdmin = [];

async function cargarUsuarios() {
    mostrarLoader();
    try {
        const respuesta = await fetch("/api/usuario");
        usuariosGlobalesAdmin = await respuesta.json();

        // Actualizar contador del dashboard
        const totalUsuarios = document.getElementById("totalUsuarios");
        if (totalUsuarios) totalUsuarios.textContent = (usuariosGlobalesAdmin || []).length || 0;

        renderizarTablaUsuarios();
    } catch (error) {
        console.error("Error en cargarUsuarios:", error);
    } finally {
        ocultarLoader();
    }
}

function renderizarTablaUsuarios() {
    const tbody = document.getElementById("tablaUsuarios");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filtroRol = (document.getElementById("filtro-usuarios-rol")?.value || "").toUpperCase();

    const filtrados = (usuariosGlobalesAdmin || []).filter(u => {
        if (!filtroRol) return true;
        const uRol = (u.rol || "").toUpperCase();
        return uRol === filtroRol;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i> No hay usuarios registrados con el rol seleccionado.</td></tr>`;
        return;
    }

    filtrados.forEach(usuario => {
        const fila = document.createElement("tr");

        fila.style.cursor = "pointer";
        fila.onclick = () => editarUsuario(usuario.id);

        const ini = (usuario.correo || 'U').charAt(0).toUpperCase();

        fila.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="table-avatar">${ini}</div>
                    <span class="fw-bold" style="color: var(--color-text);">${usuario.correo}</span>
                </div>
            </td>
            <td><span class="soft-badge soft-badge-primary">${usuario.rol || 'Usuario'}</span></td>
            <td><span class="soft-badge ${usuario.activo ? 'soft-badge-success' : 'soft-badge-danger'}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary rounded-circle" style="width: 32px; height: 32px; padding: 0;">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

window.filtrarUsuariosUI = function () {
    renderizarTablaUsuarios();
};

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

        document.querySelector("#modalUsuario .modal-title").textContent = 'Editar Usuario';

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
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los datos del usuario.', confirmButtonColor: '#ef4444' });
    }
}

// Renderizar campos según el rol
function renderizarCamposRol(rol, detalles = {}) {
    const contenedorBtn = document.getElementById("contenedorBtnDetalles");
    const contenedorDetalles = document.getElementById("detallesExtendidos");

    let html = "";
    const inputStyle = `style="background: var(--color-input-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 8px;"`;
    const labelStyle = `style="color: var(--color-text-muted); font-weight: 600;"`;

    if (rol === "ASPIRANTE") {
        html = `
            <h6 class="fw-bold mb-3" style="color: var(--color-primary);"><i class="fa-solid me-2"></i> Detalles de Aspirante</h6>
            <div class="row custom-scroll" style="max-height: 390px; overflow-y: auto; overflow-x: hidden; padding-right: 8px;">
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Nombre <span class="text-danger">*</span></label><input type="text" id="det_nombre" class="form-control form-control-sm" ${inputStyle} value="${detalles.nombre || ''}" placeholder="Solo letras" oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]/g, '')"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Primer Apellido <span class="text-danger">*</span></label><input type="text" id="det_primerApellido" class="form-control form-control-sm" ${inputStyle} value="${detalles.primerApellido || ''}" placeholder="Solo letras" oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]/g, '')"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Segundo Apellido</label><input type="text" id="det_segundoApellido" class="form-control form-control-sm" ${inputStyle} value="${detalles.segundoApellido || ''}" placeholder="Solo letras" oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]/g, '')"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>CURP <span class="text-danger">*</span></label><input type="text" id="det_curp" class="form-control form-control-sm" ${inputStyle} value="${detalles.curp || ''}" maxlength="18" placeholder="18 caracteres" style="text-transform: uppercase;" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '')"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>RFC <span class="text-danger">*</span></label><input type="text" id="det_rfc" class="form-control form-control-sm" ${inputStyle} value="${detalles.rfc || ''}" maxlength="13" placeholder="12 ó 13 caracteres" style="text-transform: uppercase;" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '')"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Teléfono <span class="text-danger">*</span></label><input type="text" id="det_telefono" class="form-control form-control-sm" ${inputStyle} value="${detalles.telefono || ''}" maxlength="10" placeholder="10 dígitos" oninput="this.value = this.value.replace(/[^0-9]/g, '')"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Fecha Nacimiento <span class="text-danger">*</span></label><input type="date" id="det_fechaNacimiento" class="form-control form-control-sm" ${inputStyle} value="${detalles.fechaNacimiento ? detalles.fechaNacimiento.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2">
                    <label class="form-label small" ${labelStyle}>Estado Civil</label>
                    <select id="det_estadoCivil" class="form-select form-select-sm" ${inputStyle}>
                        <option value="SOLTERO" ${detalles.estadoCivil === 'SOLTERO' ? 'selected' : ''}>Soltero</option>
                        <option value="CASADO" ${detalles.estadoCivil === 'CASADO' ? 'selected' : ''}>Casado</option>
                        <option value="UNION_LIBRE" ${detalles.estadoCivil === 'UNION_LIBRE' ? 'selected' : ''}>Unión Libre</option>
                        <option value="DIVORCIADO" ${detalles.estadoCivil === 'DIVORCIADO' ? 'selected' : ''}>Divorciado</option>
                        <option value="SEPARADO" ${detalles.estadoCivil === 'SEPARADO' ? 'selected' : ''}>Separado</option>
                        <option value="VIUDO" ${detalles.estadoCivil === 'VIUDO' ? 'selected' : ''}>Viudo</option>
                    </select>
                </div>
                <div class="col-md-8 mb-2"><label class="form-label small" ${labelStyle}>Dirección</label><input type="text" id="det_direccion" class="form-control form-control-sm" ${inputStyle} value="${detalles.direccion || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Código Postal</label><input type="text" id="det_direccionPostal" class="form-control form-control-sm" ${inputStyle} value="${detalles.direccionPostal || ''}" maxlength="5" placeholder="5 dígitos" oninput="this.value = this.value.replace(/[^0-9]/g, '')"></div>
                
                <h6 class="fw-bold mt-4 mb-3 w-100 border-bottom pb-2" style="color: var(--color-text) !important; border-color: var(--color-border) !important;"><i class="fa-solid fa-graduation-cap me-2"></i> Antecedentes Académicos</h6>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Licenciatura <span class="text-danger">*</span></label><input type="text" id="det_licenciatura" class="form-control form-control-sm" ${inputStyle} value="${detalles.licenciatura || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Institución (Licenciatura) <span class="text-danger">*</span></label><input type="text" id="det_institucionLicenciatura" class="form-control form-control-sm" ${inputStyle} value="${detalles.institucionLicenciatura || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Fecha de Egreso <span class="text-danger">*</span></label><input type="date" id="det_fechaEgreso" class="form-control form-control-sm" ${inputStyle} value="${detalles.fechaEgreso ? detalles.fechaEgreso.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Fecha de Titulación <span class="text-danger">*</span></label><input type="date" id="det_fechaTitulacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.fechaTitulacion ? detalles.fechaTitulacion.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Promedio <span class="text-danger">*</span></label><input type="number" step="0.01" min="0" max="10" id="det_promedio" class="form-control form-control-sm" ${inputStyle} value="${detalles.promedio || ''}" placeholder="0.0 - 10.0"></div>
                <div class="col-md-12 mb-2"><label class="form-label small" ${labelStyle}>Otros Estudios</label><input type="text" id="det_otrosEstudios" class="form-control form-control-sm" ${inputStyle} value="${detalles.otrosEstudios || ''}"></div>

                <h6 class="fw-bold mt-3 mb-2 w-100 border-bottom pb-1" style="color: var(--color-text) !important; border-color: var(--color-border) !important;"><i class="fa-solid fa-briefcase me-2"></i> Ocupación</h6>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Ocupación Actual</label><input type="text" id="det_ocupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.ocupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Teléfono (Ocupación)</label><input type="text" id="det_telefonoOcupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.telefonoOcupacion || ''}" maxlength="10" placeholder="10 dígitos" oninput="this.value = this.value.replace(/[^0-9]/g, '')"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Ciudad (Ocupación)</label><input type="text" id="det_ciudadOcupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.ciudadOcupacion || ''}" oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.]/g, '')"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Estado (Ocupación)</label><input type="text" id="det_estadoOcupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.estadoOcupacion || ''}" oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s.]/g, '')"></div>
            </div>
        `;
        contenedorBtn.style.display = "block";
    } else if (rol === "DOCENTE") {
        html = `
            <h6 class="fw-bold mb-3" style="color: var(--color-primary);"><i class="fa-solid fa-chalkboard-user me-2"></i> Detalles de Docente</h6>
            <div class="row">
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Nombre</label><input type="text" id="det_nombre" class="form-control form-control-sm" ${inputStyle} value="${detalles.nombre || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Primer Apellido</label><input type="text" id="det_primerApellido" class="form-control form-control-sm" ${inputStyle} value="${detalles.primerApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Segundo Apellido</label><input type="text" id="det_segundoApellido" class="form-control form-control-sm" ${inputStyle} value="${detalles.segundoApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Cargo</label><input type="text" id="det_cargo" class="form-control form-control-sm" ${inputStyle} value="${detalles.cargo || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Especialidad</label><input type="text" id="det_especialidad" class="form-control form-control-sm" ${inputStyle} value="${detalles.especialidad || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Cubículo</label><input type="text" id="det_cubiculo" class="form-control form-control-sm" ${inputStyle} value="${detalles.cubiculo || ''}"></div>
            </div>
        `;
        contenedorBtn.style.display = "block";
    } else if (rol === "SECRETARIO") {
        html = `
            <h6 class="fw-bold mb-3" style="color: var(--color-primary);"><i class="fa-solid fa-user-tie me-2"></i> Detalles de Secretario</h6>
            <div class="row">
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Área</label><input type="text" id="det_area" class="form-control form-control-sm" ${inputStyle} value="${detalles.area || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Extensión</label><input type="text" id="det_extension" class="form-control form-control-sm" ${inputStyle} value="${detalles.extension || ''}"></div>
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
        document.querySelector("#modalUsuario .modal-title").textContent = 'Nuevo Usuario';
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
            rfc: document.getElementById("det_rfc")?.value,
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

        const requiredAspirante = [
            { id: 'nombre', label: 'Nombre' },
            { id: 'primerApellido', label: 'Primer Apellido' },
            { id: 'curp', label: 'CURP' },
            { id: 'rfc', label: 'RFC' },
            { id: 'telefono', label: 'Teléfono' },
            { id: 'fechaNacimiento', label: 'Fecha Nacimiento' },
            { id: 'licenciatura', label: 'Licenciatura' },
            { id: 'institucionLicenciatura', label: 'Institución (Licenciatura)' },
            { id: 'fechaEgreso', label: 'Fecha de Egreso' },
            { id: 'fechaTitulacion', label: 'Fecha de Titulación' },
            { id: 'promedio', label: 'Promedio' }
        ];

        let faltan = [];
        requiredAspirante.forEach(campo => {
            if (!detalles[campo.id] || detalles[campo.id].trim() === '') faltan.push(campo.label);
        });

        if (faltan.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor complete los siguientes campos obligatorios del aspirante:\n- ' + faltan.join('\n- '),
                confirmButtonColor: '#f59e0b'
            });
            const contDetalles = document.getElementById("detallesExtendidos");
            if (contDetalles && contDetalles.style.width === "0px") {
                toggleDetallesUsuario();
            }
            return;
        }

        // Validación con Expresiones Regulares (Regex) para Aspirantes
        const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        const regexCurp = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/;
        const regexTelefono = /^\d{10}$/;
        const regexCP = /^\d{5}$/;

        let erroresRegex = [];

        if (detalles.nombre && !regexLetras.test(detalles.nombre)) {
            erroresRegex.push('Nombre: Solo debe contener letras y espacios (sin números).');
        }
        if (detalles.primerApellido && !regexLetras.test(detalles.primerApellido)) {
            erroresRegex.push('Primer Apellido: Solo debe contener letras y espacios (sin números).');
        }
        if (detalles.segundoApellido && detalles.segundoApellido.trim() !== '' && !regexLetras.test(detalles.segundoApellido)) {
            erroresRegex.push('Segundo Apellido: Solo debe contener letras y espacios.');
        }
        if (detalles.curp && !regexCurp.test(detalles.curp.toUpperCase())) {
            erroresRegex.push('CURP: Formato inválido. Debe contener 18 caracteres (ej. ABCD123456HDFXXX01).');
        }
        const regexRfc = /^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/;
        if (detalles.rfc && !regexRfc.test(detalles.rfc.toUpperCase())) {
            erroresRegex.push('RFC: Formato inválido. Debe contener 12 ó 13 caracteres (ej. ABCD123456XXX).');
        }
        if (detalles.telefono && !regexTelefono.test(detalles.telefono)) {
            erroresRegex.push('Teléfono: Debe contener exactamente 10 dígitos numéricos.');
        }
        if (detalles.telefonoOcupacion && detalles.telefonoOcupacion.trim() !== '' && !regexTelefono.test(detalles.telefonoOcupacion)) {
            erroresRegex.push('Teléfono (Ocupación): Debe contener 10 dígitos numéricos.');
        }
        if (detalles.direccionPostal && detalles.direccionPostal.trim() !== '' && !regexCP.test(detalles.direccionPostal)) {
            erroresRegex.push('Código Postal: Debe contener 5 dígitos numéricos.');
        }

        const promVal = parseFloat(detalles.promedio);
        if (isNaN(promVal) || promVal < 0 || promVal > 10) {
            erroresRegex.push('Promedio: Debe ser un valor numérico entre 0.0 y 10.0.');
        }

        if (erroresRegex.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Formato de datos inválido',
                html: '<div class="text-start"><b>Por favor corrige lo siguiente:</b><br><ul class="mt-2 mb-0"><li>' + erroresRegex.join('</li><li>') + '</li></ul></div>',
                confirmButtonColor: '#f59e0b'
            });
            const contDetalles = document.getElementById("detallesExtendidos");
            if (contDetalles && contDetalles.style.width === "0px") {
                toggleDetallesUsuario();
            }
            return;
        }
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
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: resultado.mensaje || 'Operación realizada con éxito',
                timer: 1500,
                showConfirmButton: false
            });

            const modalElement = document.getElementById("modalUsuario");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            document.getElementById("formUsuario").reset();
            if (idInput) idInput.value = "";
            document.querySelector("#modalUsuario .modal-title").textContent = 'Nuevo Usuario';
            const btnElim = document.getElementById("btnEliminarUsuario");
            if (btnElim) btnElim.style.display = "none";

            cargarUsuarios();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: resultado.mensaje || 'Hubo un error al procesar la solicitud.', confirmButtonColor: '#ef4444' });
        }

    } catch (error) {
        console.error("Error al guardar el usuario:", error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error en la conexión con el servidor.', confirmButtonColor: '#ef4444' });
    }
});

async function eliminarUsuario(id) {
    const confirmacion = await Swal.fire({
        title: 'Eliminar usuario',
        text: `¿Está seguro de eliminar al usuario con ID: ${id}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

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
            Swal.fire({
                icon: 'success',
                title: 'Usuario eliminado',
                text: resultado.mensaje || 'Usuario eliminado con éxito.',
                timer: 1500,
                showConfirmButton: false
            });
            const modalElement = document.getElementById("modalUsuario");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            cargarUsuarios();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: resultado.mensaje || 'No se pudo eliminar el usuario.', confirmButtonColor: '#ef4444' });
        }

    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error al intentar eliminar el usuario.', confirmButtonColor: '#ef4444' });
    }
}

// ==========================================
// MÓDULO CONVOCATORIAS
// ==========================================

let convocatoriasGlobalesAdmin = [];

async function cargarConvocatorias() {
    const contenedor = document.getElementById("contenedorConvocatorias");
    const totalConvocatorias = document.getElementById("totalConvocatorias");

    if (!contenedor) return;

    mostrarLoader();
    try {
        const respuesta = await fetch("/api/convocatorias");

        // Si el endpoint no existe o falla, detenemos el renderizado
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        convocatoriasGlobalesAdmin = await respuesta.json();

        if (totalConvocatorias) {
            totalConvocatorias.textContent = (convocatoriasGlobalesAdmin || []).length || 0;
        }

        renderizarGridConvocatorias();
    } catch (error) {
        console.error("Error en cargarConvocatorias:", error);
        contenedor.innerHTML = "<p class='text-muted' style='grid-column: 1 / -1;'>Esperando API de convocatorias...</p>";
    } finally {
        ocultarLoader();
    }
}

function renderizarGridConvocatorias() {
    const contenedor = document.getElementById("contenedorConvocatorias");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const filtroEstado = (document.getElementById("filtro-convocatoria-estado")?.value || "").toLowerCase();
    const filtroPrograma = (document.getElementById("filtro-convocatoria-programa")?.value || "").toLowerCase();

    const filtradas = (convocatoriasGlobalesAdmin || []).filter(conv => {
        const estado = (conv.estado || "").toLowerCase();
        const nombre = (conv.nombre || "").toLowerCase();

        let matchEstado = true;
        if (filtroEstado) {
            if (filtroEstado === 'borrador') {
                matchEstado = estado.includes('borrador') || estado.includes('inactiv') || (estado !== 'activa' && estado !== 'evaluacion');
            } else {
                matchEstado = estado.includes(filtroEstado);
            }
        }

        let matchPrograma = true;
        if (filtroPrograma) {
            matchPrograma = nombre.includes(filtroPrograma);
        }

        return matchEstado && matchPrograma;
    });

    if (filtradas.length === 0) {
        contenedor.innerHTML = "<p class='text-muted text-center py-4' style='grid-column: 1 / -1;'><i class='fa-solid fa-inbox me-2'></i> No hay convocatorias que coincidan con los filtros seleccionados.</p>";
        return;
    }

    filtradas.forEach(conv => {
        let colorEstado = "#6c757d"; // Borrador / Cerrada
        if (conv.estado === "Activa") colorEstado = "#2ecc71";
        if (conv.estado === "Evaluacion") colorEstado = "#f1c40f";

        const card = document.createElement("div");
        card.className = "card p-3 shadow-sm text-center";
        card.style.cursor = "pointer";
        card.style.transition = "box-shadow 0.2s";
        const fechaInicioFormateada = new Date(conv.fecha_inicio).toLocaleDateString('es-MX');
        const fechaFinFormateada = new Date(conv.fecha_fin).toLocaleDateString('es-MX');
        card.onclick = () => editarConvocatoria(conv.id);

        card.innerHTML = `
            <div class="mb-2" style="font-size: 2.5rem; color: #9b59b6;">
                <i class="fa-solid fa-file-invoice"></i>
            </div>
            <h5 class="mb-1 fw-semibold" style="color: var(--color-text);">${conv.nombre}</h5>
            <p class="mb-2 text-muted" style="font-size:0.9rem;">${fechaInicioFormateada} a ${fechaFinFormateada}</p>
            <div>
                <span class="badge" style="background-color: ${colorEstado}; font-size:0.8rem;">${conv.estado}</span>
            </div>
        `;

        contenedor.appendChild(card);
    });
}

window.filtrarConvocatoriasUI = function () {
    renderizarGridConvocatorias();
};

let todosLosPosgrados = [];
async function cargarPosgradosEnSelect() {
    try {
        const respuesta = await fetch("/api/posgrado");
        if (!respuesta.ok) return;
        const posgrados = await respuesta.json();
        const select = document.getElementById("convocatoria_posgrado");
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione un posgrado...</option>';
        if (Array.isArray(posgrados)) {
            todosLosPosgrados = posgrados;
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

let todasLasOpcionesPosgrado = [];
async function cargarOpcionesPosgradoGlobal() {
    try {
        const respuesta = await fetch("/api/posgrado/opciones");
        if (respuesta.ok) {
            todasLasOpcionesPosgrado = await respuesta.json();
        }
    } catch (error) {
        console.error("Error al cargar opciones posgrado:", error);
    }
}

function inicializarFlatpickr() {
    const configSingle = {
        dateFormat: "Y-m-d",
        locale: "es",
        allowInput: true
    };
    flatpickr(".date-single", configSingle);
}

function renderizarOpcionesPorPosgrado(posgradoId, opcionesSeleccionadasPrevias = [], esEdicion = false) {
    const container = document.getElementById("contenedorOpcionesPosgrado");
    if (!container) return;

    if (!posgradoId) {
        container.innerHTML = '<p class="text-muted small mb-0"><i class="fa-solid fa-circle-info me-1"></i> Selecciona un posgrado para ver y gestionar sus especialidades.</p>';
        return;
    }

    // Actualizar campos mostrados según el tipo de posgrado
    const posgrado = todosLosPosgrados.find(p => p.id == posgradoId);
    if (posgrado) {
        toggleCamposPorTipo(posgrado.tipo);
    }

    const opcionesPosgrado = todasLasOpcionesPosgrado.filter(op => op.posgrado_id == posgradoId);

    if (opcionesPosgrado.length === 0) {
        container.innerHTML = '<p class="text-muted small mb-0">Este posgrado no tiene especialidades o líneas de investigación registradas.</p>';
        return;
    }

    let html = '<div class="d-flex flex-column gap-2">';
    opcionesPosgrado.forEach(op => {
        const prev = opcionesSeleccionadasPrevias.find(s => s.idOpcionPosgrado == op.id || s.opcion_posgrado_id == op.id);
        const estaChecked = esEdicion ? !!prev : true;
        const cuposVal = prev && prev.cupos !== undefined && prev.cupos !== null ? prev.cupos : '';

        html += `
            <div class="d-flex justify-content-between align-items-center p-2 rounded border" style="background: var(--color-card-bg); border-color: var(--color-border) !important;">
                <div class="form-check mb-0">
                    <input class="form-check-input opc-checkbox" type="checkbox" value="${op.id}" id="opc_${op.id}" ${estaChecked ? 'checked' : ''}>
                    <label class="form-check-label fw-semibold text-wrap" for="opc_${op.id}" style="cursor:pointer; color: var(--color-text); font-size: 0.9rem;">
                        ${op.nombre}
                    </label>
                </div>
                <div class="d-flex align-items-center gap-2" style="width: 140px;">
                    <span class="small text-muted" style="font-size: 0.75rem;">Cupos:</span>
                    <input type="number" min="0" class="form-control form-control-sm cupo-input text-center" id="cupos_opc_${op.id}" placeholder="Ilimitado" value="${cuposVal}" style="background: var(--color-input-bg); color: var(--color-text); border: 1px solid var(--color-border);">
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

document.getElementById("convocatoria_posgrado")?.addEventListener("change", (e) => {
    renderizarOpcionesPorPosgrado(e.target.value, [], false);
});

function toggleCamposPorTipo(tipo) {
    const grupoEntrevistas = document.getElementById("grupo_entrevistas");
    const grupoAcademicas = document.getElementById("grupo_fechas_academicas");

    if (tipo === "MAESTRIA") {
        // Ocultar entrevistas y limpiar
        if (grupoEntrevistas) grupoEntrevistas.style.display = "none";

        const f1 = document.getElementById("convocatoria_fechaEntrevistaInicio")?._flatpickr;
        if (f1) f1.clear();
        const f2 = document.getElementById("convocatoria_fechaEntrevistaFin")?._flatpickr;
        if (f2) f2.clear();

        // Mostrar académicas
        if (grupoAcademicas) grupoAcademicas.style.display = "block";
    } else if (tipo === "DOCTORADO") {
        // Mostrar entrevistas
        if (grupoEntrevistas) grupoEntrevistas.style.display = "block";

        // Ocultar académicas y limpiar
        if (grupoAcademicas) grupoAcademicas.style.display = "none";

        ["convocatoria_inicioCurso", "convocatoria_finCurso", "convocatoria_inicioExamen", "convocatoria_finExamen"].forEach(id => {
            const fp = document.getElementById(id)?._flatpickr;
            if (fp) fp.clear();
        });
    }
}

function limpiarFormularioConvocatoria() {
    document.getElementById("formConvocatoria").reset();
    document.getElementById("idConvocatoriaForm").value = "";
    document.getElementById("convocatoria_posgrado").value = "";
    document.getElementById("tituloModalConvocatoria").innerHTML = '<i class="fa-solid fa-bullhorn"></i> Nueva Convocatoria';
    document.getElementById("btnEliminarConvocatoria").style.display = "none";
    toggleCamposPorTipo();

    const container = document.getElementById("contenedorOpcionesPosgrado");
    if (container) {
        container.innerHTML = '<p class="text-muted small mb-0"><i class="fa-solid fa-circle-info me-1"></i> Selecciona un posgrado para ver y gestionar sus especialidades.</p>';
    }

    // Desmarcar todos los checkboxes del catálogo
    const checkboxes = document.querySelectorAll("#contenedorRequisitos .req-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = false;
        const oblCb = document.getElementById(`obligatorio_${cb.value}`);
        if (oblCb) oblCb.checked = false;
    });
}

// Variables y Funciones del Wizard (Stepper)
let pasoActualConvocatoria = 1;
const totalPasosConvocatoria = 4;

function actualizarWizard(paso) {
    pasoActualConvocatoria = paso;

    // Ocultar todos los panes
    document.querySelectorAll('.step-pane').forEach(pane => pane.classList.remove('active'));
    // Desactivar todos los indicators
    document.querySelectorAll('.step-indicator').forEach(ind => {
        ind.classList.remove('active');
        ind.classList.remove('completed');
    });

    // Mostrar el pane actual
    const pane = document.getElementById(`step-pane-${paso}`);
    if (pane) pane.classList.add('active');

    // Actualizar indicators
    for (let i = 1; i <= totalPasosConvocatoria; i++) {
        const ind = document.getElementById(`indicator-${i}`);
        if (!ind) continue;
        if (i < paso) {
            ind.classList.add('completed');
        } else if (i === paso) {
            ind.classList.add('active');
        }
    }

    // Actualizar visibilidad de botones
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');
    const btnSave = document.getElementById('btnSaveConvocatoria');

    if (btnPrev) btnPrev.style.display = (paso === 1) ? 'none' : 'inline-block';

    if (paso === totalPasosConvocatoria) {
        if (btnNext) btnNext.style.display = 'none';
        if (btnSave) btnSave.style.display = 'inline-block';
    } else {
        if (btnNext) btnNext.style.display = 'inline-block';
        if (btnSave) btnSave.style.display = 'none';
    }
}

function validarPasoActual() {
    const paneActual = document.getElementById(`step-pane-${pasoActualConvocatoria}`);
    if (!paneActual) return true;
    const inputsRequeridos = paneActual.querySelectorAll('input[required], select[required], textarea[required]');

    for (let input of inputsRequeridos) {
        if (!input.value || !input.value.trim()) {
            input.reportValidity(); // Muestra el tooltip nativo de HTML5
            return false;
        }
    }
    return true;
}

window.irAlPaso = function (paso) {
    if (paso === pasoActualConvocatoria) return;
    if (paso > pasoActualConvocatoria) {
        if (!validarPasoActual()) return;
    }
    actualizarWizard(paso);
};

window.siguientePaso = function () {
    if (!validarPasoActual()) return;
    if (pasoActualConvocatoria < totalPasosConvocatoria) {
        actualizarWizard(pasoActualConvocatoria + 1);
    }
}

window.pasoAnterior = function () {
    if (pasoActualConvocatoria > 1) {
        actualizarWizard(pasoActualConvocatoria - 1);
    }
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
            div.className = "d-flex justify-content-between align-items-center mb-2 p-2 border rounded";
            div.style.cssText = "background: var(--color-card-bg); border-color: var(--color-border) !important; color: var(--color-text);";

            div.innerHTML = `
                <div class="form-check mb-0">
                    <input class="form-check-input req-checkbox" type="checkbox" value="${req.id}" id="req_${req.id}">
                    <label class="form-check-label" for="req_${req.id}" style="cursor:pointer; color: var(--color-text);">
                        ${req.nombre}
                    </label>
                </div>
                <div class="form-check form-switch mb-0" style="margin-left: 10px;">
                    <input class="form-check-input req-obligatorio" type="checkbox" id="obligatorio_${req.id}">
                    <label class="form-check-label small" for="obligatorio_${req.id}" style="cursor:pointer; color: var(--color-text-muted);">Obligatorio</label>
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
        document.getElementById("convocatoria_nombre").value = conv.nombre || "";
        document.getElementById("convocatoria_descripcion").value = conv.descripcion || "";
        document.getElementById("convocatoria_estado").value = conv.estado || "Borrador";
        document.getElementById("convocatoria_modalidad").value = conv.modalidad || "Escolarizada";
        document.getElementById("convocatoria_duracion").value = conv.duracion || "";

        const setSingle = (id, val) => {
            const el = document.getElementById(id);
            if (!el || !el._flatpickr) return;
            if (val) el._flatpickr.setDate(val.split('T')[0]);
            else el._flatpickr.clear();
        };

        setSingle("convocatoria_fecha_inicio", conv.fecha_inicio);
        setSingle("convocatoria_fecha_fin", conv.fecha_fin);
        setSingle("convocatoria_fechaInicioDocumentos", conv.fechaInicioDocumentos);
        setSingle("convocatoria_fechaFinDocumentos", conv.fechaFinDocumentos);
        setSingle("convocatoria_fechaEntrevistaInicio", conv.fechaEntrevistaInicio);
        setSingle("convocatoria_fechaEntrevistaFin", conv.fechaEntrevistaFin);
        setSingle("convocatoria_inicioCurso", conv.inicioCurso);
        setSingle("convocatoria_finCurso", conv.finCurso);
        setSingle("convocatoria_inicioExamen", conv.inicioExamen);
        setSingle("convocatoria_finExamen", conv.finExamen);
        setSingle("convocatoria_fechaInicioEscolar", conv.fechaInicioEscolar);
        setSingle("convocatoria_fechaResultados", conv.fechaResultados);

        // Renderizar opciones guardadas
        renderizarOpcionesPorPosgrado(conv.posgrado_id, conv.opciones || [], true);

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
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los datos de la convocatoria.', confirmButtonColor: '#ef4444' });
    }
}

document.getElementById("formConvocatoria")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idConvocatoriaForm").value;
    const posgrado_id = document.getElementById("convocatoria_posgrado").value;
    const posgradoData = todosLosPosgrados.find(p => p.id == posgrado_id);
    const tipo = posgradoData ? posgradoData.tipo : "MAESTRIA";

    const nombre = document.getElementById("convocatoria_nombre").value;
    const descripcion = document.getElementById("convocatoria_descripcion").value;
    const estado = document.getElementById("convocatoria_estado").value;
    const modalidad = document.getElementById("convocatoria_modalidad").value;
    const duracion = document.getElementById("convocatoria_duracion").value;

    const fecha_inicio = document.getElementById("convocatoria_fecha_inicio").value || null;
    const fecha_fin = document.getElementById("convocatoria_fecha_fin").value || null;
    const fechaInicioDocumentos = document.getElementById("convocatoria_fechaInicioDocumentos").value || null;
    const fechaFinDocumentos = document.getElementById("convocatoria_fechaFinDocumentos").value || null;
    const fechaEntrevistaInicio = document.getElementById("convocatoria_fechaEntrevistaInicio").value || null;
    const fechaEntrevistaFin = document.getElementById("convocatoria_fechaEntrevistaFin").value || null;
    const inicioCurso = document.getElementById("convocatoria_inicioCurso").value || null;
    const finCurso = document.getElementById("convocatoria_finCurso").value || null;
    const inicioExamen = document.getElementById("convocatoria_inicioExamen").value || null;
    const finExamen = document.getElementById("convocatoria_finExamen").value || null;
    const fechaInicioEscolar = document.getElementById("convocatoria_fechaInicioEscolar").value || null;
    const fechaResultados = document.getElementById("convocatoria_fechaResultados").value || null;

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

    // Enviar las opciones con sus cupos recopiladas desde los checkboxes marcados
    const opciones = [];
    const checkboxesOpciones = document.querySelectorAll("#contenedorOpcionesPosgrado .opc-checkbox:checked");
    checkboxesOpciones.forEach(cb => {
        const idOpc = parseInt(cb.value);
        const inputCupos = document.getElementById(`cupos_opc_${idOpc}`);
        const cuposVal = inputCupos && inputCupos.value ? parseInt(inputCupos.value) : null;
        opciones.push({
            idOpcionPosgrado: idOpc,
            cupos: cuposVal
        });
    });

    const datosConvocatoria = { nombre, descripcion, fecha_inicio, fecha_fin, estado, posgrado_id, tipo, modalidad, duracion, fechaInicioDocumentos, fechaFinDocumentos, fechaEntrevistaInicio, fechaEntrevistaFin, fechaInicioEscolar, fechaResultados, inicioCurso, finCurso, inicioExamen, finExamen, requisitos, opciones };
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
            Swal.fire("¡Éxito!", resultado.mensaje || "Operación realizada con éxito", "success");

            const modalElement = document.getElementById("modalConvocatoria");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            limpiarFormularioConvocatoria();
            cargarConvocatorias();
        } else {
            Swal.fire("Error", resultado.mensaje || "Hubo un error al procesar la solicitud.", "error");
        }

    } catch (error) {
        console.error("Error al guardar la convocatoria:", error);
        Swal.fire("Error", "Ocurrió un error en la conexión con el servidor.", "error");
    }
});

async function eliminarConvocatoria(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: `Se eliminará la convocatoria. ¡Esta acción no se puede deshacer!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
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
            Swal.fire('¡Eliminado!', resultado.mensaje || 'Convocatoria eliminada con éxito.', 'success');

            const modalElement = document.getElementById("modalConvocatoria");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            cargarConvocatorias();
        } else {
            Swal.fire('Error', resultado.mensaje || 'No se pudo eliminar la convocatoria.', 'error');
        }

    } catch (error) {
        console.error("Error en eliminarConvocatoria:", error);
        Swal.fire('Error', "Ocurrió un error al intentar eliminar la convocatoria.", 'error');
    }
}
// ==========================================
// MÓDULO ASPIRANTES
// ==========================================

async function cargarAspirantes() {
    const totalAspirantes = document.getElementById("totalAspirantes");
    const tbody = document.getElementById("tablaAspirantes");
    if (!tbody) return;

    mostrarLoader();
    try {
        const respuesta = await fetch("/api/aspirante");

        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const aspirantes = await respuesta.json();
        if (totalAspirantes) {
            totalAspirantes.textContent = aspirantes.length || 0;
        }

        tbody.innerHTML = "";

        if (!aspirantes || aspirantes.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>No hay aspirantes registrados.</td></tr>";
            return;
        }

        for (const aspirante of aspirantes) {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid var(--color-border)";
            tr.style.transition = "background 0.2s";
            tr.onmouseover = function () { this.style.background = 'var(--color-bg)'; };
            tr.onmouseout = function () { this.style.background = 'transparent'; };

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

            async function posgradoAspirante(asp) {
                if (asp.posgradoNombre) return asp.posgradoNombre;
                try {
                    const resExp = await fetch(`/api/aspirante/${asp.id}/expediente`);
                    if (!resExp.ok) return null;
                    const exp = await resExp.json();
                    if (exp.solicitudes && exp.solicitudes.length > 0) {
                        const sol = exp.solicitudes[0];
                        return sol.convocatoriaNombre || sol.opcionNombre || null;
                    }
                } catch (e) {
                    return null;
                }
                return null;
            }

            const correoReal = (await correoAspirante(aspirante.idUsuario)) || aspirante.correo || 'Sin correo';
            const posgradoNombreReal = await posgradoAspirante(aspirante);

            const posgradoTxt = posgradoNombreReal || 'Sin posgrado seleccionado';
            const badgeClass = posgradoNombreReal ? 'soft-badge-primary' : 'soft-badge-secondary';

            const curpStr = aspirante.curp || 'Sin CURP';
            const telefonoStr = aspirante.telefono || 'Sin teléfono';
            const licenciaturaStr = aspirante.licenciatura || 'Licenciatura no especificada';
            const institucionStr = aspirante.institucionLicenciatura || 'Institución no especificada';
            const promedioStr = (aspirante.promedio !== null && aspirante.promedio !== undefined) ? aspirante.promedio : null;

            const iniNombre = (aspirante.nombre || '').charAt(0).toUpperCase();
            const iniApellido = (aspirante.primerApellido || '').charAt(0).toUpperCase();
            const iniciales = (iniNombre + iniApellido) || 'A';

            tr.style.cursor = "pointer";
            tr.onclick = () => verExpedienteAspirante(aspirante.id);
            tr.innerHTML = `
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <strong style="color: var(--color-text); font-size: 0.95rem; display: block;">${nombreCompleto || 'Sin nombre'}</strong>
                    <small style="font-size: 0.8rem; color: var(--color-text-muted); display: block; margin-top: 3px;">
                        <i class="fa-regular fa-envelope me-1" style="color: var(--color-primary);"></i>${correoReal}
                    </small>
                </td>
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text); font-family: monospace;">
                        <i class="fa-solid me-1" style="color: var(--color-text-muted);"></i>${curpStr}
                    </div>
                </td>
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--color-text);">
                        <i class="fa-solid me-1" style="color: var(--color-primary);"></i>${licenciaturaStr}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 2px;">
                        ${institucionStr} ${promedioStr ? `<span style="background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); padding: 1px 6px; border-radius: 10px; font-weight: 700; font-size: 10px; margin-left: 6px;">Prom: ${promedioStr}</span>` : ''}
                    </div>
                </td>
                <td style="padding: 14px 15px; vertical-align: middle;">
                    <span class="soft-badge ${badgeClass}" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-book-bookmark"></i> ${posgradoTxt}
                    </span>
                </td>
                <td style="padding: 14px 15px; text-align: center; vertical-align: middle;">
                    <button onclick="event.stopPropagation(); verExpedienteAspirante(${aspirante.id});" title="Ver expediente" style="background: transparent; border: none; color: var(--color-primary); font-size: 1.25rem; cursor: pointer; padding: 6px 10px; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='transparent'">
                        <i class="fa-solid fa-folder-open"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    } catch (error) {
        console.error("Error al cargar aspirantes:", error);
        tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>Esperando API de aspirantes...</td></tr>";
    } finally {
        ocultarLoader();
    }
}

async function verExpedienteAspirante(id) {
    mostrarLoader();
    try {
        const respuesta = await fetch(`/api/aspirante/${id}/expediente`);
        if (!respuesta.ok) throw new Error("Aspirante no encontrado");

        const expediente = await respuesta.json();
        const perfil = expediente.perfil || {};
        const solicitudes = expediente.solicitudes || [];

        // Llenar el perfil resumido
        const nombreCompleto = `${perfil.nombre || ''} ${perfil.primerApellido || ''} ${perfil.segundoApellido || ''}`.trim();
        document.getElementById("perfil_nombreCompleto").textContent = nombreCompleto;

        // Avatar iniciales
        const iniNombre = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : '';
        const iniApellido = perfil.primerApellido ? perfil.primerApellido.charAt(0).toUpperCase() : '';
        document.getElementById("perfil_avatar").textContent = (iniNombre + iniApellido) || '--';
        document.getElementById("perfil_correo").textContent = perfil.correo || "Sin correo";

        document.getElementById("perfil_curp").textContent = perfil.curp || "N/A";
        document.getElementById("perfil_telefono").textContent = perfil.telefono || "N/A";

        let fechaNac = "N/A";
        if (perfil.fechaNacimiento) {
            fechaNac = new Date(perfil.fechaNacimiento).toLocaleDateString();
        }
        document.getElementById("perfil_nacimiento").textContent = fechaNac;

        let direccion = perfil.direccion || "";
        if (perfil.direccionPostal) direccion += ` (CP: ${perfil.direccionPostal})`;
        document.getElementById("perfil_direccion").textContent = direccion || "N/A";

        document.getElementById("perfil_estadoCivil").textContent = perfil.estadoCivil || "N/A";
        document.getElementById("perfil_licenciatura").textContent = perfil.licenciatura || "N/A";
        document.getElementById("perfil_institucionLicenciatura").textContent = perfil.institucionLicenciatura || "N/A";

        document.getElementById("perfil_fechaEgreso").textContent = perfil.fechaEgreso ? new Date(perfil.fechaEgreso).toLocaleDateString() : "N/A";
        document.getElementById("perfil_fechaTitulacion").textContent = perfil.fechaTitulacion ? new Date(perfil.fechaTitulacion).toLocaleDateString() : "N/A";
        document.getElementById("perfil_promedio").textContent = perfil.promedio || "N/A";

        let ocupacionInfo = perfil.ocupacion || "N/A";
        if (perfil.ciudadOcupacion || perfil.estadoOcupacion) ocupacionInfo += ` (${perfil.ciudadOcupacion || ''}, ${perfil.estadoOcupacion || ''})`;
        if (perfil.telefonoOcupacion) ocupacionInfo += ` - Tel: ${perfil.telefonoOcupacion}`;
        document.getElementById("perfil_ocupacion").textContent = ocupacionInfo;

        document.getElementById("perfil_otrosEstudios").textContent = perfil.otrosEstudios || "N/A";

        const badgeEstado = document.getElementById("perfil_estado");
        if (perfil.activo) {
            badgeEstado.className = "soft-badge soft-badge-success mb-4 d-inline-block";
            badgeEstado.textContent = "USUARIO ACTIVO";
        } else {
            badgeEstado.className = "soft-badge soft-badge-danger mb-4 d-inline-block";
            badgeEstado.textContent = "USUARIO INACTIVO";
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
            solicitudes.forEach((sol, index) => {
                let badgeSolicitud = "soft-badge-warning";
                if (sol.estado === "APROBADO") badgeSolicitud = "soft-badge-success";
                else if (sol.estado === "RECHAZADO") badgeSolicitud = "soft-badge-danger";

                const d = new Date(sol.creadoEn).toLocaleDateString();
                const containerId = `sol-docs-${sol.id || index}`;
                const chevronId = `chevron-${sol.id || index}`;

                // Armar la lista de documentos
                let htmlDocs = "";
                if (sol.documentos && sol.documentos.length > 0) {
                    htmlDocs = `<div style="margin-top: 1rem;"><h6 style="font-size: 0.85rem; font-weight: bold; color: var(--color-text-muted); margin-bottom: 0.75rem; letter-spacing: 0.5px; text-transform: uppercase;">Documentos Adjuntos</h6><div style="border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">`;
                    sol.documentos.forEach(doc => {
                        let classBadge = "soft-badge-warning";
                        if (doc.estadoValidacion === "APROBADO") { classBadge = "soft-badge-success"; }
                        else if (doc.estadoValidacion === "RECHAZADO") { classBadge = "soft-badge-danger"; }

                        htmlDocs += `
                            <div class="doc-row-premium" onclick="window.open('/api/files/${doc.rutaArchivo}?token=' + (sessionStorage.getItem('token') || localStorage.getItem('token')), '_blank')">
                                <div style="display: flex; align-items: center;">
                                    <i class="fa-solid fa-file-pdf doc-icon"></i>
                                    <span style="font-weight: 500; color: var(--color-text);">${doc.requisitoNombre}</span>
                                </div>
                                <div style="display: flex; align-items: center;">
                                    <span class="soft-badge ${classBadge}" style="margin-right: 1rem;">${doc.estadoValidacion}</span>
                                    <i class="fa-solid fa-chevron-right chevron-icon"></i>
                                </div>
                            </div>
                        `;
                    });
                    htmlDocs += `</div></div>`;
                } else {
                    htmlDocs = `<div style="margin-top: 1rem; padding: 1.25rem; text-align: center; border-radius: 8px; background: var(--color-bg);"><p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 0;"><i class="fa-solid fa-folder-minus" style="margin-right: 0.5rem;"></i> No se han adjuntado documentos aún.</p></div>`;
                }

                contSolicitudes.innerHTML += `
                    <div style="margin-bottom: 1.25rem; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card-bg); transition: all 0.2s;">
                        <div onclick="toggleSolicitudDocs('${containerId}', '${chevronId}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; user-select: none;">
                            <div>
                                <h5 style="font-weight: bold; margin-bottom: 0.35rem; color: var(--color-text); font-size: 1.15rem; display: flex; align-items: center; gap: 10px;">
                                    <span>${sol.convocatoriaNombre}</span>
                                    <i id="${chevronId}" class="fa-solid fa-chevron-down" style="font-size: 0.85rem; color: var(--color-primary); transition: transform 0.3s ease;"></i>
                                </h5>
                                ${sol.opcionNombre ? `<div style="margin-bottom: 0.35rem;"><span class="soft-badge soft-badge-secondary"><i class="fa-solid fa-layer-group me-1"></i> Opción: ${sol.opcionNombre}</span></div>` : ''}
                                <div style="color: var(--color-text-muted); font-size: 0.85rem; font-weight: 500;">
                                    <span>Iniciado el: ${d}</span> &nbsp;&bull;&nbsp; <span>${sol.modalidadNombre || 'Sin modalidad'}</span>
                                </div>
                            </div>
                            <span class="soft-badge ${badgeSolicitud}">${sol.estado}</span>
                        </div>
                        <div id="${containerId}" style="display: none; margin-top: 0.75rem; border-top: 1px dashed var(--color-border); padding-top: 0.75rem;">
                            ${htmlDocs}
                        </div>
                    </div>
                `;
            });
        }

        // Intercambiar vistas
        document.getElementById("vistaTablaAspirantes").style.display = "none";
        document.getElementById("vistaPerfilAspirante").style.display = "block";

    } catch (error) {
        console.error("Error al cargar expediente:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el expediente del aspirante.', confirmButtonColor: '#ef4444' });
    } finally {
        ocultarLoader();
    }
}

function cerrarExpedienteAspirante() {
    document.getElementById("vistaPerfilAspirante").style.display = "none";
    document.getElementById("vistaTablaAspirantes").style.display = "block";
}

function toggleSolicitudDocs(containerId, chevronId) {
    const container = document.getElementById(containerId);
    const chevron = document.getElementById(chevronId);
    if (!container) return;

    if (container.style.display === "none" || container.style.display === "") {
        container.style.display = "block";
        if (chevron) chevron.style.transform = "rotate(180deg)";
    } else {
        container.style.display = "none";
        if (chevron) chevron.style.transform = "rotate(0deg)";
    }
}

// Funciones de Filtrado UI para Aspirantes
window.filtrarTablaAspirantesUI = function () {
    const texto = (document.getElementById('filtro-aspirantes-texto')?.value || '').toLowerCase();
    const programa = (document.getElementById('filtro-aspirantes-programa')?.value || '').toLowerCase();

    const tbody = document.getElementById("tablaAspirantes");
    if (!tbody) return;

    const filas = tbody.querySelectorAll('tr');
    filas.forEach(fila => {
        // Ignorar fila de "no hay registros"
        if (fila.querySelector('td[colspan]')) return;

        const tdNombre = fila.children[0];
        const tdPrograma = fila.children[3];

        if (!tdNombre || !tdPrograma) return;

        const textoFila = tdNombre.innerText.toLowerCase();
        const textoPrograma = tdPrograma.innerText.toLowerCase();

        const matchTexto = !texto || textoFila.includes(texto);
        const matchPrograma = !programa || textoPrograma.includes(programa);

        if (matchTexto && matchPrograma) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
};

// ==========================================
// MÓDULO SOLICITUDES
// ==========================================

let solicitudesGlobalesAdmin = [];

async function cargarSolicitudesAdmin() {
    const totalSolicitudes = document.getElementById("totalSolicitudes");
    const tbody = document.getElementById("tablaSolicitudes");
    if (!tbody) return;

    mostrarLoader();
    try {
        const respuesta = await fetch("/api/solicitud/activas");

        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        solicitudesGlobalesAdmin = await respuesta.json();
        
        if (totalSolicitudes) {
            totalSolicitudes.textContent = solicitudesGlobalesAdmin.length || 0;
        }

        renderizarTablaSolicitudes();
    } catch (error) {
        console.error("Error al cargar solicitudes:", error);
        tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>No se pudieron cargar las solicitudes.</td></tr>";
    } finally {
        ocultarLoader();
    }
}

function renderizarTablaSolicitudes() {
    const tbody = document.getElementById("tablaSolicitudes");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filtroTexto = (document.getElementById("filtro-solicitudes-texto")?.value || "").toLowerCase();
    const filtroEstado = (document.getElementById("filtro-solicitudes-estado")?.value || "");
    const filtroPrograma = (document.getElementById("filtro-solicitudes-programa")?.value || "");

    const filtradas = (solicitudesGlobalesAdmin || []).filter(sol => {
        const nombre = (sol.aspiranteNombre || "").toLowerCase();
        const correo = (sol.correo || "").toLowerCase();
        const programa = (sol.programa || "").toLowerCase();
        const estado = sol.estadoSolicitud || "";

        let matchTexto = true;
        if (filtroTexto) {
            matchTexto = nombre.includes(filtroTexto) || correo.includes(filtroTexto) || programa.includes(filtroTexto);
        }

        let matchEstado = true;
        if (filtroEstado) {
            matchEstado = estado === filtroEstado;
        }

        let matchPrograma = true;
        if (filtroPrograma) {
            matchPrograma = programa.includes(filtroPrograma.toLowerCase());
        }

        return matchTexto && matchEstado && matchPrograma;
    });

    if (filtradas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align: center; color: var(--color-text-muted); padding: 25px;'>No hay solicitudes que coincidan con los filtros.</td></tr>";
        return;
    }

    filtradas.forEach(sol => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--color-border)";
        tr.style.transition = "background 0.2s";
        tr.onmouseover = function () { this.style.background = 'var(--color-bg)'; };
        tr.onmouseout = function () { this.style.background = 'transparent'; };

        let colorEstado = "secondary";
        let iconoEstado = "fa-circle-question";
        if (sol.estadoSolicitud === "APROBADO") { colorEstado = "success"; iconoEstado = "fa-check-circle"; }
        else if (sol.estadoSolicitud === "RECHAZADO") { colorEstado = "danger"; iconoEstado = "fa-times-circle"; }
        else if (sol.estadoSolicitud === "EN_REVISION") { colorEstado = "warning"; iconoEstado = "fa-magnifying-glass"; }
        else if (sol.estadoSolicitud === "PENDIENTE") { colorEstado = "info"; iconoEstado = "fa-clock"; }

        tr.style.cursor = "pointer";
        tr.onclick = () => abrirDetalleSolicitudAdmin(sol.idSolicitud, sol.idAspi);

        tr.innerHTML = `
            <td style="padding: 14px 15px; vertical-align: middle;">
                <strong style="color: var(--color-text); font-size: 0.95rem; display: block;">${sol.aspiranteNombre}</strong>
                <small style="font-size: 0.8rem; color: var(--color-text-muted); display: block; margin-top: 3px;">
                    <i class="fa-regular fa-envelope me-1" style="color: var(--color-primary);"></i>${sol.correo}
                </small>
            </td>
            <td style="padding: 14px 15px; vertical-align: middle;">
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--color-text);">
                    ${sol.programa}
                </div>
                ${sol.opcionNombre ? `<div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 2px;">${sol.opcionNombre}</div>` : ''}
            </td>
            <td style="padding: 14px 15px; vertical-align: middle;">
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text);">
                    ${sol.modalidadNombre || 'Sin Modalidad'}
                </div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 2px;">
                    ${sol.etapaNombre || 'Sin Etapa'}
                </div>
            </td>
            <td style="padding: 14px 15px; vertical-align: middle;">
                <span class="soft-badge soft-badge-${colorEstado}" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid ${iconoEstado}"></i> ${sol.estadoSolicitud}
                </span>
            </td>
            <td style="padding: 14px 15px; text-align: center; vertical-align: middle;">
                <button onclick="event.stopPropagation(); abrirDetalleSolicitudAdmin(${sol.idSolicitud}, ${sol.idAspi});" title="Ver detalles" style="background: transparent; border: none; color: var(--color-primary); font-size: 1.25rem; cursor: pointer; padding: 6px 10px; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='transparent'">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.filtrarTablaSolicitudesUI = function () {
    renderizarTablaSolicitudes();
};

async function abrirDetalleSolicitudAdmin(idSolicitud, idAspi) {
    mostrarLoader();
    try {
        const sol = solicitudesGlobalesAdmin.find(s => s.idSolicitud === idSolicitud);
        if(!sol) throw new Error("Solicitud no encontrada en memoria.");

        // Ocultar tabla, mostrar detalle
        document.getElementById("vistaTablaSolicitudes").style.display = "none";
        document.getElementById("vistaDetalleSolicitud").style.display = "block";

        // Llenar datos básicos
        const iniciales = (sol.aspiranteNombre || "A").substring(0, 2).toUpperCase();
        document.getElementById("solDet_avatar").textContent = iniciales;
        document.getElementById("solDet_nombreCompleto").textContent = sol.aspiranteNombre;
        document.getElementById("solDet_correo").textContent = sol.correo;

        let colorEstado = "secondary";
        if (sol.estadoSolicitud === "APROBADO") colorEstado = "success";
        else if (sol.estadoSolicitud === "RECHAZADO") colorEstado = "danger";
        else if (sol.estadoSolicitud === "EN_REVISION") colorEstado = "warning";
        else if (sol.estadoSolicitud === "PENDIENTE") colorEstado = "info";

        const badgeEstado = document.getElementById("solDet_estado");
        badgeEstado.className = `soft-badge soft-badge-${colorEstado} mb-4 d-inline-block`;
        badgeEstado.textContent = sol.estadoSolicitud;

        document.getElementById("solDet_programa").textContent = sol.programa || '-';
        document.getElementById("solDet_opcion").textContent = sol.opcionNombre || '-';
        document.getElementById("solDet_modalidad").textContent = sol.modalidadNombre || '-';
        document.getElementById("solDet_etapa").textContent = sol.etapaNombre || 'Sin Etapa';

        // Obtener documentos de la solicitud
        const respDocs = await fetch(`/api/solicitud/activa/${idAspi}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        const contDocs = document.getElementById("contenedorDocumentosSolicitud");

        if (!respDocs.ok) {
            contDocs.innerHTML = `<div class="alert alert-warning"><i class="fa-solid fa-triangle-exclamation me-2"></i>No se pudieron cargar los documentos.</div>`;
            return;
        }

        const dataSolActiva = await respDocs.json();
        
        if (dataSolActiva && dataSolActiva.existe && dataSolActiva.documentosSubidos && dataSolActiva.documentosSubidos.length > 0) {
            let docsHtml = `<div class="list-group list-group-flush mt-3" style="border-radius: 8px; border: 1px solid var(--color-border); overflow: hidden;">`;
            
            dataSolActiva.documentosSubidos.forEach(doc => {
                let badgeClass = "secondary";
                let textStatus = "Pendiente";
                let iconStatus = "fa-clock";

                if (doc.estadoValidacion === "APROBADO") { badgeClass = "success"; textStatus = "Aprobado"; iconStatus = "fa-check-circle"; }
                else if (doc.estadoValidacion === "RECHAZADO") { badgeClass = "danger"; textStatus = "Rechazado"; iconStatus = "fa-times-circle"; }
                
                const urlCompleta = doc.rutaArchivo.startsWith('http') ? doc.rutaArchivo : `/api/files/${doc.rutaArchivo.split('/').pop()}?token=${sessionStorage.getItem('token')}`;

                docsHtml += `
                    <div class="list-group-item d-flex justify-content-between align-items-center" style="background: transparent; border-color: var(--color-border); padding: 15px 20px;">
                        <div class="d-flex align-items-center gap-3">
                            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(59,130,246,0.1); color: var(--color-primary); display: flex; justify-content: center; align-items: center; font-size: 1.2rem;">
                                <i class="fa-solid fa-file-pdf"></i>
                            </div>
                            <div>
                                <h6 class="mb-0 fw-bold" style="color: var(--color-text); font-size: 0.95rem;">${doc.requisitoNombre || 'Documento'}</h6>
                                <small class="text-muted" style="font-size: 0.8rem;">Intento #${doc.intentos}</small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-${badgeClass} rounded-pill px-3 py-2 fw-semibold shadow-sm d-flex align-items-center gap-1 me-1">
                                <i class="fa-solid ${iconStatus}"></i> ${textStatus}
                            </span>
                            <button onclick="evaluarDocumentoAdmin(${doc.idDocumento || doc.id}, 'APROBADO', ${idSolicitud}, ${idAspi})" class="btn btn-sm btn-outline-success rounded-circle" style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center;" title="Aprobar Documento">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button onclick="evaluarDocumentoAdmin(${doc.idDocumento || doc.id}, 'RECHAZADO', ${idSolicitud}, ${idAspi})" class="btn btn-sm btn-outline-danger rounded-circle" style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center;" title="Rechazar Documento">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                            <a href="${urlCompleta}" target="_blank" class="btn btn-sm btn-outline-primary rounded-circle" style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center;" title="Ver Documento">
                                <i class="fa-solid fa-eye"></i>
                            </a>
                        </div>
                    </div>
                `;
            });
            docsHtml += `</div>`;
            contDocs.innerHTML = docsHtml;

            const docsDescargables = dataSolActiva.documentosSubidos.filter(d => d.estadoValidacion === 'APROBADO' || d.estadoValidacion === 'PENDIENTE');
            const btnDescargar = document.getElementById("btnDescargarDocsSolicitud");

            if (docsDescargables.length > 0) {
                btnDescargar.style.display = "block";
                btnDescargar.onclick = () => descargarDocumentosZipAdmin(sol.aspiranteNombre, docsDescargables);
            } else {
                btnDescargar.style.display = "none";
            }
        } else {
            contDocs.innerHTML = `
                <div class="text-center py-5">
                    <div style="font-size: 3rem; color: var(--color-border); margin-bottom: 15px;">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h5 style="color: var(--color-text-muted); font-weight: 600;">Sin Documentos</h5>
                    <p style="color: var(--color-text-muted); font-size: 0.9rem;">El aspirante aún no ha subido documentos para esta solicitud.</p>
                </div>
            `;
            document.getElementById("btnDescargarDocsSolicitud").style.display = "none";
        }

        // ---- SECCIÓN COMPROBANTE DE PAGO ----
        const contPago = document.getElementById("contenedorComprobantePago");
        if (contPago) {
            const resPago = await fetch(`/api/pagos/${idSolicitud}`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            if (resPago.ok) {
                const pagoData = await resPago.json();
                if (pagoData && pagoData.existe) {
                    const estadoColor = { PENDIENTE: 'warning', APROBADO: 'success', RECHAZADO: 'danger' };
                    const estadoIcono = { PENDIENTE: 'fa-clock', APROBADO: 'fa-circle-check', RECHAZADO: 'fa-circle-xmark' };
                    const est = pagoData.estado || 'PENDIENTE';
                    const token = sessionStorage.getItem('token');
                    const urlComp = `/api/files/${pagoData.comprobante}?token=${token}`;

                    const botonesAccion = est === 'PENDIENTE' ? `
                        <div style="display:flex;gap:8px;margin-top:14px;">
                            <button onclick="verificarPagoAdmin(${idSolicitud}, 'APROBADO')" class="btn btn-sm btn-outline-success" style="flex:1;padding:8px;">
                                <i class="fa-solid fa-check me-1"></i> Aprobar pago
                            </button>
                            <button onclick="verificarPagoAdmin(${idSolicitud}, 'RECHAZADO')" class="btn btn-sm btn-outline-danger" style="flex:1;padding:8px;">
                                <i class="fa-solid fa-xmark me-1"></i> Rechazar pago
                            </button>
                        </div>` : '';

                    contPago.innerHTML = `
                        <h6 style="font-size:0.85rem;font-weight:bold;color:var(--color-text-muted);margin:1.25rem 0 0.75rem;letter-spacing:0.5px;text-transform:uppercase;">
                            Comprobante de Pago
                        </h6>
                        <div style="border:1px solid var(--color-border);border-radius:8px;overflow:hidden;">
                            <div class="list-group-item d-flex justify-content-between align-items-center" style="background:transparent;border:none;padding:15px 20px;">
                                <div class="d-flex align-items-center gap-3">
                                    <div style="width:40px;height:40px;border-radius:8px;background:rgba(245,158,11,0.1);color:#f59e0b;display:flex;justify-content:center;align-items:center;font-size:1.2rem;">
                                        <i class="fa-solid fa-receipt"></i>
                                    </div>
                                    <div>
                                        ${pagoData.referencia ? `<small class="text-muted"><i class="fa-solid fa-comment-dots me-1"></i>Comentarios: ${pagoData.referencia}</small>` : ''}
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge bg-${estadoColor[est]} rounded-pill px-3 py-2 fw-semibold shadow-sm d-flex align-items-center gap-1 me-1">
                                        <i class="fa-solid ${estadoIcono[est]}"></i> ${est}
                                    </span>
                                    <a href="${urlComp}" target="_blank" class="btn btn-sm btn-outline-primary rounded-circle" style="width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;" title="Ver comprobante">
                                        <i class="fa-solid fa-eye"></i>
                                    </a>
                                </div>
                            </div>
                            ${pagoData.observaciones ? `<div style="padding:0 20px 14px;font-size:13px;color:#ef4444;"><i class="fa-solid fa-triangle-exclamation me-1"></i>${pagoData.observaciones}</div>` : ''}
                        </div>
                        ${botonesAccion}`;
                } else {
                    contPago.innerHTML = '';
                }
            }
        }
        // ---- FIN SECCIÓN COMPROBANTE ----

    } catch (error) {
        console.error("Error al abrir detalle de solicitud:", error);
        Swal.fire('Error', 'No se pudieron cargar los detalles de la solicitud.', 'error');
    } finally {
        ocultarLoader();
    }
}

function cerrarDetalleSolicitud() {
    document.getElementById("vistaDetalleSolicitud").style.display = "none";
    document.getElementById("vistaTablaSolicitudes").style.display = "block";
}

async function verificarPagoAdmin(idSolicitud, estado) {
    let observaciones = '';
    if (estado === 'RECHAZADO') {
        const { value: text, isConfirmed } = await Swal.fire({
            title: 'Rechazar Comprobante de Pago',
            input: 'textarea',
            inputLabel: 'Motivo del rechazo',
            inputPlaceholder: 'Indica por qué se rechaza el comprobante...',
            showCancelButton: true,
            confirmButtonText: 'Confirmar Rechazo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });
        if (!isConfirmed) return;
        observaciones = text || 'Comprobante no válido.';
    } else {
        const result = await Swal.fire({
            title: '¿Aprobar Comprobante de Pago?',
            text: 'El aspirante podrá avanzar a la siguiente etapa de su proceso.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Aprobar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981'
        });
        if (!result.isConfirmed) return;
    }

    mostrarLoader();
    try {
        const res = await fetch(`/api/pagos/verificar/${idSolicitud}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify({ decision: estado, estado, observaciones })
        });
        const data = await res.json();
        ocultarLoader();

        if (res.ok && data.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Actualizado!',
                text: data.mensaje || `El pago ha sido ${estado.toLowerCase()}.`,
                timer: 2000,
                showConfirmButton: false
            });
            // Recargar vista si conocemos idAspi o re-ejecutar abrirDetalleSolicitudAdmin
            const sol = solicitudesGlobalesAdmin.find(s => s.idSolicitud === idSolicitud);
            if (sol) {
                abrirDetalleSolicitudAdmin(idSolicitud, sol.idAspi);
            }
        } else {
            Swal.fire('Error', data.mensaje || 'No se pudo actualizar el estado del pago.', 'error');
        }
    } catch (e) {
        ocultarLoader();
        console.error("Error en verificarPagoAdmin:", e);
        Swal.fire('Error', 'Ocurrió un error en la conexión.', 'error');
    }
}

async function descargarDocumentosZipAdmin(nombreAspirante, documentos) {
    if (typeof JSZip === "undefined") {
        Swal.fire("Error", "La librería JSZip no se ha cargado correctamente.", "error");
        return;
    }

    try {
        mostrarLoader();
        const zip = new JSZip();
        const folder = zip.folder(`Expediente_${nombreAspirante.replace(/[^a-zA-Z0-9_-]/g, "_")}`);

        let descargasExitosas = 0;

        for (const doc of documentos) {
            try {
                const urlCompleta = doc.rutaArchivo.startsWith('http') ? doc.rutaArchivo : `/api/files/${doc.rutaArchivo.split('/').pop()}?token=${sessionStorage.getItem('token')}`;
                const resp = await fetch(urlCompleta);
                if (!resp.ok) continue;

                const blob = await resp.blob();
                
                const ext = doc.rutaArchivo.includes('.') ? doc.rutaArchivo.split('.').pop() : 'pdf';
                const nombreLimpio = (doc.requisitoNombre || 'documento').replace(/[^a-zA-Z0-9_-]/g, "_");
                const nombreArchivo = `${nombreLimpio}_Intento${doc.intentos || 1}.${ext}`;

                folder.file(nombreArchivo, blob);
                descargasExitosas++;
            } catch (err) {
                console.error(`Error descargando ${doc.requisitoNombre}:`, err);
            }
        }

        if (descargasExitosas === 0) {
            Swal.fire("Atención", "No se pudieron obtener los archivos para comprimir.", "warning");
            return;
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(zipBlob);
        a.download = `Expediente_${nombreAspirante.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        Swal.fire({
            icon: 'success',
            title: 'ZIP Generado',
            text: `Se descargaron ${descargasExitosas} documento(s) comprimidos en un paquete ZIP.`,
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Error al generar ZIP:", error);
        Swal.fire("Error", "No se pudo generar el archivo comprimido.", "error");
    } finally {
        ocultarLoader();
    }
}

async function evaluarDocumentoAdmin(idDocumento, estadoValidacion, idSolicitud, idAspi) {
    const accion = estadoValidacion === 'APROBADO' ? 'aprobar' : 'rechazar';
    const colorBtn = estadoValidacion === 'APROBADO' ? '#10b981' : '#ef4444';

    const confirmacion = await Swal.fire({
        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} documento?`,
        text: `¿Estás seguro que deseas ${accion} este documento?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: colorBtn,
        cancelButtonColor: '#64748b',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        mostrarLoader();
        const response = await fetch(`/api/documentos/evaluar/${idDocumento}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify({ estadoValidacion })
        });

        const data = await response.json();

        if (response.ok && data.success !== false) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: data.mensaje || `Documento ${estadoValidacion.toLowerCase()} correctamente`,
                timer: 1500,
                showConfirmButton: false
            });
            await cargarSolicitudesAdmin();
            await abrirDetalleSolicitudAdmin(idSolicitud, idAspi);
        } else {
            throw new Error(data.mensaje || 'Error al evaluar el documento.');
        }
    } catch (error) {
        console.error('Error al evaluar documento:', error);
        Swal.fire('Error', error.message || 'No se pudo evaluar el documento.', 'error');
    } finally {
        ocultarLoader();
    }
}

// ==========================================
// MÓDULO NOTIFICACIONES Y AVISOS
// ==========================================

let notificacionActivaId = null;
let notificacionesGlobales = [];
let filtroAudienciaActual = 'todos';

async function cargarNotificacionesAdmin() {
    const contenedor = document.getElementById("listaNotificacionesChat");
    if (!contenedor) return;

    mostrarLoader();
    try {
        const respuesta = await fetch("/api/notificaciones");
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        notificacionesGlobales = await respuesta.json();
        renderizarFeedNotificaciones();
    } catch (error) {
        console.warn("Error al cargar notificaciones:", error);
        contenedor.innerHTML = `<div class="p-4 text-center text-danger small"><i class="fa-solid fa-triangle-exclamation mb-2 fs-4"></i><br>Error al cargar las notificaciones.</div>`;
    } finally {
        ocultarLoader();
    }
}

function renderizarFeedNotificaciones() {
    const contenedor = document.getElementById("listaNotificacionesChat");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const terminoTexto = (document.getElementById('filtro-notif-texto')?.value || '').toLowerCase();

    // Filtrar lista
    const notifsFiltradas = (notificacionesGlobales || []).filter(n => {
        const dest = (n.destino || 'todos').toLowerCase();
        const matchAudiencia = filtroAudienciaActual === 'todos' || dest === filtroAudienciaActual;

        const titulo = (n.nombre || '').toLowerCase();
        const msg = (n.mensaje || '').toLowerCase();
        const matchTexto = !terminoTexto || titulo.includes(terminoTexto) || msg.includes(terminoTexto);

        return matchAudiencia && matchTexto;
    });

    if (notifsFiltradas.length === 0) {
        contenedor.innerHTML = `
            <div class="p-4 text-center text-muted small">
                <i class="fa-solid fa-inbox fs-3 mb-2 opacity-50"></i><br>No se encontraron avisos con este filtro.
            </div>
        `;
        return;
    }

    notifsFiltradas.forEach(notif => {
        const item = document.createElement("div");
        item.className = "notif-feed-item";
        if (notificacionActivaId === notif.id) item.classList.add("active");

        let destinoIcon = 'fa-bullhorn';
        let badgeClass = 'soft-badge-primary';
        let destinoLabel = 'Todos';

        switch (notif.destino) {
            case 'aspirantes':
                destinoIcon = 'fa-graduation-cap';
                badgeClass = 'soft-badge-info';
                destinoLabel = 'Aspirantes';
                break;
            case 'docentes':
                destinoIcon = 'fa-chalkboard-user';
                badgeClass = 'soft-badge-warning';
                destinoLabel = 'Docentes';
                break;
            case 'secretario':
                destinoIcon = 'fa-file-signature';
                badgeClass = 'soft-badge-success';
                destinoLabel = 'Secretaría';
                break;
            case 'coordinador':
                destinoIcon = 'fa-user-tie';
                badgeClass = 'soft-badge-primary';
                destinoLabel = 'Coordinador';
                break;
            case 'individual':
                destinoIcon = 'fa-user';
                badgeClass = 'soft-badge-secondary';
                destinoLabel = 'Individual';
                break;
        }

        const esActiva = notif.activa == 1 || notif.activa === 'true' || notif.activa === true;
        const estadoBadge = esActiva
            ? `<span class="soft-badge soft-badge-success" style="font-size: 10px; padding: 2px 6px;"><i class="fa-solid fa-eye me-1"></i>Visible</span>`
            : `<span class="soft-badge soft-badge-danger" style="font-size: 10px; padding: 2px 6px;"><i class="fa-solid fa-eye-slash me-1"></i>Oculta</span>`;

        const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
        const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        item.onclick = () => mostrarLecturaNotificacion(notif.id);

        item.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="avatar-initials bg-primary text-white flex-shrink-0" style="width: 38px; height: 38px; font-size: 1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid ${destinoIcon}"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-truncate" style="color: var(--color-text); font-size: 0.9rem;">${notif.nombre || 'Sin título'}</span>
                        <small class="text-muted flex-shrink-0 ms-2" style="font-size: 11px;">${timeStr}</small>
                    </div>
                    <div class="text-truncate text-muted small mb-2" style="font-size: 0.82rem;">${notif.mensaje || ''}</div>
                    <div class="d-flex align-items-center justify-content-between">
                        <span class="soft-badge ${badgeClass}" style="font-size: 10px; padding: 2px 8px;">${destinoLabel}</span>
                        ${estadoBadge}
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(item);
    });
}

function filtrarNotifAudiencia(audiencia, btnEl) {
    filtroAudienciaActual = audiencia;
    const pills = document.querySelectorAll('#filtro-notif-audiencia .notif-filter-pill');
    pills.forEach(p => {
        p.classList.remove('btn-primary', 'active');
        p.classList.add('btn-outline-secondary');
    });

    if (btnEl) {
        btnEl.classList.remove('btn-outline-secondary');
        btnEl.classList.add('btn-primary', 'active');
    }

    renderizarFeedNotificaciones();
}

window.filtrarNotificacionesUI = function () {
    renderizarFeedNotificaciones();
};

function mostrarRedaccionNotificacion() {
    limpiarFormularioNotificacion();
    document.getElementById("notifComposeTitle").innerHTML = '<i class="fa-solid fa-paper-plane"></i> Emitir Nueva Notificación';
    document.getElementById("chatReadMode").style.display = "none";
    document.getElementById("chatComposeMode").style.display = "flex";

    document.querySelectorAll('.notif-feed-item').forEach(el => el.classList.remove('active'));
    notificacionActivaId = null;
}

function cerrarRedaccionNotificacion() {
    document.getElementById("chatComposeMode").style.display = "none";
    document.getElementById("chatReadMode").style.display = "flex";

    if (!notificacionActivaId) {
        limpiarLecturaNotificacion();
    }
}

function limpiarLecturaNotificacion() {
    document.getElementById("chatReadTitle").innerText = "Selecciona una notificación";
    document.getElementById("chatReadDestino").innerText = "Haz clic en un aviso de la lista para inspeccionarlo";

    const btnEdit = document.getElementById("btnEditarNotifChat");
    const btnDel = document.getElementById("btnEliminarNotifChat");
    if (btnEdit) btnEdit.style.display = "none";
    if (btnDel) btnDel.style.display = "none";

    const body = document.getElementById("chatReadBody");
    body.innerHTML = `
        <div class="d-flex flex-column justify-content-center align-items-center h-100 text-muted py-5">
            <img src="css/umsnhLogo.png" alt="Logo Posgrados" style="width: 120px; opacity: 0.3;" class="mb-3">
            <h6 class="fw-semibold text-muted">Ningún aviso seleccionado</h6>
            <p class="small text-muted text-center max-w-sm">Selecciona una notificación del panel izquierdo para ver los detalles del envío o crear una nueva para tu audiencia.</p>
        </div>
    `;
}

function mostrarLecturaNotificacion(id) {
    notificacionActivaId = id;
    document.getElementById("chatComposeMode").style.display = "none";
    document.getElementById("chatReadMode").style.display = "flex";

    document.querySelectorAll('.notif-feed-item').forEach(el => el.classList.remove('active'));
    renderizarFeedNotificaciones();

    const notif = notificacionesGlobales.find(n => n.id === id);
    if (!notif) return;

    let destinoText = 'Todos los Usuarios';
    let destinoBadge = 'soft-badge-primary';
    let destinoIcon = 'fa-users';

    switch (notif.destino) {
        case 'aspirantes':
            destinoText = 'Aspirantes';
            destinoBadge = 'soft-badge-info';
            destinoIcon = 'fa-graduation-cap';
            break;
        case 'docentes':
            destinoText = 'Docentes';
            destinoBadge = 'soft-badge-warning';
            destinoIcon = 'fa-chalkboard-user';
            break;
        case 'secretario':
            destinoText = 'Secretaría';
            destinoBadge = 'soft-badge-success';
            destinoIcon = 'fa-file-signature';
            break;
        case 'coordinador':
            destinoText = 'Coordinador';
            destinoBadge = 'soft-badge-primary';
            destinoIcon = 'fa-user-tie';
            break;
        case 'individual':
            destinoText = `Aspirante Individual ${notif.idDestino ? `(ID: ${notif.idDestino})` : ''}`;
            destinoBadge = 'soft-badge-secondary';
            destinoIcon = 'fa-user';
            break;
    }

    const esActiva = notif.activa == 1 || notif.activa === 'true' || notif.activa === true;
    const estadoText = esActiva
        ? '<span class="soft-badge soft-badge-success"><i class="fa-solid fa-eye me-1"></i> Publicada (Visible)</span>'
        : '<span class="soft-badge soft-badge-danger"><i class="fa-solid fa-eye-slash me-1"></i> Oculta</span>';

    document.getElementById("chatReadTitle").innerText = notif.nombre || 'Sin título';
    document.getElementById("chatReadDestino").innerText = `Audiencia: ${destinoText}`;

    const btnEdit = document.getElementById("btnEditarNotifChat");
    const btnDel = document.getElementById("btnEliminarNotifChat");
    if (btnEdit) btnEdit.style.display = "inline-block";
    if (btnDel) btnDel.style.display = "inline-block";

    const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
    const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    let editadoHtml = '';
    if (notif.editado_en && notif.creado_en && notif.editado_en !== notif.creado_en) {
        const editDate = new Date(notif.editado_en);
        if (Math.abs(editDate - dateObj) > 5000) {
            editadoHtml = `<span class="ms-2 text-muted fst-italic" style="font-size: 11px;">(Editado el ${editDate.toLocaleDateString()})</span>`;
        }
    }

    const body = document.getElementById("chatReadBody");
    body.innerHTML = `
        <div class="h-100 d-flex flex-column justify-content-between">
            <div>
                <!-- Metadata Header Card -->
                <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 pb-3 border-bottom" style="border-color: var(--color-border) !important;">
                    <div class="d-flex align-items-center gap-2">
                        <span class="soft-badge ${destinoBadge} px-3 py-1 fw-bold" style="font-size: 0.85rem;">
                            <i class="fa-solid ${destinoIcon} me-1"></i> ${destinoText}
                        </span>
                        ${estadoText}
                    </div>
                    <div class="text-muted small font-monospace">
                        <i class="fa-regular fa-clock me-1"></i> ${dateStr} - ${timeStr} ${editadoHtml}
                    </div>
                </div>

                <!-- Announcement Title & Message Body -->
                <h4 class="fw-bold mb-3" style="color: var(--color-text);">${notif.nombre || ''}</h4>

                <div class="p-4 mb-4 rounded-3 shadow-sm" style="background: var(--color-bg); border: 1px solid var(--color-border); min-height: 180px;">
                    <p style="color: var(--color-text); white-space: pre-wrap; font-size: 0.98rem; line-height: 1.6; margin-bottom: 0;">
                        ${notif.mensaje || ''}
                    </p>
                </div>
            </div>

            <!-- Footer Action Controls -->
            <div class="pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2" style="border-color: var(--color-border) !important;">
                <button class="btn btn-sm ${esActiva ? 'btn-outline-warning' : 'btn-outline-success'} rounded-pill px-3 fw-bold" onclick="toggleVisibilidadNotificacion(${notif.id})">
                    <i class="fa-solid ${esActiva ? 'fa-eye-slash' : 'fa-eye'} me-1"></i> ${esActiva ? 'Ocultar aviso' : 'Hacer visible'}
                </button>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onclick="editarNotificacion(${notif.id})">
                        <i class="fa-solid fa-pen-to-square me-1"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold" onclick="eliminarNotificacionActiva()">
                        <i class="fa-solid fa-trash me-1"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function editarNotificacionActiva() {
    if (notificacionActivaId) {
        editarNotificacion(notificacionActivaId);
    }
}

async function toggleVisibilidadNotificacion(id) {
    try {
        const notif = notificacionesGlobales.find(n => n.id === id);
        if (!notif) return;

        const nuevoEstado = (notif.activa == 1 || notif.activa === 'true' || notif.activa === true) ? 0 : 1;
        const token = sessionStorage.getItem("token") || "";

        const respuesta = await fetch(`/api/notificaciones/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre: notif.nombre,
                mensaje: notif.mensaje,
                destino: notif.destino,
                activa: nuevoEstado,
                idDestino: notif.idDestino
            })
        });

        if (respuesta.ok) {
            Swal.fire({
                icon: 'success',
                title: nuevoEstado ? 'Notificación visible' : 'Notificación oculta',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            await cargarNotificacionesAdmin();
            mostrarLecturaNotificacion(id);
        }
    } catch (e) {
        console.warn("Error al cambiar visibilidad:", e);
    }
}

function limpiarFormularioNotificacion() {
    const form = document.getElementById("formNotificacion");
    if (form) form.reset();
    document.getElementById("idNotificacionForm").value = "";
    document.getElementById("notif_estado_switch").checked = true;

    const divIdDestino = document.getElementById('div_notif_idDestino');
    if (divIdDestino) divIdDestino.style.display = 'none';
}

async function editarNotificacion(id) {
    try {
        const notif = notificacionesGlobales.find(n => n.id === id);
        if (!notif) throw new Error("Notificación no encontrada");

        mostrarRedaccionNotificacion();
        notificacionActivaId = id;

        document.getElementById("notifComposeTitle").innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Notificación Existente';

        document.getElementById("idNotificacionForm").value = notif.id;
        document.getElementById("notif_titulo").value = notif.nombre || "";
        document.getElementById("notif_mensaje").value = notif.mensaje || "";
        document.getElementById("notif_destino").value = notif.destino || "todos";
        document.getElementById("notif_estado_switch").checked = (notif.activa == 1 || notif.activa === 'true' || notif.activa === true);

        const notifDestino = document.getElementById("notif_destino");
        if (notifDestino) {
            notifDestino.dispatchEvent(new Event('change'));
        }

        const idDestinoEl = document.getElementById("notif_idDestino");
        if (idDestinoEl && notif.destino === 'individual') {
            await llenarSelectAspirantes();
            idDestinoEl.value = notif.idDestino || "";
        }
    } catch (error) {
        console.warn("Error al preparar edición:", error);
        Swal.fire('Error', 'La notificación no se pudo cargar.', 'error');
    }
}

document.getElementById("formNotificacion")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("idNotificacionForm").value;
    const nombre = document.getElementById("notif_titulo").value;
    const mensaje = document.getElementById("notif_mensaje").value;
    const activa = document.getElementById("notif_estado_switch").checked ? 1 : 0;
    const destino = document.getElementById("notif_destino").value;

    let idDestino = null;
    const idDestinoEl = document.getElementById("notif_idDestino");
    if (idDestinoEl && idDestinoEl.value.trim() !== "") {
        idDestino = idDestinoEl.value.trim();
    }

    const datosNotif = { nombre, mensaje, destino, activa, idDestino };
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
                title: '¡Procesado!',
                text: resultado.mensaje || 'Notificación guardada con éxito.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            limpiarFormularioNotificacion();
            cerrarRedaccionNotificacion();
            await cargarNotificacionesAdmin();

            if (idInput) {
                mostrarLecturaNotificacion(parseInt(idInput, 10));
            }
        } else {
            Swal.fire('Error', resultado.mensaje || 'No se pudo guardar.', 'error');
        }
    } catch (error) {
        console.warn("API de guardar notificaciones no lista:", error);
        Swal.fire('Error de red', 'La conexión falló.', 'error');
    }
});

async function eliminarNotificacionActiva() {
    if (!notificacionActivaId) return;

    const confirmacion = await Swal.fire({
        title: '¿Eliminar Notificación?',
        text: "Esta acción eliminará el aviso para todos los destinatarios.",
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
        const respuesta = await fetch(`/api/notificaciones/${notificacionActivaId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            Swal.fire('¡Eliminado!', 'El aviso ha sido eliminado.', 'success');

            notificacionActivaId = null;
            limpiarLecturaNotificacion();
            cargarNotificacionesAdmin();
        } else {
            Swal.fire('Error', resultado.mensaje || "No se pudo eliminar.", 'error');
        }
    } catch (error) {
        console.warn("API de eliminar notificaciones no lista:", error);
        Swal.fire('Error', "Ocurrió un error al intentar eliminar la notificación.", 'error');
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

// ==== FUNCIONES DE UI MODERNAS ====

function abrirDrawerAjustes() {
    const overlay = document.getElementById('settings-drawer-overlay');
    const drawer = document.getElementById('settings-drawer');
    if (overlay) overlay.classList.add('show');
    if (drawer) drawer.classList.add('open');
}

function cerrarDrawerAjustes() {
    const overlay = document.getElementById('settings-drawer-overlay');
    const drawer = document.getElementById('settings-drawer');
    if (overlay) overlay.classList.remove('show');
    if (drawer) drawer.classList.remove('open');
}

function toggleNotificationMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('notification-dropdown');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Cerrar los menús al hacer click fuera
document.addEventListener('click', function (event) {
    const notificationMenu = document.getElementById('notification-dropdown');
    if (notificationMenu && notificationMenu.classList.contains('show') && !event.target.closest('.notification-container')) {
        notificationMenu.classList.remove('show');
    }

    // profileDropdown ya puede estar manejado en utils.js, pero lo agregamos por seguridad
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown && profileDropdown.classList.contains('show') && !event.target.closest('.profile-container')) {
        profileDropdown.classList.remove('show');
    }
});

// ==== FUNCIONES DE PERFIL ====
function abrirModalPerfilAdmin() {
    let usuarioStr = sessionStorage.getItem("usuario");
    if (!usuarioStr) return;
    let usuario = JSON.parse(usuarioStr);

    const nombreCompleto = (usuario.nombre || 'Administrador').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    const correo = usuario.correo || 'admin@umich.mx';
    const iniciales = nombreCompleto.split(' ').filter(Boolean).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || 'AD';

    const cell = (label, value, span = 1) =>
        `<div style="grid-column: span ${span};">
            <span style="display: block; font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">${label}</span>
            <strong style="color: var(--color-text); font-size: 15px; font-weight: 500;">${value || 'No registrado'}</strong>
        </div>`;

    Swal.fire({
        html: `
        <div class="pm-wrapper" style="text-align: left; background: var(--color-card-bg); position: relative; overflow: hidden; border-radius: 12px;">
            <!-- WATERMARK -->
            <div class="modal-watermark"></div>

            <!-- HEADER CLEAN -->
            <div style="padding: 35px 35px 25px; display: flex; align-items: center; gap: 24px; border-bottom: 1px solid var(--color-border); position: relative; z-index: 1;">
                <div style="width: 75px; height: 75px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; flex-shrink: 0; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);">${iniciales}</div>
                <div>
                    <h2 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--color-text); letter-spacing: -0.5px;">${nombreCompleto}</h2>
                    <p style="margin: 6px 0 0; color: var(--color-text-muted); font-size: 15px;"><i class="fa-solid fa-envelope" style="margin-right: 5px;"></i>${correo}</p>
                    <span style="display: inline-block; margin-top: 12px; padding: 4px 12px; background: rgba(59,130,246,0.1); color: var(--color-primary); border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Administrador</span>
                </div>
            </div>

            <div style="padding: 0 35px; position: relative; z-index: 1;">
                <!-- DATOS DE ACCESO / CUENTA -->
                <div style="padding: 30px 0 35px;">
                    <h5 style="font-size: 13px; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 25px;">Acceso al Sistema</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
                        ${cell('Correo Electrónico', correo, 2)}
                        ${cell('Nivel de Acceso', 'Acceso Total')}
                        ${cell('Rol de Usuario', 'Administrador del Sistema')}
                        ${cell('Estado de Cuenta', 'Activo')}
                    </div>
                </div>
            </div>
        </div>`,
        showConfirmButton: false,
        showCloseButton: true,
        width: '750px',
        customClass: {
            popup: 'pm-popup',
            closeButton: 'pm-close-x',
            htmlContainer: 'pm-html-container'
        }
    });
}

// ==========================================
// MÓDULO POSGRADOS (Admin)
// ==========================================

let posgradoSeleccionadoId = null;

async function cargarPosgradosAdmin() {
    const contenedor = document.getElementById("contenedorPosgrados");
    if (!contenedor) return;

    try {
        const respuesta = await fetch("/api/posgrado");
        if (!respuesta.ok) throw new Error("Error al obtener posgrados");
        const posgrados = await respuesta.json();

        contenedor.innerHTML = "";

        if (posgrados.length === 0) {
            contenedor.innerHTML = "<p class='text-muted text-center py-4 w-100' style='grid-column: 1 / -1;'>No hay posgrados registrados.</p>";
            return;
        }

        posgrados.forEach(posgrado => {
            const card = document.createElement("div");
            card.className = "card p-4 shadow-sm text-center d-flex flex-column align-items-center justify-content-center";
            card.style.cursor = "pointer";
            card.style.transition = "transform 0.2s, box-shadow 0.2s";
            card.style.minHeight = "180px";
            card.style.backgroundColor = "var(--color-card-bg)";
            card.style.border = "1px solid var(--color-border)";
            
            // Hover effect can be done via CSS, but we'll inline a simple transform here for safety
            card.onmouseover = () => { card.style.transform = "translateY(-5px)"; card.style.boxShadow = "var(--shadow-lg)"; };
            card.onmouseout = () => { card.style.transform = "none"; card.style.boxShadow = "var(--shadow-sm)"; };
            
            card.onclick = () => abrirDetallePosgrado(posgrado.id, posgrado.nombre);

            let icono = "fa-graduation-cap";
            let colorIcono = "#3b82f6"; // Azul por defecto
            
            if (posgrado.tipo === "MAESTRIA") {
                icono = "fa-book-open-reader";
                colorIcono = "#8b5cf6"; // Morado
            } else if (posgrado.tipo === "DOCTORADO") {
                icono = "fa-microscope";
                colorIcono = "#10b981"; // Verde
            }

            const estadoBadge = posgrado.estadoPosgrado 
                ? `<span class="badge bg-success bg-opacity-10 text-success mt-2">Activo</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger mt-2">Inactivo</span>`;

            card.innerHTML = `
                <div class="mb-3" style="font-size: 3rem; color: ${colorIcono};">
                    <i class="fa-solid ${icono}"></i>
                </div>
                <h5 class="mb-1 fw-bold" style="color: var(--color-text);">${posgrado.nombre}</h5>
                <p class="text-muted small mb-0">${posgrado.tipo}</p>
                ${estadoBadge}
            `;

            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar posgrados:", error);
        contenedor.innerHTML = "<p class='text-danger text-center py-4 w-100' style='grid-column: 1 / -1;'><i class='fa-solid fa-triangle-exclamation me-2'></i>Error al cargar los programas de posgrado.</p>";
    }
}

async function abrirDetallePosgrado(id, nombre) {
    posgradoSeleccionadoId = id;
    
    document.getElementById("tituloDetallePosgrado").textContent = nombre;
    
    document.getElementById("vistaTarjetasPosgrados").style.display = "none";
    document.getElementById("vistaDetallePosgrado").style.display = "block";
    
    await cargarOpcionesDelPosgrado(id);
}

function cerrarDetallePosgrado() {
    posgradoSeleccionadoId = null;
    document.getElementById("vistaDetallePosgrado").style.display = "none";
    document.getElementById("vistaTarjetasPosgrados").style.display = "block";
}

async function cargarOpcionesDelPosgrado(posgrado_id) {
    const tbody = document.getElementById("tablaOpcionesPosgrado");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i> Cargando especialidades...</td></tr>`;

    try {
        const respuesta = await fetch(`/api/posgrado/opciones/todas/${posgrado_id}`);
        if (!respuesta.ok) throw new Error("Error en la respuesta del servidor");
        const opciones = await respuesta.json();

        tbody.innerHTML = "";

        if (opciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted"><i class="fa-solid fa-folder-open me-2"></i> No hay especialidades registradas para este posgrado.</td></tr>`;
            return;
        }

        opciones.forEach(opc => {
            const fila = document.createElement("tr");
            fila.style.cursor = "pointer";
            fila.onclick = () => abrirModalEditarOpcion(opc);
            
            const badgeEstado = opc.activo 
                ? `<span class="soft-badge soft-badge-success"><i class="fa-solid fa-check-circle me-1"></i> Disponible</span>`
                : `<span class="soft-badge soft-badge-danger"><i class="fa-solid fa-xmark-circle me-1"></i> No Disponible</span>`;

            fila.innerHTML = `
                <td class="fw-bold" style="color: var(--color-text);">${opc.nombre}</td>
                <td style="color: var(--color-text-muted); font-size: 0.9rem; max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${opc.descripcion || '<span class="text-muted fst-italic">Sin descripción</span>'}
                </td>
                <td>
                    <div style="cursor: pointer;" onclick='event.stopPropagation(); cambiarEstadoOpcion(${JSON.stringify(opc).replace(/'/g, "&#39;")})' title="Haz clic para cambiar estado">
                        ${badgeEstado}
                    </div>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary rounded-circle shadow-sm" style="width: 32px; height: 32px; padding: 0;" onclick='event.stopPropagation(); abrirModalEditarOpcion(${JSON.stringify(opc).replace(/'/g, "&#39;")})' title="Editar especialidad">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar opciones del posgrado:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i> Error al cargar los datos.</td></tr>`;
    }
}

function abrirModalNuevaOpcion() {
    document.getElementById("formOpcionPosgrado").reset();
    document.getElementById("opcion_id").value = "";
    document.getElementById("tituloModalOpcionPosgrado").textContent = "Nueva Especialidad";
    
    const modal = new bootstrap.Modal(document.getElementById('modalOpcionPosgrado'));
    modal.show();
}

function abrirModalEditarOpcion(opcion) {
    document.getElementById("formOpcionPosgrado").reset();
    document.getElementById("opcion_id").value = opcion.id;
    document.getElementById("opcion_nombre").value = opcion.nombre;
    document.getElementById("opcion_descripcion").value = opcion.descripcion || "";
    document.getElementById("opcion_activo").checked = opcion.activo === 1;
    
    document.getElementById("tituloModalOpcionPosgrado").textContent = "Editar Especialidad";
    
    const modal = new bootstrap.Modal(document.getElementById('modalOpcionPosgrado'));
    modal.show();
}

document.getElementById("formOpcionPosgrado")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!posgradoSeleccionadoId) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No hay un posgrado seleccionado.' });
        return;
    }

    const id = document.getElementById("opcion_id").value;
    const nombre = document.getElementById("opcion_nombre").value;
    const descripcion = document.getElementById("opcion_descripcion").value;
    const activo = document.getElementById("opcion_activo").checked ? 1 : 0;

    const payload = {
        posgrado_id: posgradoSeleccionadoId,
        nombre,
        descripcion,
        activo
    };

    try {
        let url = "/api/posgrado/opciones";
        let method = "POST";

        if (id) {
            url = `/api/posgrado/opciones/${id}`;
            method = "PUT";
        }

        const respuesta = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: resultado.mensaje || 'Especialidad guardada correctamente.',
                timer: 1500,
                showConfirmButton: false
            });
            
            const modalElement = document.getElementById("modalOpcionPosgrado");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            
            cargarOpcionesDelPosgrado(posgradoSeleccionadoId);
            
            // Si hay una función global que actualiza selectores (ej. en convocatorias)
            if (typeof cargarOpcionesPosgradoGlobal === "function") {
                cargarOpcionesPosgradoGlobal();
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: resultado.mensaje || 'No se pudo guardar la especialidad.' });
        }
    } catch (error) {
        console.error("Error al guardar opción:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error en la conexión.' });
    }
});

async function cambiarEstadoOpcion(opcion) {
    const nuevoEstado = opcion.activo === 1 ? 0 : 1;
    const accionTexto = nuevoEstado === 1 ? 'activar' : 'desactivar';

    const confirmacion = await Swal.fire({
        title: `¿${accionTexto.charAt(0).toUpperCase() + accionTexto.slice(1)} especialidad?`,
        text: `La especialidad pasará a estar ${nuevoEstado === 1 ? 'disponible' : 'no disponible'} para selección.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const payload = {
            nombre: opcion.nombre,
            descripcion: opcion.descripcion || "",
            activo: nuevoEstado
        };

        const respuesta = await fetch(`/api/posgrado/opciones/${opcion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success !== false) {
            Swal.fire({
                icon: 'success',
                title: 'Estado actualizado',
                text: 'El estado de la especialidad ha sido cambiado.',
                timer: 1500,
                showConfirmButton: false
            });
            cargarOpcionesDelPosgrado(posgradoSeleccionadoId);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: resultado.mensaje || 'No se pudo cambiar el estado.' });
        }
    } catch (error) {
        console.error("Error al cambiar estado:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error en la conexión.' });
    }
}

/* =========================================================
   MÓDULO DE DOCUMENTOS (EXPLORADOR)
========================================================= */

let exploradorDatos = [];
let exploradorCurrentPath = [];

async function cargarExploradorDocumentos() {
    const grid = document.getElementById('exploradorGrid');
    if (!grid) return;
    
    try {
        mostrarLoader();
        const token = sessionStorage.getItem("token") || "";
        const respuesta = await fetch('/api/documentos/explorador', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (respuesta.status === 404 || respuesta.status === 401 || respuesta.status === 403) {
            console.error("Error de permisos o endpoint no encontrado");
            return;
        }

        const data = await respuesta.json();
        if (data.success) {
            exploradorDatos = data.documentos;
            exploradorIrRaiz();
        } else {
            console.error(data.mensaje);
        }
    } catch(err) {
        console.error("Error al cargar explorador de documentos:", err);
    } finally {
        ocultarLoader();
    }
}

window.cargarExploradorDocumentos = cargarExploradorDocumentos;

function exploradorIrRaiz() {
    exploradorCurrentPath = [];
    renderExplorador();
}
window.exploradorIrRaiz = exploradorIrRaiz;

function exploradorEntrarDirectorio(tipo, valor, nombreAMostrar) {
    exploradorCurrentPath.push({ tipo, valor, nombreAMostrar });
    renderExplorador();
}
window.exploradorEntrarDirectorio = exploradorEntrarDirectorio;

function exploradorIrNivel(index) {
    if (index === -1) {
        exploradorIrRaiz();
    } else {
        exploradorCurrentPath = exploradorCurrentPath.slice(0, index + 1);
        renderExplorador();
    }
}
window.exploradorIrNivel = exploradorIrNivel;

function renderExplorador() {
    const grid = document.getElementById('exploradorGrid');
    const breadcrumbs = document.getElementById('docBreadcrumbs');
    if(!grid || !breadcrumbs) return;

    // 1. Render Breadcrumbs
    let breadcrumbsHTML = `<span class="breadcrumb-item" style="cursor: pointer; color: var(--color-primary);" onclick="exploradorIrNivel(-1)"><i class="fa-solid fa-house me-2"></i>Inicio</span>`;
    
    exploradorCurrentPath.forEach((p, idx) => {
        const isLast = idx === exploradorCurrentPath.length - 1;
        breadcrumbsHTML += `<span class="breadcrumb-item ${isLast ? 'active fw-bold' : ''}" style="color: ${isLast ? 'var(--color-text)' : 'var(--color-primary)'}; ${!isLast ? 'cursor: pointer;' : ''}" ${!isLast ? `onclick="exploradorIrNivel(${idx})"` : ''}>${p.nombreAMostrar}</span>`;
    });
    breadcrumbs.innerHTML = breadcrumbsHTML;

    // 2. Filtrar datos
    let itemsHTML = '';

    if (exploradorCurrentPath.length === 0) {
        // Nivel 0: Agrupar por Programa
        const programas = [...new Set(exploradorDatos.map(d => d.programa))];
        if(programas.length === 0) {
            itemsHTML = `<div class="text-center w-100 py-5 text-muted" style="grid-column: 1 / -1;"><p>No hay documentos disponibles en el sistema.</p></div>`;
        }
        programas.forEach(prog => {
            itemsHTML += `
                <div class="explorer-folder" onclick="exploradorEntrarDirectorio('programa', '${prog}', '${prog}')">
                    <i class="fa-solid fa-folder explorer-icon"></i>
                    <span class="explorer-name">${prog}</span>
                </div>
            `;
        });
    } else if (exploradorCurrentPath.length === 1) {
        // Nivel 1: Agrupar por Aspirante dentro del programa
        const programaSeleccionado = exploradorCurrentPath[0].valor;
        const docsPrograma = exploradorDatos.filter(d => d.programa === programaSeleccionado);
        
        const aspirantesMap = new Map();
        docsPrograma.forEach(d => {
            if(!aspirantesMap.has(d.aspiranteId)) {
                aspirantesMap.set(d.aspiranteId, { id: d.aspiranteId, nombre: d.aspiranteNombreCompleto });
            }
        });

        if(aspirantesMap.size === 0) {
            itemsHTML = `<div class="text-center w-100 py-5 text-muted" style="grid-column: 1 / -1;"><p>No hay aspirantes en este programa.</p></div>`;
        }

        aspirantesMap.forEach(aspi => {
            itemsHTML += `
                <div class="explorer-folder" onclick="exploradorEntrarDirectorio('aspirante', ${aspi.id}, '${aspi.nombre}')">
                    <i class="fa-solid fa-user-graduate explorer-icon" style="color: #4cc9f0;"></i>
                    <span class="explorer-name">${aspi.nombre}</span>
                </div>
            `;
        });
    } else if (exploradorCurrentPath.length === 2) {
        // Nivel 2: Mostrar Documentos del aspirante
        const programaSeleccionado = exploradorCurrentPath[0].valor;
        const aspiranteSeleccionado = exploradorCurrentPath[1].valor;
        const documentos = exploradorDatos.filter(d => d.programa === programaSeleccionado && d.aspiranteId === aspiranteSeleccionado);

        if(documentos.length === 0) {
            itemsHTML = `<div class="text-center w-100 py-5 text-muted" style="grid-column: 1 / -1;"><p>No hay documentos para este aspirante.</p></div>`;
        }

        documentos.forEach(doc => {
            let badgeHtml = '';
            let bgClass = 'bg-secondary';
            if(doc.estadoValidacion === 'PENDIENTE') bgClass = 'bg-warning text-dark';
            else if(doc.estadoValidacion === 'APROBADO') bgClass = 'bg-success';
            else if(doc.estadoValidacion === 'RECHAZADO') bgClass = 'bg-danger';

            badgeHtml = `<span class="badge ${bgClass} mt-2" style="font-size:0.7rem">${doc.estadoValidacion}</span>`;

            itemsHTML += `
                <div class="explorer-file" onclick="verDocumentoExplorer('${doc.rutaArchivo}')">
                    <i class="fa-solid fa-file-pdf explorer-icon"></i>
                    <span class="explorer-name" title="${doc.requisitoNombre}">${doc.requisitoNombre}</span>
                    ${badgeHtml}
                </div>
            `;
        });
    }

    grid.innerHTML = itemsHTML;
}

window.verDocumentoExplorer = function(ruta) {
    const url = `/uploads/${ruta}`;
    window.open(url, '_blank');
};
