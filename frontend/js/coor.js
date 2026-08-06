let listaAspirantes = [];
let textoBusquedaAspirante = "";
let filtroEstadoAspirante = "TODOS";
let listaEntrevistas = [];
let listaDictamenes = [];
let filtroDictamen = "TODOS";
let textoBusquedaDictamen = "";


document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar enrutador
    initRouter();

    // 2. Cargar métricas de inicio
    cargarMetricas();
    configurarBuscadorAspirantes();
    configurarFiltrosAspirantes();
    cargarNotificaciones();

    // 3. Socket.io para actualización en tiempo real
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('actualizacionSolicitudes', () => {
            cargarMetricas();
            const hash = window.location.hash;
            if (hash === '#aspirantes') cargarAspirantes();
            if (
    typeof window.cargarConvocatorias ===
    "function"
) {
    window.cargarConvocatorias();
}
            if (hash === '#entrevistas') cargarEntrevistas();
        });
    }

    // 4. Delegación global de eventos submit Y click para el modal de entrevistas
    document.addEventListener('submit', (e) => {
        if (e.target && (e.target.id === 'formModalEntrevista' || e.target.id === 'formEntrevista')) {
            guardarEntrevista(e);
        }
    });

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
        case "#convocatorias":

    if (
        typeof window.cargarConvocatorias ===
        "function"
    ) {
        window.cargarConvocatorias();
    }

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
   2. MÉTRICAS DEL PANEL
========================================================== */

async function cargarMetricas() {

    try {

        const respuesta =
            await fetch(
                "/api/coordinador/metricas"
            );

        const datos =
            await respuesta
                .json()
                .catch(() => ({}));

        if (!respuesta.ok) {

            throw new Error(
                datos.mensaje ||
                "No se pudieron cargar las métricas."
            );
        }

        const solicitudes =
            document.getElementById(
                "cantSolicitudes"
            );

        const pendientes =
            document.getElementById(
                "cantPendientes"
            );

        const entrevistas =
            document.getElementById(
                "cantEntrevistas"
            );

        const aceptados =
            document.getElementById(
                "cantAceptados"
            );

        if (solicitudes) {
            solicitudes.textContent =
                Number(datos.totales || 0);
        }

        if (pendientes) {
            pendientes.textContent =
                Number(datos.pendientes || 0);
        }

        if (entrevistas) {
            entrevistas.textContent =
                Number(datos.entrevistas || 0);
        }

        if (aceptados) {
            aceptados.textContent =
                Number(datos.aceptados || 0);
        }

        console.log(
            "Métricas cargadas:",
            datos
        );

    } catch (error) {

        console.error(
            "Error al cargar métricas:",
            error
        );
    }
}

/* ==========================================================
   2. CONVOCATORIAS
========================================================== */
async function cargarConvocatoriasViejas() {
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

            const fInicio = fInicioStr ? fInicioStr.substring(0, 10) : 'S/F';
            const fFin = fFinStr ? fFinStr.substring(0, 10) : 'S/F';

            const estatusTexto = (c.estatus || c.estado || '').toString().toUpperCase();
            const hoy = new Date().toISOString().substring(0, 10);

            const esActiva = (estatusTexto === 'ACTIVA' || c.activa === 1 || c.activa === true) &&
                             (!fFinStr || fFin >= hoy);

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
  3. ASPIRANTES
========================================================== */
async function cargarAspirantes() {

    const tbody =
        document.getElementById(
            "tablaAspirantesBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td
                colspan="4"
                class="text-center py-4 text-muted">

                <div
                    class="spinner-border spinner-border-sm text-primary me-2">
                </div>

                Cargando lista de aspirantes...

            </td>
        </tr>
    `;

    try {

        const respuesta =
            await fetch(
                "/api/coordinador/aspirantes"
            );

        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );
        }

        const resultado =
            await respuesta.json();

        listaAspirantes =
            Array.isArray(resultado)
                ? resultado
                : Array.isArray(resultado.aspirantes)
                    ? resultado.aspirantes
                    : [];

        if (listaAspirantes.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="text-center py-4 text-muted">

                        No hay solicitudes registradas.

                    </td>
                </tr>
            `;

            return;
        }

        renderizarAspirantesFiltrados();

    } catch (error) {

        console.error(
            "Error al cargar la tabla de aspirantes:",
            error
        );

        listaAspirantes = [];

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="text-center py-4 text-danger">

                    <i class="fa-solid fa-circle-exclamation me-1"></i>
                    Error al cargar aspirantes.

                </td>
            </tr>
        `;
    }
}

/* ==========================================================
  4. FILTRAR Y MOSTRAR ASPIRANTES
========================================================== */

function renderizarAspirantesFiltrados() {

    const tbody =
        document.getElementById(
            "tablaAspirantesBody"
        );

    if (!tbody) {
        return;
    }

    const aspirantesFiltrados =
        listaAspirantes.filter(
            aspirante => {

                const textoCompleto = [
                    aspirante.nombre_completo,
                    aspirante.curp,
                    aspirante.programa,
                    aspirante.convocatoria,
                    aspirante.tipo_admision,
                    aspirante.etapa_actual
                ]
                    .map(valor =>
                        String(valor || "")
                            .trim()
                            .toLowerCase()
                    )
                    .join(" ");

                const estado =
                    String(
                        aspirante.estado ||
                        aspirante.dictamen ||
                        "PENDIENTE"
                    )
                        .trim()
                        .toUpperCase();

                const coincideBusqueda =
                    textoCompleto.includes(
                        textoBusquedaAspirante
                    );

                const coincideEstado =
                    filtroEstadoAspirante === "TODOS" ||
                    estado === filtroEstadoAspirante;

                return (
                    coincideBusqueda &&
                    coincideEstado
                );
            }
        );

    tbody.innerHTML = "";

    if (aspirantesFiltrados.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="text-center py-5 text-muted">

                    <i
                        class="fa-solid fa-magnifying-glass fa-2x mb-3 d-block opacity-50">
                    </i>

                    No se encontraron aspirantes.

                </td>
            </tr>
        `;

        return;
    }

    aspirantesFiltrados.forEach(
        (asp, index) => {

            const collapseId =
                `detallesAsp_${asp.id_solicitud || index}`;

            const trPrincipal =
                document.createElement("tr");

            const trDetalle =
                document.createElement("tr");

            trPrincipal.innerHTML = `
                <td class="py-3">

                    <div class="fw-bold text-dark">
                        ${escaparHTML(
                            asp.nombre_completo ||
                            "Sin nombre"
                        )}
                    </div>

                    <small class="text-muted font-monospace">
                        ${escaparHTML(
                            asp.curp ||
                            "Sin CURP"
                        )}
                    </small>

                </td>

                <td>

                    <span class="fw-medium text-secondary">
                        ${escaparHTML(
                            asp.programa ||
                            "Sin asignación"
                        )}
                    </span>

                </td>

                <td>
                    ${getBadgeDictamen(
                        asp.estado ||
                        asp.dictamen
                    )}
                </td>

                <td class="text-end">

                    <button
                        class="btn btn-sm btn-outline-primary fw-medium"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#${collapseId}"
                        aria-expanded="false"
                        aria-controls="${collapseId}">

                        <i class="fa-solid fa-chevron-down me-1"></i>
                        Detalles

                    </button>

                </td>
            `;

            trDetalle.innerHTML = `
                <td colspan="4" class="p-0 border-0">

                    <div
                        class="collapse"
                        id="${collapseId}">

                        <div
                            class="p-3 my-2 bg-light rounded-3 border shadow-sm mx-2">

                            <div class="row align-items-center g-3">

                                <div class="col-md-3">

                                    <small class="text-muted d-block fw-bold mb-1">
                                        TIPO DE ADMISIÓN
                                    </small>

                                    <span class="badge bg-dark text-wrap">
                                        ${escaparHTML(
                                            asp.tipo_admision ||
                                            "N/A"
                                        )}
                                    </span>

                                </div>

                                <div class="col-md-2">

                                    <small class="text-muted d-block fw-bold mb-1">
                                        ETAPA ACTUAL
                                    </small>

                                    <span class="badge bg-secondary">
                                        ${escaparHTML(
                                            asp.etapa_actual ||
                                            "Sin etapa"
                                        )}
                                    </span>

                                </div>

                                <div class="col-md-3">

                                    <small class="text-muted d-block fw-bold mb-1">
                                        CONVOCATORIA
                                    </small>

                                    <span class="badge bg-info text-white">
                                        ${escaparHTML(
                                            asp.convocatoria ||
                                            "General"
                                        )}
                                    </span>

                                </div>

                                <div class="col-md-4 text-md-end">

                                    <small class="text-muted d-block fw-bold mb-1">
                                        ACCIONES
                                    </small>

                                    <button
                                        type="button"
                                        class="btn btn-sm btn-info text-white me-1"
                                        onclick="verExpediente(${Number(
                                            asp.id_aspirante
                                        )})">

                                        <i class="fa-solid fa-folder me-1"></i>
                                        Expediente

                                    </button>

                                    <select
                                        class="form-select form-select-sm d-inline-block w-auto mt-1 mt-md-0"
                                        onchange="cambiarDictamen(${Number(
                                            asp.id_solicitud
                                        )}, this.value)">

                                        <option value="" disabled selected>
                                            Dictamen...
                                        </option>

                                        <option value="APROBADO">
                                            Aprobar
                                        </option>

                                        <option value="RECHAZADO">
                                            Rechazar
                                        </option>

                                        <option value="EN_REVISION">
                                            En revisión
                                        </option>

                                    </select>

                                </div>

                            </div>

                        </div>

                    </div>

                </td>
            `;

            tbody.appendChild(
                trPrincipal
            );

            tbody.appendChild(
                trDetalle
            );
        }
    );
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

/* ==========================================================
 5.CONFIGURAR BUSCADOR DE ASPIRANTES
========================================================== */

function configurarBuscadorAspirantes() {

    const buscador =
        document.getElementById(
            "buscarAspirante"
        );

    if (!buscador) {
        return;
    }

    if (
        buscador.dataset.configurado ===
        "true"
    ) {
        return;
    }

    buscador.addEventListener(
        "input",
        event => {

            textoBusquedaAspirante =
                String(
                    event.target.value || ""
                )
                    .trim()
                    .toLowerCase();

            renderizarAspirantesFiltrados();
        }
    );

    buscador.dataset.configurado =
        "true";
}


/* ==========================================================
 6. CONFIGURAR FILTROS DE ASPIRANTES
========================================================== */

function configurarFiltrosAspirantes() {

    const botones =
        document.querySelectorAll(
            ".filtro-aspirante"
        );

    if (!botones.length) {
        return;
    }

    botones.forEach(boton => {

        if (
            boton.dataset.configurado ===
            "true"
        ) {
            return;
        }

        boton.addEventListener(
            "click",
            () => {

                filtroEstadoAspirante =
                    String(
                        boton.dataset.estado ||
                        "TODOS"
                    )
                        .trim()
                        .toUpperCase();

                botones.forEach(elemento => {
                    elemento.classList.remove(
                        "active"
                    );
                });

                boton.classList.add(
                    "active"
                );

                renderizarAspirantesFiltrados();
            }
        );

        boton.dataset.configurado =
            "true";
    });
}


/* ==========================================================
   7. ENTREVISTAS (Carga, Programación y Modal)
========================================================== */

let listaDocentesCache = null;
// A. Cargar la tabla de entrevistas
async function cargarEntrevistas() {
    console.log('Vista Entrevistas activa');
    const tbody = document.getElementById('tablaEntrevistasBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        Cargando la agenda de entrevistas...
    </td></tr>`;

    try {
        const res = await fetch('/api/coordinador/entrevistas');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const entrevistas = await res.json();
        tbody.innerHTML = '';

        if (!entrevistas || entrevistas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
                <i class="fa-solid fa-calendar-xmark fa-2x mb-2 d-block opacity-50"></i>
                No hay entrevistas registradas o pendientes.
            </td></tr>`;
            return;
        }

            entrevistas.forEach(ent => {
                const tr = document.createElement('tr');
                
                // 1. Manejo de IDs
                const idSolicitud = ent.idSoli || ent.id_solicitud || ent.id;
                const idDocente = ent.idUsua || ent.id_docente || ent.id_usuario || '';

                // 2. Nombres y datos
                const nombreAspirante = ent.nombre_completo || 
                    `${ent.nombre || ''} ${ent.primerApellido || ''} ${ent.segundoApellido || ''}`.trim() || 
                    'Aspirante';

                const nombreDocente = ent.docente || "Sin docente";  
                const folioCurp = ent.curp || ent.folio || 'Sin CURP';
                const programa = ent.programa || ent.opcion_posgrado || ent.posgrado_nombre || 'Sin asignación';

                // 3. Fecha y Hora
                const fechaRaw = ent.fecha || '';
                const horaRaw = ent.hora || '';
                const lugarRaw = ent.lugar || ent.lugar_link || '';

                // Limpiamos la fecha si viene en formato ISO (e.g. 2026-08-04T06:00:00.000Z)
                const fechaLimpia = fechaRaw.includes('T') ? fechaRaw.split('T')[0] : fechaRaw;

                let fechaStr = 'Sin agendar';
                if (fechaLimpia) {
                    const horaLimpia = horaRaw ? horaRaw.substring(0, 5) : '';
                    fechaStr = `${fechaLimpia} ${horaLimpia}`.trim();
                }

                const fechaValida = !!fechaLimpia;
                const badgeEstado = fechaValida 
                    ? `<span class="badge bg-success">Programada</span>` 
                    : `<span class="badge bg-warning text-dark">Pendiente</span>`;

                // 4. Formatear Lugar / Ubicación para su celda independiente
                const esLink = lugarRaw.startsWith('http://') || lugarRaw.startsWith('https://');
                const lugarTexto = lugarRaw.trim() ? lugarRaw.trim() : 'Sin especificar';

                const htmlLugar = esLink 
                    ? `<a href="${lugarRaw}" target="_blank" class="btn btn-sm btn-outline-primary fw-medium">
                        <i class="fa-solid fa-video me-1"></i> Abrir Enlace
                    </a>`
                    : `<span class="text-secondary fw-medium">
                        <i class="fa-solid fa-location-dot me-1 text-muted"></i>${lugarTexto}
                    </span>`;

                // 5. Estructura HTML de las 6 celdas
                tr.innerHTML = `
                    <td class="py-3 align-middle">
                        <div class="fw-bold text-dark"></div>
                        <small class="text-muted font-monospace">${folioCurp}</small>
                    </td>
                    <td class="align-middle"><span class="fw-medium text-secondary">${programa}</span></td>
                    <td class="align-middle"><span class="fw-bold text-dark">${nombreDocente}</span></td>
                    <td class="align-middle">
                        ${badgeEstado}
                        <small class="d-block text-muted mt-1 font-monospace">${fechaStr}</small>
                    </td>
                    <td class="align-middle">
                        ${htmlLugar}
                    </td>
                    <td class="text-end align-middle action-cell"></td>
                `;

                // Insertar el nombre del aspirante de manera segura
                tr.querySelector('.fw-bold.text-dark').textContent = nombreAspirante;

                // Crear el botón de acción mediante el DOM
                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline-primary fw-medium';
                btn.innerHTML = `<i class="fa-solid fa-calendar-plus me-1"></i> ${fechaValida ? 'Editar' : 'Programar'}`;
                
                // Asignar evento click pasando fechaLimpia para que el input date funcione correctamente
                btn.addEventListener('click', () => {
                    abrirModalEntrevista(idSolicitud, nombreAspirante, fechaLimpia, horaRaw, idDocente, lugarRaw);
                });

                tr.querySelector('.action-cell').appendChild(btn);
                tbody.appendChild(tr);
            });

            configurarBuscadorEntrevistas();

        } catch (err) {
            console.error('Error al cargar entrevistas:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">
                <i class="fa-solid fa-triangle-exclamation me-1"></i> Error al conectar con el módulo de entrevistas.
            </td></tr>`;
        }
}

// B. Llenar el select de docentes
async function cargarDocentesSelect() {
    const select = document.getElementById('selectDocente');
    if (!select) return;

    try {
        if (!listaDocentesCache || listaDocentesCache.length === 0) {
            const res = await fetch('/api/coordinador/docentes');
            if (!res.ok) {
                select.innerHTML = '<option value="" disabled selected>Error al cargar docentes</option>';
                return;
            }
            listaDocentesCache = await res.json();
        }

        if (!Array.isArray(listaDocentesCache) || listaDocentesCache.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No hay docentes disponibles</option>';
            return;
        }

        let htmlOptions = '<option value="" disabled selected>Seleccione un docente...</option>';
        
        listaDocentesCache.forEach(d => {
            const idDoc = d.id_docente ?? d.id_usuario ?? d.id_docente_asignado ?? d.id;
            const nombreDoc = d.nombre_completo ?? d.nombre_docente ?? `${d.nombre || ''} ${d.primerApellido || d.apellidos || ''}`.trim();

            if (idDoc !== undefined && nombreDoc) {
                htmlOptions += `<option value="${idDoc}">${nombreDoc}</option>`;
            }
        });

        select.innerHTML = htmlOptions;

    } catch (err) {
        console.error('Error crítico en cargarDocentesSelect:', err);
        select.innerHTML = '<option value="" disabled selected>Error de conexión</option>';
    }
}

// C. Abrir el modal de entrevista
async function abrirModalEntrevista(
    idSolicitud,
    nombreAspirante,
    fecha = '',
    hora = '',
    idDocente = '',
    lugar = ''
) {
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
    if (inputFecha) inputFecha.value = fecha || '';
    if (inputHora) inputHora.value = hora || '';
    if (inputLugar) inputLugar.value = lugar || '';

    // Cargar la lista de docentes en el select
    await cargarDocentesSelect();

    // Asignación directa e inmediata del docente seleccionado
    if (selectDocente) {
        const targetVal = (idDocente && idDocente !== 'null' && idDocente !== 'undefined')
            ? String(idDocente)
            : '';
        selectDocente.value = targetVal;
    }

    const modal = bootstrap.Modal.getInstance(modalElement)
        || new bootstrap.Modal(modalElement);

    modal.show();
}

// D. Guardar/programar entrevista
async function guardarEntrevista(event) {

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const boton =
        document.getElementById(
            "btnGuardarEntrevista"
        );

    if (
        boton &&
        boton.dataset.guardando === "true"
    ) {
        return;
    }

    if (boton) {
        boton.dataset.guardando = "true";
        boton.disabled = true;

        boton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Guardando...
        `;
    }

    try {

        const idSolicitud =
            document.getElementById(
                "modalEntrevistaIdSolicitud"
            )?.value;

        const fecha =
            document.getElementById(
                "modalEntrevistaFecha"
            )?.value;

        const hora =
            document.getElementById(
                "modalEntrevistaHora"
            )?.value;

        const lugar =
            document.getElementById(
                "modalEntrevistaLugar"
            )?.value;

        const idDocente =
            document.getElementById(
                "selectDocente"
            )?.value;

        if (
            !idSolicitud ||
            !fecha ||
            !hora ||
            !idDocente
        ) {

            await Swal.fire(
                "Campos incompletos",
                "Seleccione docente, fecha y hora.",
                "warning"
            );

            return;
        }

        const respuesta =
            await fetch(
                `/api/coordinador/solicitud/${idSolicitud}/entrevista`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        fecha,
                        hora,
                        lugar,
                        enlace: "",
                        idDocente
                    })
                }
            );

        const resultado =
            await respuesta
                .json()
                .catch(() => ({}));

        if (!respuesta.ok) {

            throw new Error(
                resultado.mensaje ||
                "No se pudo guardar la entrevista."
            );
        }

        await Swal.fire({
            icon: "success",
            title: "Entrevista guardada",
            text:
                resultado.mensaje ||
                "La entrevista se guardó correctamente.",
            timer: 1500,
            showConfirmButton: false
        });

        bootstrap.Modal
            .getInstance(
                document.getElementById(
                    "modalEntrevista"
                )
            )
            ?.hide();

        await cargarEntrevistas();

    } catch (error) {

        console.error(
            "Error al guardar entrevista:",
            error
        );

        await Swal.fire(
            "Error",
            error.message,
            "error"
        );

    } finally {

        if (boton) {

            boton.dataset.guardando =
                "false";

            boton.disabled =
                false;

            boton.innerHTML = `
                <i class="fa-solid fa-floppy-disk me-1"></i>
                Guardar entrevista
            `;
        }
    }
}

/* ==========================================================
   BUSCADOR DE ENTREVISTAS
========================================================== */
function configurarBuscadorEntrevistas() {

    const input =
        document.getElementById(
            "buscarEntrevista"
        );

    if (!input) return;

    if (input.dataset.listenerBusqueda === "true") {
        return;
    }

    input.addEventListener("input", function () {

        const texto =
            this.value
                .trim()
                .toLowerCase();

        const filas =
            document.querySelectorAll(
                "#tablaEntrevistasBody tr"
            );

        filas.forEach(fila => {

            const nombre =
                fila.querySelector(
                    "td:first-child .fw-bold"
                )?.textContent
                .toLowerCase() || "";

            fila.style.display =
                nombre.includes(texto)
                    ? ""
                    : "none";

        });

    });

    input.dataset.listenerBusqueda = "true";
}

/* ==========================================================
  8. EXPEDIENTE DEL ASPIRANTE
========================================================== */

async function verExpediente(idAspirante) {

    const modalElement =
        document.getElementById("modalExpediente");

    const modalBody =
        document.getElementById("modalExpedienteBody");

    if (!modalElement || !modalBody) {
        return;
    }

    const modal =
        bootstrap.Modal.getInstance(modalElement) ||
        new bootstrap.Modal(modalElement);

    modalBody.innerHTML = `
        <div class="text-center py-5">

            <div class="spinner-border text-primary"></div>

            <p class="mt-3 text-muted">
                Cargando expediente...
            </p>

        </div>
    `;

    modal.show();

    try {

        const respuesta =
            await fetch(
                `/api/coordinador/aspirante/${idAspirante}/expediente`
            );

        const resultado =
            await respuesta.json();

        if (!respuesta.ok) {

            modalBody.innerHTML = `
                <div class="alert alert-danger">

                    ${resultado.mensaje || "No fue posible obtener el expediente."}

                </div>
            `;

            return;
        }

        const perfil =
            resultado.aspirante || {};

        const documentos =
            resultado.documentos || [];

        const nombreCompleto =
            perfil.nombreCompleto ||
            "N/A";

        const institucion =
            perfil.institucion ||
            perfil.institucionLicenciatura ||
            "N/A";

        let htmlDocumentos = "";

        if (documentos.length === 0) {

            htmlDocumentos = `
                <li class="list-group-item text-center text-muted">
                    No existen documentos registrados.
                </li>
            `;

        } else {

            documentos.forEach(doc => {

                const token =
                    sessionStorage.getItem("token") ||
                    localStorage.getItem("token") ||
                    "";

                const archivo =
                    String(doc.rutaArchivo || "")
                        .split("/")
                        .pop();

                htmlDocumentos += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">

                        <div>

                            <strong>
                                ${doc.requisito || "Documento"}
                            </strong>

                            <br>

                            <small class="text-muted">
                                ${doc.estadoValidacion || "Pendiente"}
                            </small>

                        </div>

                        <a
                            class="btn btn-sm btn-outline-primary"
                            target="_blank"
                            href="/api/files/${encodeURIComponent(archivo)}?token=${encodeURIComponent(token)}">

                            <i class="fa-solid fa-file-pdf me-1"></i>

                            Ver

                        </a>

                    </li>
                `;
            });

        }

        modalBody.innerHTML = `
            <div class="mb-4">

                <h5 class="text-primary fw-bold">

                    <i class="fa-solid fa-user me-2"></i>

                    Información Personal

                </h5>

                <hr>

                <div class="row g-3">

                    <div class="col-md-6">
                        <strong>Nombre:</strong><br>
                        ${nombreCompleto}
                    </div>

                    <div class="col-md-6">
                        <strong>Correo:</strong><br>
                        ${perfil.correo || "N/A"}
                    </div>

                    <div class="col-md-6">
                        <strong>Teléfono:</strong><br>
                        ${perfil.telefono || "N/A"}
                    </div>

                    <div class="col-md-6">
                        <strong>Promedio:</strong><br>
                        ${perfil.promedio || "N/A"}
                    </div>

                    <div class="col-12">
                        <strong>Licenciatura:</strong><br>
                        ${perfil.licenciatura || "N/A"}
                    </div>

                    <div class="col-12">
                        <strong>Institución:</strong><br>
                        ${institucion}
                    </div>

                    <div class="col-md-6">
                        <strong>Convocatoria:</strong><br>
                        ${perfil.convocatoria || "N/A"}
                    </div>

                    <div class="col-md-6">
                        <strong>Estado:</strong><br>
                        ${perfil.estado || "N/A"}
                    </div>

                </div>

            </div>

            <div>

                <h5 class="text-primary fw-bold">

                    <i class="fa-solid fa-folder-open me-2"></i>

                    Documentos

                </h5>

                <hr>

                <ul class="list-group">

                    ${htmlDocumentos}

                </ul>

            </div>
        `;

    } catch (error) {

        console.error(error);

        modalBody.innerHTML = `
            <div class="alert alert-danger">

                Error al cargar el expediente.

            </div>
        `;
    }

}

// ==========================================
// 10. Cargar Dictámenes
// ==========================================
async function cargarDictamenes() {

    const tbody =
        document.getElementById(
            "tablaDictamenesBody"
        );

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                Cargando dictámenes...
            </td>
        </tr>
    `;

    try {

        const res =
            await fetch(
                "/api/coordinador/dictamenes"
            );

        listaDictamenes =
            await res.json();

        renderizarDictamenes();

        configurarBuscadorDictamenes();

        configurarFiltrosDictamenes();

    } catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Error al cargar dictámenes.
                </td>
            </tr>
        `;

    }

}

function renderizarDictamenes() {

    const tbody =
        document.getElementById(
            "tablaDictamenesBody"
        );

    tbody.innerHTML = "";

    const datos =
        listaDictamenes.filter(d => {

            const texto = (
                `${d.nombre} ${d.curp}`
            ).toLowerCase();

            const coincideBusqueda =
                texto.includes(
                    textoBusquedaDictamen
                );

            const resultado =
                (
                    d.resultado ||
                    "PENDIENTE"
                ).toUpperCase();

            const coincideFiltro =
                filtroDictamen === "TODOS" ||
                resultado === filtroDictamen;

            return (
                coincideBusqueda &&
                coincideFiltro
            );

        });

    if (!datos.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    No existen registros.
                </td>
            </tr>
        `;

        return;

    }

    datos.forEach(d => {

        let badge = `
            <span class="badge bg-secondary">
                Pendiente
            </span>
        `;

        if (d.resultado === "ACEPTADO") {

            badge = `
                <span class="badge bg-success">
                    ACEPTADO
                </span>
            `;

        }

        if (d.resultado === "RECHAZADO") {

            badge = `
                <span class="badge bg-danger">
                    RECHAZADO
                </span>
            `;

        }

        tbody.innerHTML += `

            <tr>

                <td>${d.nombre}</td>

                <td>${d.curp}</td>

                <td>${d.programa}</td>

                <td>${badge}</td>

                <td>

                    ${d.publicado ? "Sí" : "No"}

                </td>

                <td class="text-end">

                    <button
                        class="btn btn-danger btn-sm"
                        onclick="abrirModalDictamen(${d.idSolicitud})">

                        Emitir

                    </button>

                </td>

            </tr>

        `;

    });

}

function configurarBuscadorDictamenes() {

    const input =
        document.getElementById(
            "buscarDictamen"
        );

    if (!input) return;

    if (
        input.dataset.listener === "true"
    ) return;

    input.addEventListener(
        "input",
        function () {

            textoBusquedaDictamen =
                this.value
                    .toLowerCase()
                    .trim();

            renderizarDictamenes();

        }
    );

    input.dataset.listener = "true";

}

function configurarBuscadorDictamenes() {

    const input =
        document.getElementById(
            "buscarDictamen"
        );

    if (!input) return;

    if (
        input.dataset.listener === "true"
    ) return;

    input.addEventListener(
        "input",
        function () {

            textoBusquedaDictamen =
                this.value
                    .toLowerCase()
                    .trim();

            renderizarDictamenes();

        }
    );

    input.dataset.listener = "true";

}

function configurarFiltrosDictamenes() {

    const botones =
        document.querySelectorAll(
            ".filtro-dictamen"
        );

    botones.forEach(boton => {

        boton.onclick = () => {

            document
                .querySelectorAll(".filtro-dictamen")
                .forEach(b =>
                    b.classList.remove("active")
                );

            boton.classList.add("active");

            filtroDictamen =
                boton.dataset.estado;

            renderizarDictamenes();

        };

    });

}

// ==========================================
// 11. Abrir Modal Dictamen
// ==========================================
function abrirModalDictamen(idSolicitud){

    document.getElementById("dictamenSolicitud").value = idSolicitud;

    document.getElementById("dictamenResultado").value = "ACEPTADO";

    document.getElementById("dictamenMotivo").value = "";

    new bootstrap.Modal(
        document.getElementById("modalDictamen")
    ).show();

}

/* ==========================================================
 12. CAMBIAR DICTAMEN DEL ASPIRANTE
========================================================== */

async function cambiarDictamen(
    idSolicitud,
    nuevoDictamen
) {

    if (!idSolicitud || !nuevoDictamen) {

        Swal.fire(
            "Datos incompletos",
            "No se encontró la solicitud o el dictamen seleccionado.",
            "warning"
        );

        return;
    }

    const confirmacion =
        await Swal.fire({
            title: "¿Actualizar dictamen?",
            text: `El estado cambiará a ${nuevoDictamen.replace("_", " ")}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, actualizar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#8a1c24"
        });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {

        const respuesta =
            await fetch(
                `/api/coordinador/solicitud/${idSolicitud}/dictamen`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            estado: nuevoDictamen
                        })
                }
            );

        const resultado =
            await respuesta
                .json()
                .catch(() => ({}));

        if (!respuesta.ok) {

            throw new Error(
                resultado.mensaje ||
                resultado.msg ||
                "No se pudo actualizar el dictamen."
            );
        }

        await Swal.fire({
            icon: "success",
            title: "Dictamen actualizado",
            text:
                resultado.mensaje ||
                "El estado fue actualizado correctamente.",
            timer: 1500,
            showConfirmButton: false
        });

        await cargarAspirantes();

        if (
            typeof cargarMetricas ===
            "function"
        ) {
            await cargarMetricas();
        }

    } catch (error) {

        console.error(
            "Error al actualizar dictamen:",
            error
        );

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }
}

// ==========================================
// 13. Guardar Dictamen
// ==========================================
async function guardarDictamen(){

    const id = document.getElementById("dictamenSolicitud").value;

    const resultado = document.getElementById("dictamenResultado").value;

    const motivo = document.getElementById("dictamenMotivo").value;

    try{

        const res = await fetch(`/api/coordinador/dictamen/${id}`,{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                resultado,

                motivo

            })

        });

        const data = await res.json();

        if(res.ok){

            Swal.fire({

                icon:"success",

                title:"Correcto",

                text:data.mensaje,

                timer:1500,

                showConfirmButton:false

            });

            bootstrap.Modal.getInstance(

                document.getElementById("modalDictamen")

            ).hide();

            cargarDictamenes();

        }else{

            Swal.fire(

                "Error",

                data.mensaje,

                "error"

            );

        }

    }catch(error){

        console.error(error);

    }

}

/* ==========================================================
   14. NOTIFICACIONES (Header Dropdown)
========================================================== */
async function cargarNotificaciones() { 
    console.log('Cargando notificaciones del header...'); 
    const contenedor = document.getElementById("listaNotificacionesContainer");
    const badge = document.getElementById("badgeNotificaciones");
    const cantTexto = document.getElementById("cantNotifTexto");

    if (!contenedor) return;

    try {
        const respuesta = await fetch("/api/notificaciones");
        if (!respuesta.ok) throw new Error("Endpoint no disponible");

        const notificaciones = await respuesta.json();
        
        // 1. Filtrar solo las notificaciones activas para el dropdown
        const notifsActivas = (notificaciones || []).filter(n => 
            n.activa == 1 || n.activa === 'true' || n.activa === true || n.estatus === 'Activa'
        );

        const total = notifsActivas.length;

        // 2. Actualizar contadores visuales
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'inline-block' : 'none';
        }
        if (cantTexto) {
            cantTexto.textContent = `${total} ${total === 1 ? 'activa' : 'activas'}`;
        }

        // 3. Caso sin notificaciones
        if (total === 0) {
            contenedor.innerHTML = `
                <div class="p-4 text-center text-muted small">
                    <i class="fa-regular fa-bell-slash fa-2x mb-2 opacity-50 d-block"></i>
                    No hay avisos o notificaciones activas.
                </div>`;
            return;
        }

        // 4. Generar elementos del dropdown
        contenedor.innerHTML = "";
        notifsActivas.forEach(notif => {
            const tituloTexto = notif.titulo || notif.nombre || 'Sin título';
            let destinoText = (notif.destino || 'todos').toLowerCase();
            
            let destinoIcon = 'fa-users';
            if (destinoText === 'aspirantes') destinoIcon = 'fa-graduation-cap';
            if (destinoText === 'docentes') destinoIcon = 'fa-chalkboard-user';
            if (destinoText === 'secretario') destinoIcon = 'fa-file-signature';

            const item = document.createElement("a");
            item.className = "dropdown-item p-3 border-bottom text-wrap";
            item.href = "#";

            // Permite hacer clic para editar si la función existe
            if (typeof editarNotificacion === 'function') {
                item.onclick = (e) => {
                    e.preventDefault();
                    editarNotificacion(notif.id || notif.id_notificacion);
                };
            }

            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                    <strong class="text-dark small">${tituloTexto}</strong>
                    <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 0.65rem;">
                        Activa
                    </span>
                </div>
                <p class="mb-1 text-secondary small" style="font-size: 0.825rem; line-height: 1.3;">
                    ${notif.mensaje || ''}
                </p>
                <small class="text-muted d-block" style="font-size: 0.7rem;">
                    <i class="fa-solid ${destinoIcon} me-1"></i>Para: <span class="text-capitalize">${destinoText}</span>
                </small>
            `;
            
            contenedor.appendChild(item);
        });

    } catch (error) {
        console.warn("Error al cargar notificaciones:", error);
        contenedor.innerHTML = `
            <div class="p-3 text-center text-danger small">
                <i class="fa-solid fa-plug-circle-exclamation me-1"></i> No se pudo conectar con el servidor.
            </div>`;
    }
}


// ==========================================
// 15 FUNCIÓN PARA ABRIR EL MODAL Y ASIGNAR EL ID
// ==========================================
function abrirModalProgramar(idSolicitud) {
    console.log("Abriendo modal para la solicitud ID:", idSolicitud);
    
    // 1. Asignamos el idSolicitud al input oculto (para no perder el ID)
    const inputSolicitud = document.getElementById('idSolicitud');
    if (inputSolicitud) {
        inputSolicitud.value = idSolicitud;
    }

    // 2. Reseteamos la selección del docente a la opción por defecto sin borrar las opciones
    const selectDocente = document.getElementById('id_docente');
    if (selectDocente) {
        selectDocente.selectedIndex = 0; // Selecciona "Seleccione un docente..."
    }

    // 3. Abrimos el modal con Bootstrap
    const modalElement = document.getElementById('modalEntrevista');
    if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

function configurarBuscadorEntrevistas() {

    const buscador = document.getElementById("buscarEntrevista");

    if (!buscador) return;

    buscador.onkeyup = function () {

        const texto = this.value.toLowerCase().trim();

        const filas = document.querySelectorAll("#tablaEntrevistasBody tr");

        filas.forEach(fila => {

            const nombre = fila.cells[0]?.innerText.toLowerCase() || "";

            if (nombre.includes(texto)) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }

        });

    };

}


// Expuestos al Scope Global para listeners en el DOM
window.abrirModalEntrevista =
    abrirModalEntrevista;

window.guardarEntrevista =
    guardarEntrevista;

window.verExpediente =
    verExpediente;

window.cambiarDictamen =
    cambiarDictamen;