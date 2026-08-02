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
    cargarOpcionesPosgradoGlobal();
    cargarAspirantes();
    cargarNotificacionesAdmin(); // Inicializar panel de notificaciones
    cargarCatalogoRequisitosUI(); // Inicializar catálogo de requisitos
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
            document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario';
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

async function cargarUsuarios() {
    mostrarLoader();
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

            const ini = (usuario.correo || 'U').charAt(0).toUpperCase();

            fila.innerHTML = `
                <td><span class="fw-bold opacity-75">#${usuario.id}</span></td>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="table-avatar">${ini}</div>
                        <span class="fw-bold">${usuario.correo}</span>
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
    } catch (error) {
        console.error("Error en cargarUsuarios:", error);
    } finally {
        ocultarLoader();
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
            <h6 class="fw-bold mb-3" style="color: var(--color-primary);"><i class="fa-solid fa-user-graduate me-2"></i> Detalles de Aspirante</h6>
            <div class="row custom-scroll" style="max-height: 390px; overflow-y: auto; overflow-x: hidden; padding-right: 8px;">
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Nombre <span class="text-danger">*</span></label><input type="text" id="det_nombre" class="form-control form-control-sm" ${inputStyle} value="${detalles.nombre || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Primer Apellido <span class="text-danger">*</span></label><input type="text" id="det_primerApellido" class="form-control form-control-sm" ${inputStyle} value="${detalles.primerApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Segundo Apellido</label><input type="text" id="det_segundoApellido" class="form-control form-control-sm" ${inputStyle} value="${detalles.segundoApellido || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>CURP <span class="text-danger">*</span></label><input type="text" id="det_curp" class="form-control form-control-sm" ${inputStyle} value="${detalles.curp || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Teléfono <span class="text-danger">*</span></label><input type="text" id="det_telefono" class="form-control form-control-sm" ${inputStyle} value="${detalles.telefono || ''}"></div>
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
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Código Postal</label><input type="number" id="det_direccionPostal" class="form-control form-control-sm" ${inputStyle} value="${detalles.direccionPostal || ''}"></div>
                
                <h6 class="fw-bold mt-4 mb-3 w-100 border-bottom pb-2" style="color: var(--color-text) !important; border-color: var(--color-border) !important;"><i class="fa-solid fa-graduation-cap me-2"></i> Antecedentes Académicos</h6>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Licenciatura <span class="text-danger">*</span></label><input type="text" id="det_licenciatura" class="form-control form-control-sm" ${inputStyle} value="${detalles.licenciatura || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Institución (Licenciatura) <span class="text-danger">*</span></label><input type="text" id="det_institucionLicenciatura" class="form-control form-control-sm" ${inputStyle} value="${detalles.institucionLicenciatura || ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Fecha de Egreso <span class="text-danger">*</span></label><input type="date" id="det_fechaEgreso" class="form-control form-control-sm" ${inputStyle} value="${detalles.fechaEgreso ? detalles.fechaEgreso.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Fecha de Titulación <span class="text-danger">*</span></label><input type="date" id="det_fechaTitulacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.fechaTitulacion ? detalles.fechaTitulacion.split('T')[0] : ''}"></div>
                <div class="col-md-4 mb-2"><label class="form-label small" ${labelStyle}>Promedio <span class="text-danger">*</span></label><input type="number" step="0.01" id="det_promedio" class="form-control form-control-sm" ${inputStyle} value="${detalles.promedio || ''}"></div>
                <div class="col-md-12 mb-2"><label class="form-label small" ${labelStyle}>Otros Estudios</label><input type="text" id="det_otrosEstudios" class="form-control form-control-sm" ${inputStyle} value="${detalles.otrosEstudios || ''}"></div>

                <h6 class="fw-bold mt-3 mb-2 w-100 border-bottom pb-1" style="color: var(--color-text) !important; border-color: var(--color-border) !important;"><i class="fa-solid fa-briefcase me-2"></i> Ocupación</h6>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Ocupación Actual</label><input type="text" id="det_ocupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.ocupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Teléfono (Ocupación)</label><input type="text" id="det_telefonoOcupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.telefonoOcupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Ciudad (Ocupación)</label><input type="text" id="det_ciudadOcupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.ciudadOcupacion || ''}"></div>
                <div class="col-md-6 mb-2"><label class="form-label small" ${labelStyle}>Estado (Ocupación)</label><input type="text" id="det_estadoOcupacion" class="form-control form-control-sm" ${inputStyle} value="${detalles.estadoOcupacion || ''}"></div>
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

        const requiredAspirante = [
            { id: 'nombre', label: 'Nombre' },
            { id: 'primerApellido', label: 'Primer Apellido' },
            { id: 'curp', label: 'CURP' },
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
            if (!detalles[campo.id]) faltan.push(campo.label);
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
            document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Usuario';
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

async function cargarConvocatorias() {
    const contenedor = document.getElementById("contenedorConvocatorias");
    const totalConvocatorias = document.getElementById("totalConvocatorias");

    if (!contenedor) return;

    mostrarLoader();
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
    } finally {
        ocultarLoader();
    }
}

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

let opcionesSeleccionadas = [];

document.getElementById("convocatoria_opciones")?.addEventListener("change", (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    const opc = todasLasOpcionesPosgrado.find(o => o.id === id);
    if (opc && !opcionesSeleccionadas.find(s => s.idOpcionPosgrado === id)) {
        opcionesSeleccionadas.push({ idOpcionPosgrado: id, cupos: null, nombre: opc.nombre });
        renderizarChipsOpciones();
    }
    e.target.value = ""; // reset
});

function renderizarChipsOpciones() {
    const container = document.getElementById("contenedorChipsOpciones");
    if (!container) return;
    let html = "";
    opcionesSeleccionadas.forEach(op => {
        const cuposVal = op.cupos !== null ? op.cupos : "";
        html += `
            <div class="badge border d-flex align-items-center p-2" id="chip_opc_${op.idOpcionPosgrado}" style="background: var(--color-bg); color: var(--color-text); border-color: var(--color-border) !important;">
                <span class="me-2 fw-semibold">${op.nombre}</span>
                <input type="number" class="form-control form-control-sm cupo-input text-center" style="width: 70px; height: 26px; font-size: 0.8rem; background: var(--color-input-bg); color: var(--color-text); border: 1px solid var(--color-border);" placeholder="Cupos" value="${cuposVal}" onchange="actualizarCupo(${op.idOpcionPosgrado}, this.value)">
                <button type="button" class="btn-close ms-2" style="font-size: 0.6rem;" onclick="removerOpcion(${op.idOpcionPosgrado})"></button>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.actualizarCupo = function (id, val) {
    const op = opcionesSeleccionadas.find(o => o.idOpcionPosgrado === id);
    if (op) op.cupos = val ? parseInt(val) : null;
};

window.removerOpcion = function (id) {
    opcionesSeleccionadas = opcionesSeleccionadas.filter(o => o.idOpcionPosgrado !== id);
    renderizarChipsOpciones();
};

function renderizarOpcionesPorPosgrado(posgradoId, opcionesSeleccionadasPrevias = []) {
    const selectOpciones = document.getElementById("convocatoria_opciones");
    if (!selectOpciones) return;

    selectOpciones.innerHTML = '<option value="">Selecciona opciones...</option>';
    opcionesSeleccionadas = [];

    if (!posgradoId) {
        renderizarChipsOpciones();
        return;
    }

    // Actualizar campos mostrados según el tipo de posgrado
    const posgrado = todosLosPosgrados.find(p => p.id == posgradoId);
    if (posgrado) {
        toggleCamposPorTipo(posgrado.tipo);
    }

    const opcionesPosgrado = todasLasOpcionesPosgrado.filter(op => op.posgrado_id == posgradoId);

    opcionesPosgrado.forEach(op => {
        const option = document.createElement("option");
        option.value = op.id;
        option.textContent = op.nombre;
        selectOpciones.appendChild(option);

        const sel = opcionesSeleccionadasPrevias.find(s => s.idOpcionPosgrado == op.id || s.opcion_posgrado_id == op.id);
        if (sel) {
            opcionesSeleccionadas.push({ idOpcionPosgrado: op.id, cupos: sel.cupos, nombre: op.nombre });
        }
    });

    renderizarChipsOpciones();
}

document.getElementById("convocatoria_posgrado")?.addEventListener("change", (e) => {
    renderizarOpcionesPorPosgrado(e.target.value);
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
        renderizarOpcionesPorPosgrado(conv.posgrado_id, conv.opciones || []);

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

    // Enviar las opciones con sus cupos recopiladas
    const opciones = opcionesSeleccionadas.map(o => ({
        idOpcionPosgrado: o.idOpcionPosgrado,
        cupos: o.cupos
    }));

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
            const ini = (aspirante.nombre ? aspirante.nombre.charAt(0) : (correoReal ? correoReal.charAt(0) : 'A')).toUpperCase();

            const posgradoTxt = posgradoNombreReal || 'Sin posgrado seleccionado';
            const badgeClass = posgradoNombreReal ? 'soft-badge-primary' : 'soft-badge-secondary';

            tr.style.cursor = "pointer";
            tr.onclick = () => verExpedienteAspirante(aspirante.id);
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="table-avatar table-avatar-info">${ini}</div>
                        <span class="fw-bold">${nombreCompleto || 'Sin nombre'}</span>
                    </div>
                </td>
                <td style="color: var(--color-text-muted);">${correoReal}</td>
                <td><span class="soft-badge ${badgeClass}"><i class="fa-solid fa-graduation-cap me-1"></i> ${posgradoTxt}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 text-nowrap" style="font-size: 0.8rem;">
                        <i class="fa-solid fa-folder-open me-1"></i> Ver expediente
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    } catch (error) {
        console.error("Error al cargar aspirantes:", error);
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>Esperando API de aspirantes...</td></tr>";
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
        const perfil = expediente.perfil;
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
            solicitudes.forEach(sol => {
                let badgeSolicitud = "soft-badge-warning";
                if (sol.estado === "APROBADO") badgeSolicitud = "soft-badge-success";
                else if (sol.estado === "RECHAZADO") badgeSolicitud = "soft-badge-danger";

                const d = new Date(sol.creadoEn).toLocaleDateString();

                // Armar la lista de documentos
                let htmlDocs = "";
                if (sol.documentos && sol.documentos.length > 0) {
                    htmlDocs = `<div class="mt-4"><h6 class="small fw-bold text-muted mb-3" style="letter-spacing: 0.5px; text-transform: uppercase;">Documentos Adjuntos</h6><div class="border rounded" style="border-color: var(--color-border) !important; overflow: hidden;">`;
                    sol.documentos.forEach(doc => {
                        let classBadge = "soft-badge-warning";
                        if (doc.estadoValidacion === "APROBADO") { classBadge = "soft-badge-success"; }
                        else if (doc.estadoValidacion === "RECHAZADO") { classBadge = "soft-badge-danger"; }

                        htmlDocs += `
                            <div class="doc-row-premium" onclick="window.open('/api/files/${doc.rutaArchivo}?token=' + (sessionStorage.getItem('token') || localStorage.getItem('token')), '_blank')">
                                <div class="d-flex align-items-center">
                                    <i class="fa-solid fa-file-pdf doc-icon"></i>
                                    <span style="font-weight: 500; color: var(--color-text);">${doc.requisitoNombre}</span>
                                </div>
                                <div class="d-flex align-items-center">
                                    <span class="soft-badge ${classBadge} me-3">${doc.estadoValidacion}</span>
                                    <i class="fa-solid fa-chevron-right chevron-icon"></i>
                                </div>
                            </div>
                        `;
                    });
                    htmlDocs += `</div></div>`;
                } else {
                    htmlDocs = `<div class="mt-4 p-4 text-center rounded" style="background: var(--color-bg);"><p class="text-muted small mb-0"><i class="fa-solid fa-folder-minus me-2"></i> No se han adjuntado documentos aún.</p></div>`;
                }

                contSolicitudes.innerHTML += `
                    <div class="mb-5 pb-2" style="border-bottom: 1px dashed var(--color-border);">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h5 class="fw-bold mb-1" style="color: var(--color-text);">${sol.convocatoriaNombre}</h5>
                                ${sol.opcionNombre ? `<div class="mb-1"><span class="soft-badge soft-badge-secondary"><i class="fa-solid fa-layer-group me-1"></i> Opción: ${sol.opcionNombre}</span></div>` : ''}
                                <div class="text-muted small mt-1" style="font-weight: 500;">
                                    <span>Iniciado el: ${d}</span> &nbsp;&bull;&nbsp; <span>${sol.modalidadNombre || 'Sin modalidad'}</span>

                                </div>
                            </div>
                            <span class="soft-badge ${badgeSolicitud} mt-1">${sol.estado}</span>
                        </div>
                        ${htmlDocs}
                    </div>
                `;
            });
        }

        // Intercambiar vistas
        document.getElementById("vistaTablaAspirantes").classList.add("d-none");
        document.getElementById("vistaPerfilAspirante").classList.remove("d-none");

    } catch (error) {
        console.error("Error al cargar expediente:", error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el expediente del aspirante.', confirmButtonColor: '#ef4444' });
    } finally {
        ocultarLoader();
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
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: resultado.mensaje || 'Aspirante actualizado con éxito',
                timer: 1500,
                showConfirmButton: false
            });
            const modalElement = document.getElementById("modalAspirante");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            cargarAspirantes();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: resultado.mensaje || 'Hubo un error al procesar la solicitud.', confirmButtonColor: '#ef4444' });
        }
    } catch (error) {
        console.error("Error al guardar aspirante:", error);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Ocurrió un error en la conexión con el servidor.', confirmButtonColor: '#ef4444' });
    }
});

// ==========================================
// MÓDULO NOTIFICACIONES
// ==========================================

// --- NOTIFICATIONS CHAT STATE ---
let notificacionActivaId = null;
let notificacionesGlobales = [];

async function cargarNotificacionesAdmin() {
    const contenedor = document.getElementById("listaNotificacionesChat");
    if (!contenedor) return;

    mostrarLoader();
    try {
        const respuesta = await fetch("/api/notificaciones");
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        notificacionesGlobales = await respuesta.json();
        contenedor.innerHTML = "";

        if (!notificacionesGlobales || notificacionesGlobales.length === 0) {
            contenedor.innerHTML = `<div class="p-4 text-center text-muted small">
                <i class="fa-solid fa-inbox fs-3 mb-2 opacity-50"></i><br>No hay mensajes.
            </div>`;
            return;
        }

        notificacionesGlobales.forEach(notif => {
            const item = document.createElement("div");
            item.className = "chat-item";
            if (notificacionActivaId === notif.id) item.classList.add("active");

            let destinoIcon = 'fa-users';
            let destinoText = notif.destino || 'todos';
            let bgClass = 'bg-primary';

            if (destinoText === 'aspirantes') { destinoIcon = 'fa-graduation-cap'; bgClass = 'bg-info'; }
            if (destinoText === 'docentes') { destinoIcon = 'fa-chalkboard-user'; bgClass = 'bg-warning'; }
            if (destinoText === 'secretario') { destinoIcon = 'fa-file-signature'; bgClass = 'bg-success'; }

            let estadoIcon = notif.activa == 1 || notif.activa === 'true' || notif.activa === true ? '<i class="fa-solid fa-eye text-success"></i>' : '<i class="fa-solid fa-eye-slash text-danger"></i>';

            const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
            const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            item.onclick = () => mostrarLecturaNotificacion(notif.id);

            item.innerHTML = `
                <div class="chat-avatar ${bgClass}"><i class="fa-solid ${destinoIcon}"></i></div>
                <div class="chat-details">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div class="chat-title">${notif.nombre}</div>
                        <div class="chat-meta" style="font-size: 11px;">${timeStr}</div>
                    </div>
                    <div class="chat-preview">${estadoIcon} ${notif.mensaje}</div>
                </div>
            `;
            contenedor.appendChild(item);
        });
    } catch (error) {
        console.warn("Error al cargar notificaciones:", error);
        contenedor.innerHTML = `<div class="p-4 text-center text-danger small"><i class="fa-solid fa-plug-circle-exclamation mb-2"></i><br>Error al cargar.</div>`;
    } finally {
        ocultarLoader();
    }
}

function mostrarRedaccionNotificacion() {
    limpiarFormularioNotificacion();
    document.getElementById("chatReadMode").style.display = "none";
    document.getElementById("chatComposeMode").style.display = "flex";

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
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
    document.getElementById("chatReadTitle").innerText = "Selecciona un mensaje";
    document.getElementById("chatReadDestino").innerText = "Para leer los detalles";
    document.getElementById("btnEliminarNotifChat").style.display = "none";

    const body = document.getElementById("chatReadBody");
    body.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100 text-muted">
            <div class="text-center">
                <i class="fa-regular fa-comments fa-3x mb-3 opacity-50"></i>
                <p>Selecciona una notificación de la lista <br>para ver el mensaje completo.</p>
            </div>
        </div>
    `;
}

function mostrarLecturaNotificacion(id) {
    notificacionActivaId = id;
    document.getElementById("chatComposeMode").style.display = "none";
    document.getElementById("chatReadMode").style.display = "flex";

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    // Refrescar clases active re-renderizando listado rápido
    cargarNotificacionesAdmin();

    const notif = notificacionesGlobales.find(n => n.id === id);
    if (!notif) return;

    let destinoText = notif.destino || 'todos';
    let estadoText = notif.activa == 1 || notif.activa === 'true' || notif.activa === true ? '<span class="text-success fw-bold"><i class="fa-solid fa-eye"></i> Visible</span>' : '<span class="text-danger fw-bold"><i class="fa-solid fa-eye-slash"></i> Oculta</span>';

    document.getElementById("chatReadTitle").innerText = notif.nombre;
    document.getElementById("chatReadDestino").innerText = `Enviado a: ${destinoText}`;
    document.getElementById("btnEliminarNotifChat").style.display = "inline-block";

    const dateObj = notif.creado_en ? new Date(notif.creado_en) : new Date();
    const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    let editadoHtml = '';
    if (notif.editado_en && notif.creado_en && notif.editado_en !== notif.creado_en) {
        const editDate = new Date(notif.editado_en);
        // Si hay una diferencia significativa de más de 5 segundos, se considera editado
        if (Math.abs(editDate - dateObj) > 5000) {
            editadoHtml = `<span class="ms-2 text-muted fst-italic" style="font-size: 10px;">(Editado)</span>`;
        }
    }

    const body = document.getElementById("chatReadBody");
    body.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <span style="background: var(--color-border); padding: 2px 8px; border-radius: 12px; font-size: 11px; color: var(--color-text-muted); font-weight: bold;">${dateStr}</span>
        </div>
        <div class="chat-bubble">
            <div class="chat-bubble-title">${notif.nombre}</div>
            <div class="chat-bubble-text">${notif.mensaje}</div>
            <div class="chat-bubble-footer d-flex justify-content-between">
                <span><i class="fa-solid fa-user me-1"></i> Destino: ${destinoText} ${notif.destino === 'individual' ? `(ID: ${notif.idDestino})` : ''}</span>
                <span>${timeStr} ${editadoHtml}</span>
            </div>
            <div class="mt-2 text-end">${estadoText}</div>
        </div>
        <div class="text-center mt-4">
            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" onclick="editarNotificacion(${notif.id})">
                <i class="fa-solid fa-pen-to-square"></i> Editar este mensaje
            </button>
        </div>
    `;
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
                title: '¡Enviado!',
                text: resultado.mensaje || 'Notificación procesada con éxito.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            limpiarFormularioNotificacion();
            cerrarRedaccionNotificacion();
            cargarNotificacionesAdmin();

            // Si es edición, volver a leer el mensaje (luego de recargar la lista el id sigue siendo el mismo)
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
        title: '¿Eliminar Mensaje?',
        text: "Este mensaje será eliminado. ¡No se puede deshacer!",
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
            Swal.fire('¡Eliminado!', 'El mensaje ha sido eliminado.', 'success');

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
    if(event) event.stopPropagation();
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
