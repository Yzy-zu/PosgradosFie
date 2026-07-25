document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar enrutador
    initRouter();

    // 2. Cargar métricas de inicio
    cargarMetricas();

    // 3. Socket.io para actualización en tiempo real
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('actualizacionSolicitudes', () => {
            cargarMetricas();
            const hash = window.location.hash;
            if (hash === '#aspirantes') cargarAspirantes();
            if (hash === '#convocatorias') cargarConvocatorias();
            if (hash === '#entrevistas') cargarEntrevistas();
        });
    }

    // 4. Listener para el formulario de entrevistas en el Modal
    // Se agregan ambos selectores comunes por seguridad de compatibilidad en HTML
    const formEntrevista = document.getElementById('formModalEntrevista') || document.getElementById('formEntrevista');
    if (formEntrevista) {
        formEntrevista.addEventListener('submit', guardarEntrevista);
    }

    // 5. Cierre de sesión
    const logoutBtn = document.getElementById('menuLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/login.html';
        });
    }
});

/* ==========================================================
   1. ENRUTADOR CLIENT-SIDE (#inicio, #convocatorias, etc.)
========================================================== */
function initRouter() {
    window.addEventListener('hashchange', navegar);
    navegar();
}

function navegar() {
    const hash = window.location.hash || '#inicio';
    const targetVistaId = `vista-${hash.replace('#', '')}`;

    // Ocultar vistas
    document.querySelectorAll('.vista-seccion').forEach(sec => sec.classList.add('d-none'));

    // Desactivar links
    document.querySelectorAll('.sidebar nav a').forEach(link => link.classList.remove('active'));

    // Mostrar vista activa
    const vistaActiva = document.getElementById(targetVistaId);
    if (vistaActiva) {
        vistaActiva.classList.remove('d-none');
    } else {
        document.getElementById('vista-inicio')?.classList.remove('d-none');
    }

    // Activar link sidebar
    const activeLink = document.querySelector(`.sidebar nav a[href="${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Cargar módulos
    switch (hash) {
        case '#inicio':
            cargarMetricas();
            break;
        case '#convocatorias':
            cargarConvocatorias();
            break;
        case '#aspirantes':
            cargarAspirantes();
            break;
        case '#entrevistas':
            cargarEntrevistas();
            break;
        case '#dictamenes':
            if (typeof cargarDictamenes === 'function') cargarDictamenes();
            break;
        case '#notificaciones':
            cargarNotificaciones();
            break;
    }
}

/* ==========================================================
   2. MÉTRICAS (INICIO)
========================================================== */
async function cargarMetricas() {
    try {
        const res = await fetch('/api/coordinador/metricas');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('cantSolicitudes').textContent = data.totales || 0;
            document.getElementById('cantPendientes').textContent = data.pendientes || 0;
            document.getElementById('cantEntrevistas').textContent = data.entrevistas || 0;
            document.getElementById('cantAceptados').textContent = data.aceptados || 0;
        }
    } catch (err) {
        console.error('Error al cargar métricas:', err);
    }
}

/* ==========================================================
   3. CONVOCATORIAS
========================================================== */
async function cargarConvocatorias() {
    const contenedor = document.getElementById('contenedorConvocatorias');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="col-12 text-center py-4 text-muted">
            <div class="spinner-border spinner-border-sm text-primary me-2"></div>
            Cargando convocatorias...
        </div>
    `;

    try {
        const res = await fetch('/api/convocatorias');
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const convocatorias = await res.json();
        contenedor.innerHTML = '';

        if (!convocatorias || convocatorias.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12 text-center py-4 text-muted">
                    <i class="fa-solid fa-folder-open fa-2x mb-2 d-block opacity-50"></i>
                    No hay convocatorias registradas en la base de datos.
                </div>
            `;
            return;
        }

        convocatorias.forEach(c => {
            const fInicioStr = c.fecha_inicio || c.fechaInicio;
            const fFinStr = c.fecha_fin || c.fechaFin;

            const fInicio = fInicioStr ? new Date(fInicioStr).toLocaleDateString('es-MX') : 'S/F';
            const fFin = fFinStr ? new Date(fFinStr).toLocaleDateString('es-MX') : 'S/F';

            const estatusTexto = (c.estatus || c.estado || '').toString().toUpperCase();
            const hoy = new Date();
            const fechaFinObj = fFinStr ? new Date(fFinStr) : null;

            const esActiva = (estatusTexto === 'ACTIVA' || c.activa === 1 || c.activa === true) &&
                             (!fechaFinObj || fechaFinObj >= hoy);

            const badgeEstado = esActiva 
                ? `<span class="badge bg-success px-3 py-1">Activa</span>`
                : `<span class="badge bg-secondary px-3 py-1">Cerrada</span>`;

            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6';

            col.innerHTML = `
                <div class="card h-100 text-center p-4 border shadow-sm hover-shadow" style="border-radius: 12px;">
                    <div class="mb-3">
                        <i class="fa-solid fa-file-signature" style="font-size: 2.8rem; color: #8b5cf6;"></i>
                    </div>
                    <h6 class="fw-bold mb-2 text-dark" style="font-size: 1.05rem;">
                        ${c.nombre || c.titulo || 'Convocatoria'}
                    </h6>
                    <p class="text-muted small mb-3">
                        ${fInicio} a ${fFin}
                    </p>
                    <div>
                        ${badgeEstado}
                    </div>
                </div>
            `;

            contenedor.appendChild(col);
        });

    } catch (err) {
        console.error('Error al cargar convocatorias:', err);
        contenedor.innerHTML = `
            <div class="col-12 text-center py-3 text-danger">
                <i class="fa-solid fa-circle-exclamation me-1"></i>
                Error al conectar con la base de datos de convocatorias.
            </div>
        `;
    }
}

/* ==========================================================
   4. ASPIRANTES (Tabla y Expediente)
========================================================== */
async function cargarAspirantes() {
    const tbody = document.getElementById('tablaAspirantesBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                Cargando lista de aspirantes...
            </td>
        </tr>`;

    try {
        const res = await fetch('/api/coordinador/aspirantes');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const aspirantes = await res.json();
        tbody.innerHTML = '';

        if (!aspirantes || aspirantes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No hay solicitudes registradas.</td></tr>`;
            return;
        }

        aspirantes.forEach((asp, index) => {
            const collapseId = `detallesAsp_${asp.id_solicitud || index}`;
            const trPrincipal = document.createElement('tr');
            const trDetalle = document.createElement('tr');

            trPrincipal.innerHTML = `
                <td class="py-3">
                    <div class="fw-bold text-dark">${asp.nombre_completo || 'Sin Nombre'}</div>
                    <small class="text-muted font-monospace">${asp.folio || 'Sin CURP'}</small>
                </td>
                <td>
                    <span class="fw-medium text-secondary">${asp.programa || asp.convocatoria_nombre || 'Sin asignación'}</span>
                </td>
                <td>
                    ${getBadgeDictamen(asp.dictamen || asp.estado)}
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary fw-medium" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#${collapseId}" 
                            aria-expanded="false" 
                            aria-controls="${collapseId}">
                        <i class="fa-solid fa-chevron-down me-1"></i> Detalles
                    </button>
                </td>
            `;

            trDetalle.innerHTML = `
                <td colspan="4" class="p-0 border-0">
                    <div class="collapse" id="${collapseId}">
                        <div class="p-3 my-2 bg-light rounded-3 border shadow-sm mx-2">
                            <div class="row align-items-center g-3">
                                <div class="col-md-3">
                                    <small class="text-muted d-block fw-bold mb-1">TIPO DE ADMISIÓN</small>
                                    <span class="badge bg-dark text-wrap">${asp.tipoAdmision || 'N/A'}</span>
                                </div>
                                <div class="col-md-2">
                                    <small class="text-muted d-block fw-bold mb-1">ESTACIÓN ACTUAL</small>
                                    <span class="badge bg-secondary">Estación ${asp.estacion_actual ?? 0}</span>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted d-block fw-bold mb-1">CONVOCATORIA</small>
                                    <span class="badge bg-info text-white">${asp.convocatoria_nombre || 'General'}</span>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <small class="text-muted d-block fw-bold mb-1">ACCIONES</small>
                                    <button class="btn btn-sm btn-info text-white me-1" onclick="verExpediente(${asp.id_aspirante})">
                                        <i class="fa-solid fa-folder me-1"></i> Expediente
                                    </button>
                                    <select class="form-select form-select-sm d-inline-block w-auto mt-1 mt-md-0" onchange="cambiarDictamen(${asp.id_solicitud}, this.value)">
                                        <option value="" disabled selected>Dictamen...</option>
                                        <option value="APROBADO">Aprobar</option>
                                        <option value="RECHAZADO">Rechazar</option>
                                        <option value="EN_REVISION">En Revisión</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            `;

            tbody.appendChild(trPrincipal);
            tbody.appendChild(trDetalle);
        });

    } catch (err) {
        console.error('Error al cargar la tabla de aspirantes:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-danger">
                    <i class="fa-solid fa-circle-exclamation me-1"></i> Error al cargar aspirantes.
                </td>
            </tr>`;
    }
}

function getBadgeDictamen(dictamen) {
    switch (dictamen) {
        case 'APROBADO':
            return '<span class="badge bg-success">Aprobado</span>';
        case 'RECHAZADO':
            return '<span class="badge bg-danger">Rechazado</span>';
        case 'EN_REVISION':
            return '<span class="badge bg-warning text-dark">En Revisión</span>';
        default:
            return '<span class="badge bg-secondary">Pendiente</span>';
    }
}

async function cambiarDictamen(idSolicitud, nuevoDictamen) {
    const idUsuarioCoordinador = localStorage.getItem('idUsuario');

    if (!idUsuarioCoordinador) {
        Swal.fire('Sesión no encontrada', 'No se pudo verificar la identidad del coordinador.', 'warning');
        return;
    }

    try {
        const res = await fetch(`/api/coordinador/solicitud/${idSolicitud}/dictamen`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                dictamen: nuevoDictamen,
                idUsuarioCoordinador: idUsuarioCoordinador,
                observaciones: 'Dictamen emitido desde la plataforma de coordinación.'
            })
        });

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Dictamen actualizado',
                text: 'El estado de la solicitud ha sido registrado correctamente.',
                timer: 1500,
                showConfirmButton: false
            });
            cargarAspirantes();
            cargarMetricas();
        } else {
            Swal.fire('Error', 'No se pudo guardar el dictamen en la base de datos.', 'error');
        }
    } catch (err) {
        console.error('Error al actualizar dictamen:', err);
    }
}

async function verExpediente(idAspirante) {
    const modalElement = document.getElementById('modalExpediente');
    const modalBody = document.getElementById('modalExpedienteBody');
    if (!modalElement || !modalBody) return;
    
    const bsModal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Cargando expediente...</p>
        </div>
    `;
    bsModal.show();

    try {
        const res = await fetch(`/api/coordinador/aspirante/${idAspirante}/expediente`);
        if (!res.ok) {
            modalBody.innerHTML = `<div class="alert alert-danger">No se pudo obtener el expediente del aspirante.</div>`;
            return;
        }

        const { perfil = {}, documentos = [] } = await res.json();
        const docsUnicos = Array.isArray(documentos) 
            ? documentos.filter((doc, index, self) => 
                index === self.findIndex((d) => (
                    (d.id && d.id === doc.id) || 
                    (d.rutaArchivo && d.rutaArchivo === doc.rutaArchivo) ||
                    (d.nombreRequisito && d.nombreRequisito === doc.nombreRequisito)
                ))
              )
            : [];

        let docsHTML = (docsUnicos.length > 0)
            ? docsUnicos.map(d => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${d.nombreRequisito || 'Requisito'}</strong> 
                        <span class="badge bg-light text-dark ms-1">${d.categoria || 'GENERAL'}</span>
                    </div>
                    <a href="/uploads/${d.rutaArchivo}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fa-solid fa-file-pdf me-1"></i> Ver Documento
                    </a>
                </li>
            `).join('')
            : '<li class="list-group-item text-muted text-center py-3">No se han registrado documentos cargados.</li>';

        modalBody.innerHTML = `
            <div class="mb-3">
                <h6 class="text-primary fw-bold"><i class="fa-solid fa-user me-2"></i>Información Personal</h6>
                <div class="row g-2 mt-1">
                    <div class="col-md-6"><strong>Nombre:</strong> ${perfil.nombre || ''} ${perfil.primerApellido || ''} ${perfil.segundoApellido || ''}</div>
                    <div class="col-md-6"><strong>Correo:</strong> ${perfil.correo || 'N/A'}</div>
                    <div class="col-md-6"><strong>Teléfono:</strong> ${perfil.telefono || 'N/A'}</div>
                    <div class="col-md-6"><strong>Promedio:</strong> ${perfil.promedio || 'N/A'}</div>
                    <div class="col-12"><strong>Licenciatura:</strong> ${perfil.licenciatura || 'N/A'} (${perfil.institucionLicenciatura || 'N/A'})</div>
                </div>
            </div>
            <hr>
            <div>
                <h6 class="text-primary fw-bold mb-3"><i class="fa-solid fa-folder me-2"></i>Documentos del Expediente</h6>
                <ul class="list-group">${docsHTML}</ul>
            </div>
        `;
    } catch (err) {
        console.error('Error al cargar expediente:', err);
        modalBody.innerHTML = `<div class="alert alert-danger">Ocurrió un error al cargar la información.</div>`;
    }
}

/* ==========================================================
   5. ENTREVISTAS (Carga, Programación y Modal)
========================================================== */

let listaDocentesCache = null;

// A. Función para cargar la tabla de entrevistas
async function cargarEntrevistas() {
    console.log('Vista Entrevistas activa');
    const tbody = document.getElementById('tablaEntrevistasBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        Cargando la agenda de entrevistas...
    </td></tr>`;

    try {
        const res = await fetch('/api/coordinador/entrevistas');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const entrevistas = await res.json();
        tbody.innerHTML = '';

        if (!entrevistas || entrevistas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">
                <i class="fa-solid fa-calendar-xmark fa-2x mb-2 d-block opacity-50"></i>
                No hay entrevistas registradas o pendientes.
            </td></tr>`;
            return;
        }

        entrevistas.forEach(ent => {
            const tr = document.createElement('tr');
            
            const fechaValida = ent.fecha_entrevista && !isNaN(new Date(ent.fecha_entrevista).getTime());
            const fechaStr = fechaValida 
                ? new Date(ent.fecha_entrevista).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                : 'Sin agendar';
                
            const badgeEstado = fechaValida 
                ? `<span class="badge bg-success">Programada</span>` 
                : `<span class="badge bg-warning text-dark">Pendiente</span>`;

            const nombreEscapado = (ent.nombre_completo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const lugarEscapado = (ent.lugar_link || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const fechaParam = ent.fecha_entrevista ? ent.fecha_entrevista : '';

            tr.innerHTML = `
                <td class="py-3">
                    <div class="fw-bold text-dark">${ent.nombre_completo || 'Aspirante'}</div>
                    <small class="text-muted font-monospace">${ent.folio || ''}</small>
                </td>
                <td><span class="fw-medium text-secondary">${ent.programa || 'Sin asignación'}</span></td>
                <td><span class="fw-bold text-dark">${ent.docente_asignado || 'Sin docente'}</span></td>
                <td>
                    ${badgeEstado}
                    <small class="d-block text-muted mt-1 font-monospace">${fechaStr}</small>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="abrirModalEntrevista(${ent.id_solicitud}, '${nombreEscapado}', '${fechaParam}', '${ent.id_docente || ''}', '${lugarEscapado}')">
                        <i class="fa-solid fa-calendar-plus me-1"></i> ${fechaValida ? 'Editar' : 'Programar'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error al cargar entrevistas:', err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">
            <i class="fa-solid fa-triangle-exclamation me-1"></i> Error al conectar con el módulo de entrevistas.
        </td></tr>`;
    }
}

// B. Función para llenar el select de docentes (con Logs de depuración)
async function cargarDocentesSelect() {
    const select = document.getElementById('selectDocente');
    if (!select) {
        console.warn('⚠️ No se encontró el elemento <select id="selectDocente"> en el DOM.');
        return;
    }

    try {
        if (!listaDocentesCache || listaDocentesCache.length === 0) {
            console.log('🔄 Solicitando docentes al servidor (/api/coordinador/docentes)...');
            const res = await fetch('/api/coordinador/docentes');
            
            if (!res.ok) {
                console.error(`❌ Error al obtener docentes: HTTP ${res.status}`);
                select.innerHTML = '<option value="" disabled selected>Error al cargar docentes</option>';
                return;
            }

            listaDocentesCache = await res.json();
            console.log('✅ Docentes recibidos del servidor:', listaDocentesCache);
        }

        if (!Array.isArray(listaDocentesCache) || listaDocentesCache.length === 0) {
            console.warn('⚠️ La lista de docentes llegó vacía desde la base de datos/API.');
            select.innerHTML = '<option value="" disabled selected>No hay docentes disponibles</option>';
            return;
        }

        let htmlOptions = '<option value="" disabled selected>Seleccione un docente...</option>';
        
        listaDocentesCache.forEach(d => {
            const idDoc = d.id_docente ?? d.id_usuario ?? d.id_docente_asignado ?? d.id;
            const nombreDoc = d.nombre_completo ?? d.nombre_docente ?? d.nombre ?? `${d.nombres || ''} ${d.apellidos || ''}`.trim();

            if (idDoc !== undefined && nombreDoc) {
                htmlOptions += `<option value="${idDoc}">${nombreDoc}</option>`;
            } else {
                console.warn('⚠️ Objeto docente con formato no reconocido:', d);
            }
        });

        select.innerHTML = htmlOptions;

    } catch (err) {
        console.error('❌ Error crítico en cargarDocentesSelect:', err);
        select.innerHTML = '<option value="" disabled selected>Error de conexión</option>';
    }
}

// C. Función para abrir el modal de entrevista
async function abrirModalEntrevista(idSolicitud, nombreAspirante, fecha = '', idDocente = '', lugar = '') {
    const modalElement = document.getElementById('modalEntrevista');
    if (!modalElement) return;

    const inputSolicitud = document.getElementById('modalEntrevistaIdSolicitud');
    const txtNombre = document.getElementById('modalEntrevistaNombre');
    const inputFecha = document.getElementById('modalEntrevistaFecha');
    const inputHora = document.getElementById('modalEntrevistaHora');
    const inputLugar = document.getElementById('modalEntrevistaLugar');
    const selectDocente = document.getElementById('selectDocente');

    if (inputSolicitud) inputSolicitud.value = idSolicitud;
    if (txtNombre) txtNombre.textContent = nombreAspirante;
    
    // Formatear Fecha y Hora
    if (fecha && !isNaN(new Date(fecha).getTime())) {
        const dateObj = new Date(fecha);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        if (inputFecha) inputFecha.value = `${year}-${month}-${day}`;

        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        if (inputHora) inputHora.value = `${hours}:${minutes}`;
    } else {
        if (inputFecha) inputFecha.value = '';
        if (inputHora) inputHora.value = '';
    }
    
    if (inputLugar) inputLugar.value = lugar;

    // Cargar docentes en el select ANTES de establecer el valor
    await cargarDocentesSelect();

    if (selectDocente) {
        if (idDocente && idDocente !== 'null' && idDocente !== 'undefined') {
            selectDocente.value = String(idDocente);
        } else {
            selectDocente.value = '';
        }
    }

    const bsModal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    bsModal.show();
}

// D. Función para guardar/programar la entrevista
async function guardarEntrevista(e) {
    if (e) e.preventDefault();

    const idSolicitud = document.getElementById('modalEntrevistaIdSolicitud')?.value;
    const idDocente = document.getElementById('selectDocente')?.value;
    const fecha = document.getElementById('modalEntrevistaFecha')?.value;
    const hora = document.getElementById('modalEntrevistaHora')?.value;
    const lugar = document.getElementById('modalEntrevistaLugar')?.value;

    if (!idSolicitud || !idDocente || !fecha || !hora) {
        Swal.fire('Campos requeridos', 'Por favor selecciona el docente y asigna fecha y hora completas.', 'warning');
        return;
    }

    const fechaHoraCompleta = `${fecha}T${hora}:00`;

    try {
        const res = await fetch(`/api/coordinador/solicitud/${idSolicitud}/entrevista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_docente: idDocente,
                fecha_entrevista: fechaHoraCompleta,
                hora: hora,
                lugar_link: lugar
            })
        });

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Entrevista Agendada',
                text: 'Se guardó la información correctamente.',
                timer: 1500,
                showConfirmButton: false
            });

            const modalElement = document.getElementById('modalEntrevista');
            const bsModal = bootstrap.Modal.getInstance(modalElement);
            if (bsModal) bsModal.hide();

            cargarEntrevistas();
            cargarMetricas();
        } else {
            Swal.fire('Error', 'No se pudo guardar la entrevista.', 'error');
        }
    } catch (err) {
        console.error('Error al guardar la entrevista:', err);
    }
}

/* ==========================================================
   6. NOTIFICACIONES
========================================================== */
async function cargarNotificaciones() { 
    console.log('Vista Notificaciones activa'); 
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

            const tituloTexto = notif.titulo || notif.nombre || 'Sin título';

            let destinoIcon = 'fa-users';
            let destinoText = (notif.destino || 'todos').toLowerCase();
            let destinoBg = 'bg-primary bg-opacity-10 text-primary';

            if (destinoText === 'aspirantes') { destinoIcon = 'fa-graduation-cap'; destinoBg = 'bg-info bg-opacity-10 text-info'; }
            if (destinoText === 'docentes') { destinoIcon = 'fa-chalkboard-user'; destinoBg = 'bg-warning bg-opacity-10 text-warning'; }
            if (destinoText === 'secretario') { destinoIcon = 'fa-file-signature'; destinoBg = 'bg-success bg-opacity-10 text-success'; }

            let esActiva = notif.activa == 1 || notif.activa === 'true' || notif.activa === true || notif.estatus === 'Activa';
            let estadoClass = esActiva ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger';
            let estadoText = esActiva ? 'Activa' : 'Inactiva';

            tr.style.cursor = "pointer";
            if (typeof editarNotificacion === 'function') {
                tr.onclick = () => editarNotificacion(notif.id || notif.id_notificacion);
            }

            tr.innerHTML = `
                <td>${notif.id || notif.id_notificacion}</td>
                <td><span class="fw-bold text-dark">${tituloTexto}</span></td>
                <td><span class="text-muted small d-inline-block text-truncate" style="max-width: 250px;">${notif.mensaje || ''}</span></td>
                <td><span class="badge rounded-pill px-3 py-2 ${destinoBg}"><i class="fa-solid ${destinoIcon} me-1"></i> ${destinoText}</span></td>
                <td><span class="badge rounded-pill px-3 py-2 ${estadoClass}">${estadoText}</span></td>
            `;
            contenedor.appendChild(tr);
        });
    } catch (error) {
        console.warn("Error al cargar notificaciones:", error);
        contenedor.innerHTML = `<tr><td colspan='5' class='text-center text-muted py-5'>
            <i class="fa-solid fa-plug-circle-exclamation fs-2 mb-3 opacity-25"></i>
            <p class="mb-0">Error al conectar con el servidor de notificaciones.</p>
        </td></tr>`;
    }
}

// Expuestos al Scope Global para listeners en el DOM (onClick / inline events)
window.abrirModalEntrevista = abrirModalEntrevista;
window.guardarEntrevista = guardarEntrevista;
window.verExpediente = verExpediente;
window.cambiarDictamen = cambiarDictamen;