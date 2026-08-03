let todosLosPosgrados = [];
let todasLasOpcionesPosgrado = [];

let pasoActualConvocatoria = 1;
const totalPasosConvocatoria = 4;


/* ==========================================================
   1. INICIALIZACIÓN
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const modalConvocatoria =
        document.getElementById("modalConvocatoria");

    const contenedorConvocatorias =
        document.getElementById("contenedorConvocatorias");

    if (!modalConvocatoria && !contenedorConvocatorias) {
        return;
    }

    await cargarPosgradosEnSelect();
    await cargarOpcionesPosgradoGlobal();
    await cargarCatalogoRequisitosUI();

    inicializarFlatpickr();
    configurarFormularioConvocatoria();
    configurarSelectorPosgrado();
    actualizarWizard(1);

    if (modalConvocatoria) {
        modalConvocatoria.addEventListener(
            "shown.bs.modal",
            () => {
                inicializarFlatpickr();
            }
        );
    }
});


/* ==========================================================
   2. CONFIGURAR EVENTOS
========================================================== */

function configurarFormularioConvocatoria() {

    const formulario =
        document.getElementById("formConvocatoria");

    if (!formulario) return;

    /*
     * Evita agregar dos listeners si admin.js o coor.js
     * intentan inicializar nuevamente el formulario.
     */
    if (formulario.dataset.listenerGuardado === "true") {
        return;
    }

    formulario.addEventListener(
        "submit",
        guardarConvocatoria
    );

    formulario.dataset.listenerGuardado = "true";
}


function configurarSelectorPosgrado() {

    const select =
        document.getElementById(
            "convocatoria_posgrado"
        );

    if (!select) return;

    if (select.dataset.listenerOpciones === "true") {
        return;
    }

    select.addEventListener("change", event => {

        renderizarOpcionesPorPosgrado(
            event.target.value,
            [],
            false
        );

    });

    select.dataset.listenerOpciones = "true";
}


/* ==========================================================
   3. CARGAR CONVOCATORIAS
========================================================== */

async function cargarConvocatorias() {

    const contenedor =
        document.getElementById(
            "contenedorConvocatorias"
        );

    const totalConvocatorias =
        document.getElementById(
            "totalConvocatorias"
        );

    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm me-2"
                 style="color: #8a1c24;"></div>
            Cargando convocatorias...
        </div>
    `;

    try {

        const respuesta =
            await fetch("/api/convocatorias");

        if (!respuesta.ok) {
            throw new Error(
                `Error HTTP ${respuesta.status}`
            );
        }

        const convocatorias =
            await respuesta.json();

        if (totalConvocatorias) {
            totalConvocatorias.textContent =
                Array.isArray(convocatorias)
                    ? convocatorias.length
                    : 0;
        }

        contenedor.innerHTML = "";

        if (
            !Array.isArray(convocatorias) ||
            convocatorias.length === 0
        ) {

            contenedor.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="fa-solid fa-folder-open fa-2x mb-3 d-block opacity-50"></i>
                    No hay convocatorias registradas.
                </div>
            `;

            return;
        }

        convocatorias.forEach(convocatoria => {

            const columna =
                crearTarjetaConvocatoria(
                    convocatoria
                );

            contenedor.appendChild(columna);
        });

    } catch (error) {

        console.error(
            "Error al cargar convocatorias:",
            error
        );

        contenedor.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <i class="fa-solid fa-circle-exclamation fa-2x mb-3 d-block"></i>
                No se pudieron cargar las convocatorias.
            </div>
        `;
    }
}


function crearTarjetaConvocatoria(convocatoria) {

    const columna =
        document.createElement("div");

    columna.className =
        "col-xl-4 col-md-6 col-sm-12";

    const fechaInicio =
        formatearFechaConvocatoria(
            convocatoria.fecha_inicio
        );

    const fechaFin =
        formatearFechaConvocatoria(
            convocatoria.fecha_fin
        );

    const estado =
        convocatoria.estado ||
        convocatoria.estatus ||
        "Borrador";

    const estadoNormalizado =
        String(estado).toUpperCase();

    let colorEstado = "#64748b";
    let claseBadge = "bg-secondary";

    if (estadoNormalizado === "ACTIVA") {
        colorEstado = "#16a34a";
        claseBadge = "bg-success";
    }

    if (estadoNormalizado === "EVALUACION") {
        colorEstado = "#d97706";
        claseBadge = "bg-warning text-dark";
    }

    if (estadoNormalizado === "CERRADA") {
        colorEstado = "#dc2626";
        claseBadge = "bg-danger";
    }

    columna.innerHTML = `
        <div
            class="card border-0 shadow-sm h-100"
            style="
                border-radius: 18px;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s ease,
                            box-shadow 0.2s ease;
            ">

            <div style="
                height: 5px;
                background: ${colorEstado};
            "></div>

            <div class="card-body p-4">

                <div class="d-flex justify-content-between align-items-start mb-4">

                    <div
                        class="d-flex align-items-center justify-content-center rounded-4"
                        style="
                            width: 50px;
                            height: 50px;
                            background: rgba(138, 28, 36, 0.10);
                            color: #8a1c24;
                        ">

                        <i class="fa-solid fa-bullhorn"></i>

                    </div>

                    <span class="badge ${claseBadge} px-3 py-2">
                        ${estado}
                    </span>

                </div>

                <h5 class="fw-bold text-dark mb-2">
                    ${escaparHTML(
                        convocatoria.nombre ||
                        "Convocatoria"
                    )}
                </h5>

                <p class="text-muted small mb-4"
                   style="min-height: 42px;">

                    ${escaparHTML(
                        convocatoria.descripcion ||
                        "Proceso de admisión registrado."
                    )}

                </p>

                <div class="border-top pt-3">

                    <div class="d-flex justify-content-between mb-2">

                        <small class="text-muted">
                            <i class="fa-regular fa-calendar me-2"></i>
                            Inicio
                        </small>

                        <span class="small fw-semibold">
                            ${fechaInicio}
                        </span>

                    </div>

                    <div class="d-flex justify-content-between">

                        <small class="text-muted">
                            <i class="fa-regular fa-calendar-check me-2"></i>
                            Finaliza
                        </small>

                        <span class="small fw-semibold">
                            ${fechaFin}
                        </span>

                    </div>

                </div>

            </div>

        </div>
    `;

    const tarjeta =
        columna.querySelector(".card");

    tarjeta.addEventListener("mouseenter", () => {
        tarjeta.style.transform =
            "translateY(-3px)";

        tarjeta.style.boxShadow =
            "0 14px 35px rgba(15, 23, 42, 0.12)";
    });

    tarjeta.addEventListener("mouseleave", () => {
        tarjeta.style.transform =
            "translateY(0)";

        tarjeta.style.boxShadow = "";
    });

    tarjeta.addEventListener("click", () => {

        if (convocatoria.id) {
            editarConvocatoria(
                convocatoria.id
            );
        }

    });

    return columna;
}


function formatearFechaConvocatoria(fecha) {

    if (!fecha) return "Sin fecha";

    const fechaLimpia =
        String(fecha).split("T")[0];

    const partes =
        fechaLimpia.split("-");

    if (partes.length !== 3) {
        return fechaLimpia;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


/* ==========================================================
   4. CARGAR POSGRADOS
========================================================== */

async function cargarPosgradosEnSelect() {

    const select =
        document.getElementById(
            "convocatoria_posgrado"
        );

    if (!select) return;

    select.innerHTML = `
        <option value="">
            Cargando posgrados...
        </option>
    `;

    try {

        const respuesta =
            await fetch("/api/posgrado");

        if (!respuesta.ok) {
            throw new Error(
                `Error HTTP ${respuesta.status}`
            );
        }

        const posgrados =
            await respuesta.json();

        todosLosPosgrados =
            Array.isArray(posgrados)
                ? posgrados
                : [];

        select.innerHTML = `
            <option value="">
                Seleccione un posgrado...
            </option>
        `;

        if (todosLosPosgrados.length === 0) {

            select.innerHTML = `
                <option value="">
                    No hay posgrados registrados
                </option>
            `;

            return;
        }

        todosLosPosgrados.forEach(posgrado => {

            const option =
                document.createElement("option");

            option.value = posgrado.id;

            option.textContent =
                posgrado.nombre ||
                `Posgrado ${posgrado.id}`;

            option.dataset.tipo =
                normalizarTipoPosgrado(
                    posgrado.tipo,
                    posgrado.nombre
                );

            select.appendChild(option);
        });

    } catch (error) {

        console.error(
            "Error al cargar posgrados:",
            error
        );

        select.innerHTML = `
            <option value="">
                Error al cargar posgrados
            </option>
        `;
    }
}


function normalizarTipoPosgrado(
    tipo,
    nombre = ""
) {

    const tipoTexto =
        String(tipo || "").toUpperCase();

    if (
        tipoTexto === "MAESTRIA" ||
        tipoTexto === "DOCTORADO"
    ) {
        return tipoTexto;
    }

    const nombreTexto =
        String(nombre).toUpperCase();

    if (
        nombreTexto.includes("DOCTORADO")
    ) {
        return "DOCTORADO";
    }

    return "MAESTRIA";
}


/* ==========================================================
   5. OPCIONES, ESPECIALIDADES Y CUPOS
========================================================== */

async function cargarOpcionesPosgradoGlobal() {

    try {

        const respuesta =
            await fetch("/api/posgrado/opciones");

        if (!respuesta.ok) {

            todasLasOpcionesPosgrado = [];

            console.warn(
                "No se pudieron cargar las opciones de posgrado."
            );

            return;
        }

        const opciones =
            await respuesta.json();

        todasLasOpcionesPosgrado =
            Array.isArray(opciones)
                ? opciones
                : [];

    } catch (error) {

        console.error(
            "Error al cargar opciones de posgrado:",
            error
        );

        todasLasOpcionesPosgrado = [];
    }
}


function renderizarOpcionesPorPosgrado(
    posgradoId,
    opcionesSeleccionadasPrevias = [],
    esEdicion = false
) {

    const contenedor =
        document.getElementById(
            "contenedorOpcionesPosgrado"
        );

    if (!contenedor) return;

    if (!posgradoId) {

        contenedor.innerHTML = `
            <p class="text-muted small mb-0">
                <i class="fa-solid fa-circle-info me-1"></i>
                Selecciona un posgrado para ver sus especialidades.
            </p>
        `;

        toggleCamposPorTipo("");

        return;
    }

    const posgrado =
        todosLosPosgrados.find(
            item => item.id == posgradoId
        );

    const tipo =
        normalizarTipoPosgrado(
            posgrado?.tipo,
            posgrado?.nombre
        );

    toggleCamposPorTipo(tipo);

    const opciones =
        todasLasOpcionesPosgrado.filter(
            opcion =>
                opcion.posgrado_id == posgradoId
        );

    if (opciones.length === 0) {

        contenedor.innerHTML = `
            <p class="text-muted small mb-0">
                Este posgrado no tiene especialidades
                o líneas de investigación registradas.
            </p>
        `;

        return;
    }

    let html = `
        <div class="d-flex flex-column gap-2">
    `;

    opciones.forEach(opcion => {

        const seleccionPrevia =
            opcionesSeleccionadasPrevias.find(
                seleccion =>
                    seleccion.idOpcionPosgrado == opcion.id ||
                    seleccion.opcion_posgrado_id == opcion.id
            );

        const seleccionada =
            esEdicion
                ? Boolean(seleccionPrevia)
                : true;

        const cupos =
            seleccionPrevia?.cupos ?? "";

        html += `
            <div
                class="d-flex justify-content-between align-items-center p-2 rounded border"
                style="
                    background: var(--color-card-bg, #fff);
                    border-color: var(--color-border, #dee2e6) !important;
                ">

                <div class="form-check mb-0">

                    <input
                        class="form-check-input opc-checkbox"
                        type="checkbox"
                        value="${opcion.id}"
                        id="opc_${opcion.id}"
                        ${seleccionada ? "checked" : ""}>

                    <label
                        class="form-check-label fw-semibold"
                        for="opc_${opcion.id}"
                        style="cursor: pointer;">

                        ${escaparHTML(opcion.nombre)}

                    </label>

                </div>

                <div
                    class="d-flex align-items-center gap-2"
                    style="width: 145px;">

                    <small class="text-muted">
                        Cupos:
                    </small>

                    <input
                        type="number"
                        min="0"
                        class="form-control form-control-sm text-center cupo-input"
                        id="cupos_opc_${opcion.id}"
                        placeholder="Ilimitado"
                        value="${cupos}">

                </div>

            </div>
        `;
    });

    html += `</div>`;

    contenedor.innerHTML = html;
}


/* ==========================================================
   6. CAMPOS POR MAESTRÍA O DOCTORADO
========================================================== */

function obtenerTipoPosgradoSeleccionado() {

    const select =
        document.getElementById(
            "convocatoria_posgrado"
        );

    if (!select || !select.value) {
        return "";
    }

    const opcion =
        select.options[
            select.selectedIndex
        ];

    return normalizarTipoPosgrado(
        opcion?.dataset?.tipo,
        opcion?.textContent
    );
}


function toggleCamposPorTipo(tipo = "") {

    const tipoNormalizado =
        String(tipo).toUpperCase();

    const grupoEntrevistas =
        document.getElementById(
            "grupo_entrevistas"
        );

    const grupoAcademicas =
        document.getElementById(
            "grupo_fechas_academicas"
        );

    const esMaestria =
        tipoNormalizado === "MAESTRIA";

    const esDoctorado =
        tipoNormalizado === "DOCTORADO";

    if (grupoEntrevistas) {
        grupoEntrevistas.style.display =
            esDoctorado
                ? "block"
                : "none";
    }

    if (grupoAcademicas) {
        grupoAcademicas.style.display =
            esMaestria
                ? "block"
                : "none";
    }

    const fechasEntrevista = [
        "convocatoria_fechaEntrevistaInicio",
        "convocatoria_fechaEntrevistaFin"
    ];

    fechasEntrevista.forEach(id => {

        const campo =
            document.getElementById(id);

        if (campo) {
            campo.required = esDoctorado;
        }
    });

    const fechasMaestria = [
        "convocatoria_inicioCurso",
        "convocatoria_finCurso",
        "convocatoria_inicioExamen",
        "convocatoria_finExamen"
    ];

    fechasMaestria.forEach(id => {

        const campo =
            document.getElementById(id);

        if (campo) {
            campo.required = esMaestria;
        }
    });
}


/* ==========================================================
   7. FLATPICKR
========================================================== */

function inicializarFlatpickr() {

    if (typeof flatpickr === "undefined") {
        console.error(
            "Flatpickr no está cargado. Revisa los scripts de coor.html."
        );
        return;
    }

    document
        .querySelectorAll("#modalConvocatoria .date-single")
        .forEach(campo => {

            if (campo._flatpickr) {
                campo._flatpickr.destroy();
            }

            flatpickr(campo, {
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d/m/Y",
                allowInput: false,
                locale: "es",
                disableMobile: true
            });

        });
}

/* ==========================================================
   8. WIZARD
========================================================== */

function actualizarWizard(paso) {

    pasoActualConvocatoria = paso;

    document
        .querySelectorAll(
            "#modalConvocatoria .step-pane"
        )
        .forEach(panel => {

            panel.classList.remove("active");
            panel.style.display = "none";
        });

    document
        .querySelectorAll(
            "#modalConvocatoria .step-indicator"
        )
        .forEach(indicador => {

            indicador.classList.remove(
                "active",
                "completed"
            );
        });

    const panelActual =
        document.getElementById(
            `step-pane-${paso}`
        );

    if (panelActual) {
        panelActual.classList.add("active");
        panelActual.style.display = "block";
    }

    for (
        let numero = 1;
        numero <= totalPasosConvocatoria;
        numero++
    ) {

        const indicador =
            document.getElementById(
                `indicator-${numero}`
            );

        if (!indicador) continue;

        if (numero < paso) {
            indicador.classList.add(
                "completed"
            );
        }

        if (numero === paso) {
            indicador.classList.add(
                "active"
            );
        }
    }

    const btnAnterior =
        document.getElementById(
            "btnPrevStep"
        );

    const btnSiguiente =
        document.getElementById(
            "btnNextStep"
        );

    const btnGuardar =
        document.getElementById(
            "btnSaveConvocatoria"
        );

    if (btnAnterior) {
        btnAnterior.style.display =
            paso === 1
                ? "none"
                : "inline-block";
    }

    if (btnSiguiente) {
        btnSiguiente.style.display =
            paso === totalPasosConvocatoria
                ? "none"
                : "inline-block";
    }

    if (btnGuardar) {
        btnGuardar.style.display =
            paso === totalPasosConvocatoria
                ? "inline-block"
                : "none";
    }
}


function validarPasoActual() {

    const panel =
        document.getElementById(
            `step-pane-${pasoActualConvocatoria}`
        );

    if (!panel) return true;

    const camposRequeridos =
        panel.querySelectorAll(
            "input[required], select[required], textarea[required]"
        );

    for (
        const campo of camposRequeridos
    ) {

        if (
            campo.offsetParent === null
        ) {
            continue;
        }

        const valor =
            String(campo.value || "").trim();

        if (!valor) {

            campo.reportValidity();
            campo.focus();

            return false;
        }
    }

    return validarFechasPaso();
}


function validarFechasPaso() {

    if (pasoActualConvocatoria === 2) {

        const inicio =
            obtenerValorCampo(
                "convocatoria_fecha_inicio"
            );

        const fin =
            obtenerValorCampo(
                "convocatoria_fecha_fin"
            );

        const inicioDocumentos =
            obtenerValorCampo(
                "convocatoria_fechaInicioDocumentos"
            );

        const finDocumentos =
            obtenerValorCampo(
                "convocatoria_fechaFinDocumentos"
            );

        if (fin < inicio) {

            mostrarAlertaFechas(
                "La fecha final de la convocatoria no puede ser anterior al inicio."
            );

            return false;
        }

        if (
            finDocumentos <
            inicioDocumentos
        ) {

            mostrarAlertaFechas(
                "El fin de recepción de documentos no puede ser anterior al inicio."
            );

            return false;
        }
    }

    if (pasoActualConvocatoria === 3) {

        const tipo =
            obtenerTipoPosgradoSeleccionado();

        if (tipo === "DOCTORADO") {

            const inicio =
                obtenerValorCampo(
                    "convocatoria_fechaEntrevistaInicio"
                );

            const fin =
                obtenerValorCampo(
                    "convocatoria_fechaEntrevistaFin"
                );

            if (fin < inicio) {

                mostrarAlertaFechas(
                    "El fin de entrevistas no puede ser anterior al inicio."
                );

                return false;
            }
        }

        if (tipo === "MAESTRIA") {

            const inicioCurso =
                obtenerValorCampo(
                    "convocatoria_inicioCurso"
                );

            const finCurso =
                obtenerValorCampo(
                    "convocatoria_finCurso"
                );

            const inicioExamen =
                obtenerValorCampo(
                    "convocatoria_inicioExamen"
                );

            const finExamen =
                obtenerValorCampo(
                    "convocatoria_finExamen"
                );

            if (finCurso < inicioCurso) {

                mostrarAlertaFechas(
                    "El fin del curso no puede ser anterior al inicio."
                );

                return false;
            }

            if (
                finExamen <
                inicioExamen
            ) {

                mostrarAlertaFechas(
                    "El fin del examen no puede ser anterior al inicio."
                );

                return false;
            }
        }
    }

    return true;
}


function mostrarAlertaFechas(mensaje) {

    if (typeof Swal !== "undefined") {

        Swal.fire(
            "Fechas inválidas",
            mensaje,
            "warning"
        );

    } else {

        alert(mensaje);
    }
}


function irAlPaso(paso) {

    if (
        paso < 1 ||
        paso > totalPasosConvocatoria
    ) {
        return;
    }

    if (
        paso > pasoActualConvocatoria &&
        !validarPasoActual()
    ) {
        return;
    }

    actualizarWizard(paso);
}


function siguientePaso() {

    if (!validarPasoActual()) {
        return;
    }

    if (
        pasoActualConvocatoria <
        totalPasosConvocatoria
    ) {

        actualizarWizard(
            pasoActualConvocatoria + 1
        );
    }
}


function pasoAnterior() {

    if (pasoActualConvocatoria > 1) {

        actualizarWizard(
            pasoActualConvocatoria - 1
        );
    }
}


/* ==========================================================
   9. CATÁLOGO DE REQUISITOS
========================================================== */

async function cargarCatalogoRequisitosUI() {

    const contenedor =
        document.getElementById(
            "contenedorRequisitos"
        );

    if (!contenedor) return;

    contenedor.innerHTML = `
        <p class="text-center text-muted">
            <i class="fa-solid fa-spinner fa-spin me-2"></i>
            Cargando catálogo...
        </p>
    `;

    try {

        const respuesta =
            await fetch("/api/requisitos");

        if (!respuesta.ok) {
            throw new Error(
                `Error HTTP ${respuesta.status}`
            );
        }

        const requisitos =
            await respuesta.json();

        contenedor.innerHTML = "";

        if (
            !Array.isArray(requisitos) ||
            requisitos.length === 0
        ) {

            contenedor.innerHTML = `
                <p class="text-muted">
                    No hay requisitos registrados.
                </p>
            `;

            return;
        }

        requisitos.forEach(requisito => {

            const fila =
                document.createElement("div");

            fila.className =
                "d-flex justify-content-between align-items-center mb-2 p-2 border rounded";

            fila.style.cssText = `
                background: var(--color-card-bg, #fff);
                border-color: var(--color-border, #dee2e6) !important;
            `;

            fila.innerHTML = `
                <div class="form-check mb-0">

                    <input
                        class="form-check-input req-checkbox"
                        type="checkbox"
                        value="${requisito.id}"
                        id="req_${requisito.id}">

                    <label
                        class="form-check-label"
                        for="req_${requisito.id}"
                        style="cursor: pointer;">

                        ${escaparHTML(requisito.nombre)}

                    </label>

                </div>

                <div class="form-check form-switch mb-0">

                    <input
                        class="form-check-input req-obligatorio"
                        type="checkbox"
                        id="obligatorio_${requisito.id}">

                    <label
                        class="form-check-label small"
                        for="obligatorio_${requisito.id}"
                        style="cursor: pointer;">

                        Obligatorio

                    </label>

                </div>
            `;

            contenedor.appendChild(fila);
        });

    } catch (error) {

        console.error(
            "Error al cargar requisitos:",
            error
        );

        contenedor.innerHTML = `
            <p class="text-danger">
                Error al cargar los requisitos.
            </p>
        `;
    }
}


/* ==========================================================
   10. LIMPIAR Y ABRIR MODAL
========================================================== */

function limpiarFormularioConvocatoria() {

    const formulario =
        document.getElementById(
            "formConvocatoria"
        );

    formulario?.reset();

    const idInput =
        document.getElementById(
            "idConvocatoriaForm"
        );

    if (idInput) {
        idInput.value = "";
    }

    const titulo =
        document.getElementById(
            "tituloModalConvocatoria"
        );

    if (titulo) {

        titulo.innerHTML = `
            <i class="fa-solid fa-bullhorn text-primary me-2"></i>
            Nueva Convocatoria
        `;
    }

    const btnEliminar =
        document.getElementById(
            "btnEliminarConvocatoria"
        );

    if (btnEliminar) {
        btnEliminar.style.display = "none";
        btnEliminar.onclick = null;
    }

    const contenedorOpciones =
        document.getElementById(
            "contenedorOpcionesPosgrado"
        );

    if (contenedorOpciones) {

        contenedorOpciones.innerHTML = `
            <p class="text-muted small mb-0">
                <i class="fa-solid fa-circle-info me-1"></i>
                Selecciona un posgrado para ver sus especialidades.
            </p>
        `;
    }

    document
        .querySelectorAll(
            "#contenedorRequisitos .req-checkbox"
        )
        .forEach(checkbox => {

            checkbox.checked = false;

            const obligatorio =
                document.getElementById(
                    `obligatorio_${checkbox.value}`
                );

            if (obligatorio) {
                obligatorio.checked = false;
            }
        });

    limpiarFechasFlatpickr();
    toggleCamposPorTipo("");
    actualizarWizard(1);
}


function limpiarFechasFlatpickr() {

    document
        .querySelectorAll(".date-single")
        .forEach(campo => {

            if (campo._flatpickr) {
                campo._flatpickr.clear();
            } else {
                campo.value = "";
            }
        });
}


function crearConvocatoria() {

    limpiarFormularioConvocatoria();

    const modalElement =
        document.getElementById(
            "modalConvocatoria"
        );

    if (!modalElement) return;

    bootstrap.Modal
        .getOrCreateInstance(modalElement)
        .show();
}


/* ==========================================================
   11. OBTENER DATOS DEL FORMULARIO
========================================================== */

function obtenerDatosFormularioConvocatoria() {

    const posgradoId =
        obtenerValorCampo(
            "convocatoria_posgrado"
        );

    const posgrado =
        todosLosPosgrados.find(
            item => item.id == posgradoId
        );

    const tipo =
        normalizarTipoPosgrado(
            posgrado?.tipo,
            posgrado?.nombre
        );

    const requisitos = [];

    document
        .querySelectorAll(
            "#contenedorRequisitos .req-checkbox:checked"
        )
        .forEach(checkbox => {

            const obligatorio =
                document.getElementById(
                    `obligatorio_${checkbox.value}`
                );

            requisitos.push({
                id: Number(checkbox.value),
                obligatorio:
                    Boolean(obligatorio?.checked)
            });
        });

    const opciones = [];

    document
        .querySelectorAll(
            "#contenedorOpcionesPosgrado .opc-checkbox:checked"
        )
        .forEach(checkbox => {

            const idOpcion =
                Number(checkbox.value);

            const inputCupos =
                document.getElementById(
                    `cupos_opc_${idOpcion}`
                );

            opciones.push({
                idOpcionPosgrado: idOpcion,

                cupos:
                    inputCupos?.value
                        ? Number(inputCupos.value)
                        : null
            });
        });

    return {
        nombre:
            obtenerValorCampo(
                "convocatoria_nombre"
            ).trim(),

        descripcion:
            obtenerValorCampo(
                "convocatoria_descripcion"
            ).trim(),

        fecha_inicio:
            obtenerValorCampo(
                "convocatoria_fecha_inicio"
            ) || null,

        fecha_fin:
            obtenerValorCampo(
                "convocatoria_fecha_fin"
            ) || null,

        estado:
            obtenerValorCampo(
                "convocatoria_estado"
            ),

        posgrado_id:
            Number(posgradoId),

        tipo,

        modalidad:
            obtenerValorCampo(
                "convocatoria_modalidad"
            ),

        duracion:
            Number(
                obtenerValorCampo(
                    "convocatoria_duracion"
                )
            ),

        fechaInicioDocumentos:
            obtenerValorCampo(
                "convocatoria_fechaInicioDocumentos"
            ) || null,

        fechaFinDocumentos:
            obtenerValorCampo(
                "convocatoria_fechaFinDocumentos"
            ) || null,

        fechaEntrevistaInicio:
            tipo === "DOCTORADO"
                ? obtenerValorCampo(
                    "convocatoria_fechaEntrevistaInicio"
                ) || null
                : null,

        fechaEntrevistaFin:
            tipo === "DOCTORADO"
                ? obtenerValorCampo(
                    "convocatoria_fechaEntrevistaFin"
                ) || null
                : null,

        fechaInicioEscolar:
            obtenerValorCampo(
                "convocatoria_fechaInicioEscolar"
            ) || null,

        fechaResultados:
            obtenerValorCampo(
                "convocatoria_fechaResultados"
            ) || null,

        inicioCurso:
            tipo === "MAESTRIA"
                ? obtenerValorCampo(
                    "convocatoria_inicioCurso"
                ) || null
                : null,

        finCurso:
            tipo === "MAESTRIA"
                ? obtenerValorCampo(
                    "convocatoria_finCurso"
                ) || null
                : null,

        inicioExamen:
            tipo === "MAESTRIA"
                ? obtenerValorCampo(
                    "convocatoria_inicioExamen"
                ) || null
                : null,

        finExamen:
            tipo === "MAESTRIA"
                ? obtenerValorCampo(
                    "convocatoria_finExamen"
                ) || null
                : null,

        requisitos,
        opciones
    };
}


function obtenerValorCampo(id) {

    return document
        .getElementById(id)
        ?.value || "";
}


/* ==========================================================
   12. GUARDAR O ACTUALIZAR
========================================================== */

async function guardarConvocatoria(event) {

    event.preventDefault();

    const datos =
        obtenerDatosFormularioConvocatoria();

    if (!validarDatosConvocatoria(datos)) {
        return;
    }

    const id =
        obtenerValorCampo(
            "idConvocatoriaForm"
        );

    const esEdicion =
        Boolean(id.trim());

    const url =
        esEdicion
            ? `/api/convocatorias/${id}`
            : "/api/convocatorias";

    const metodo =
        esEdicion
            ? "PUT"
            : "POST";

    const token =
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        "";

    const btnGuardar =
        document.getElementById(
            "btnSaveConvocatoria"
        );

    try {

        if (btnGuardar) {

            btnGuardar.disabled = true;

            btnGuardar.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2"></span>
                Guardando...
            `;
        }

        const respuesta =
            await fetch(url, {

                method: metodo,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`
                },

                body:
                    JSON.stringify(datos)
            });

        const resultado =
            await respuesta
                .json()
                .catch(() => ({}));

        if (
            !respuesta.ok ||
            resultado.success === false
        ) {

            throw new Error(
                resultado.mensaje ||
                resultado.error ||
                "No se pudo guardar la convocatoria."
            );
        }

        Swal.fire({
            icon: "success",

            title:
                esEdicion
                    ? "Convocatoria actualizada"
                    : "Convocatoria creada",

            text:
                resultado.mensaje ||
                "La operación se realizó correctamente.",

            timer: 1700,

            showConfirmButton: false
        });

        const modalElement =
            document.getElementById(
                "modalConvocatoria"
            );

        bootstrap.Modal
            .getInstance(modalElement)
            ?.hide();

        limpiarFormularioConvocatoria();
        await cargarConvocatorias();

    } catch (error) {

        console.error(
            "Error al guardar convocatoria:",
            error
        );

        Swal.fire(
            "Error",
            error.message,
            "error"
        );

    } finally {

        if (btnGuardar) {

            btnGuardar.disabled = false;

            btnGuardar.innerHTML = `
                <i class="fa-solid fa-floppy-disk me-1"></i>
                Guardar Convocatoria
            `;
        }
    }
}


function validarDatosConvocatoria(datos) {

    const camposGenerales = [
        datos.nombre,
        datos.posgrado_id,
        datos.tipo,
        datos.estado,
        datos.modalidad,
        datos.duracion,
        datos.fecha_inicio,
        datos.fecha_fin,
        datos.fechaInicioDocumentos,
        datos.fechaFinDocumentos,
        datos.fechaInicioEscolar,
        datos.fechaResultados
    ];

    if (
        camposGenerales.some(
            valor => !valor
        )
    ) {

        Swal.fire(
            "Campos incompletos",
            "Revisa los datos obligatorios de la convocatoria.",
            "warning"
        );

        return false;
    }

    if (
        datos.fecha_fin <
        datos.fecha_inicio
    ) {

        Swal.fire(
            "Fechas inválidas",
            "La fecha final no puede ser anterior al inicio.",
            "warning"
        );

        actualizarWizard(2);

        return false;
    }

    if (datos.tipo === "DOCTORADO") {

        if (
            !datos.fechaEntrevistaInicio ||
            !datos.fechaEntrevistaFin
        ) {

            Swal.fire(
                "Fechas incompletas",
                "Completa el periodo de entrevistas.",
                "warning"
            );

            actualizarWizard(3);

            return false;
        }
    }

    if (datos.tipo === "MAESTRIA") {

        if (
            !datos.inicioCurso ||
            !datos.finCurso ||
            !datos.inicioExamen ||
            !datos.finExamen
        ) {

            Swal.fire(
                "Fechas incompletas",
                "Completa las fechas del curso y del examen.",
                "warning"
            );

            actualizarWizard(3);

            return false;
        }
    }

    return true;
}


/* ==========================================================
   13. EDITAR CONVOCATORIA
========================================================== */

async function editarConvocatoria(id) {

    try {

        const respuesta =
            await fetch(
                `/api/convocatorias/${id}`
            );

        if (!respuesta.ok) {
            throw new Error(
                "Convocatoria no encontrada."
            );
        }

        const convocatoria =
            await respuesta.json();

        limpiarFormularioConvocatoria();

        establecerValorCampo(
            "idConvocatoriaForm",
            convocatoria.id
        );

        establecerValorCampo(
            "convocatoria_posgrado",
            convocatoria.posgrado_id
        );

        establecerValorCampo(
            "convocatoria_nombre",
            convocatoria.nombre
        );

        establecerValorCampo(
            "convocatoria_descripcion",
            convocatoria.descripcion
        );

        establecerValorCampo(
            "convocatoria_estado",
            convocatoria.estado ||
            "Borrador"
        );

        establecerValorCampo(
            "convocatoria_modalidad",
            convocatoria.modalidad ||
            "Escolarizada"
        );

        establecerValorCampo(
            "convocatoria_duracion",
            convocatoria.duracion
        );

        establecerFechaCampo(
            "convocatoria_fecha_inicio",
            convocatoria.fecha_inicio
        );

        establecerFechaCampo(
            "convocatoria_fecha_fin",
            convocatoria.fecha_fin
        );

        establecerFechaCampo(
            "convocatoria_fechaInicioDocumentos",
            convocatoria.fechaInicioDocumentos
        );

        establecerFechaCampo(
            "convocatoria_fechaFinDocumentos",
            convocatoria.fechaFinDocumentos
        );

        establecerFechaCampo(
            "convocatoria_fechaEntrevistaInicio",
            convocatoria.fechaEntrevistaInicio
        );

        establecerFechaCampo(
            "convocatoria_fechaEntrevistaFin",
            convocatoria.fechaEntrevistaFin
        );

        establecerFechaCampo(
            "convocatoria_fechaInicioEscolar",
            convocatoria.fechaInicioEscolar
        );

        establecerFechaCampo(
            "convocatoria_fechaResultados",
            convocatoria.fechaResultados
        );

        establecerFechaCampo(
            "convocatoria_inicioCurso",
            convocatoria.inicioCurso
        );

        establecerFechaCampo(
            "convocatoria_finCurso",
            convocatoria.finCurso
        );

        establecerFechaCampo(
            "convocatoria_inicioExamen",
            convocatoria.inicioExamen
        );

        establecerFechaCampo(
            "convocatoria_finExamen",
            convocatoria.finExamen
        );

        renderizarOpcionesPorPosgrado(
            convocatoria.posgrado_id,
            convocatoria.opciones || [],
            true
        );

        await cargarRequisitosConvocatoria(
            id
        );

        const titulo =
            document.getElementById(
                "tituloModalConvocatoria"
            );

        if (titulo) {

            titulo.innerHTML = `
                <i class="fa-solid fa-pen-to-square text-primary me-2"></i>
                Editar Convocatoria
            `;
        }

        const btnEliminar =
            document.getElementById(
                "btnEliminarConvocatoria"
            );

        if (btnEliminar) {

            btnEliminar.style.display =
                "inline-block";

            btnEliminar.onclick = () => {
                eliminarConvocatoria(id);
            };
        }

        actualizarWizard(1);

        const modalElement =
            document.getElementById(
                "modalConvocatoria"
            );

        bootstrap.Modal
            .getOrCreateInstance(modalElement)
            .show();

    } catch (error) {

        console.error(
            "Error al editar convocatoria:",
            error
        );

        Swal.fire(
            "Error",
            "No se pudieron cargar los datos de la convocatoria.",
            "error"
        );
    }
}


async function cargarRequisitosConvocatoria(id) {

    try {

        const respuesta =
            await fetch(
                `/api/convocatorias/${id}/requisitos`
            );

        if (!respuesta.ok) {
            return;
        }

        const requisitos =
            await respuesta.json();

        if (!Array.isArray(requisitos)) {
            return;
        }

        requisitos.forEach(requisito => {

            const checkbox =
                document.getElementById(
                    `req_${requisito.id}`
                );

            const obligatorio =
                document.getElementById(
                    `obligatorio_${requisito.id}`
                );

            if (checkbox) {
                checkbox.checked = true;
            }

            if (obligatorio) {
                obligatorio.checked =
                    requisito.obligatorio === 1 ||
                    requisito.obligatorio === true;
            }
        });

    } catch (error) {

        console.warn(
            "No se pudieron cargar los requisitos:",
            error
        );
    }
}


function establecerValorCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(id);

    if (campo) {
        campo.value =
            valor ?? "";
    }
}


function establecerFechaCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(id);

    if (!campo) return;

    const fecha =
        valor
            ? String(valor).split("T")[0]
            : "";

    if (campo._flatpickr) {

        if (fecha) {
            campo._flatpickr.setDate(
                fecha,
                true
            );
        } else {
            campo._flatpickr.clear();
        }

    } else {

        campo.value = fecha;
    }
}


/* ==========================================================
   14. ELIMINAR CONVOCATORIA
========================================================== */

async function eliminarConvocatoria(id) {

    const idConvocatoria =
        id ||
        obtenerValorCampo(
            "idConvocatoriaForm"
        );

    if (!idConvocatoria) {

        Swal.fire(
            "Error",
            "No se encontró la convocatoria.",
            "error"
        );

        return;
    }

    const confirmacion =
        await Swal.fire({
            title:
                "¿Eliminar convocatoria?",

            text:
                "Esta acción no se puede deshacer.",

            icon:
                "warning",

            showCancelButton:
                true,

            confirmButtonColor:
                "#d33",

            cancelButtonColor:
                "#64748b",

            confirmButtonText:
                "Sí, eliminar",

            cancelButtonText:
                "Cancelar"
        });

    if (!confirmacion.isConfirmed) {
        return;
    }

    const token =
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        "";

    try {

        const respuesta =
            await fetch(
                `/api/convocatorias/${idConvocatoria}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const resultado =
            await respuesta
                .json()
                .catch(() => ({}));

        if (
            !respuesta.ok ||
            resultado.success === false
        ) {

            throw new Error(
                resultado.mensaje ||
                "No se pudo eliminar."
            );
        }

        Swal.fire({
            icon:
                "success",

            title:
                "Convocatoria eliminada",

            text:
                resultado.mensaje ||
                "La convocatoria fue eliminada.",

            timer:
                1500,

            showConfirmButton:
                false
        });

        const modalElement =
            document.getElementById(
                "modalConvocatoria"
            );

        bootstrap.Modal
            .getInstance(modalElement)
            ?.hide();

        limpiarFormularioConvocatoria();
        await cargarConvocatorias();

    } catch (error) {

        console.error(
            "Error al eliminar convocatoria:",
            error
        );

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }
}


/* ==========================================================
   15. SEGURIDAD BÁSICA PARA TEXTO HTML
========================================================== */

function escaparHTML(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================================
   16. FUNCIONES GLOBALES
========================================================== */

window.cargarConvocatorias =
    cargarConvocatorias;

window.crearConvocatoria =
    crearConvocatoria;

window.editarConvocatoria =
    editarConvocatoria;

window.eliminarConvocatoria =
    eliminarConvocatoria;

window.guardarConvocatoria =
    guardarConvocatoria;

window.cargarPosgradosEnSelect =
    cargarPosgradosEnSelect;

window.cargarOpcionesPosgradoGlobal =
    cargarOpcionesPosgradoGlobal;

window.cargarCatalogoRequisitosUI =
    cargarCatalogoRequisitosUI;

window.inicializarFlatpickr =
    inicializarFlatpickr;

window.renderizarOpcionesPorPosgrado =
    renderizarOpcionesPorPosgrado;

window.toggleCamposPorTipo =
    toggleCamposPorTipo;

window.limpiarFormularioConvocatoria =
    limpiarFormularioConvocatoria;

window.irAlPaso =
    irAlPaso;

window.siguientePaso =
    siguientePaso;

window.pasoAnterior =
    pasoAnterior;