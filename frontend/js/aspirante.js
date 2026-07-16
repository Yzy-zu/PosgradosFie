// Variables globales
let nivelAcademicoSeleccionado = null;
let estacionActual = 0;
let aspiranteData = null; // Almacenará los datos de la BD del aspirante
let currentSolicitudId = null;

// Comprobación de Sesión y Estado de Registro al inicializar la página
document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem('token');
    const usuarioStr = sessionStorage.getItem('usuario');
    const programaElegido = sessionStorage.getItem('programaPendiente');

    if (!token || !usuarioStr) {
        // Redirigir al login si se accede directamente a aspirante.html sin sesión
        window.location.href = "login.html";
        return;
    }

    const usuario = JSON.parse(usuarioStr);
    const saludo = document.getElementById('saludo-usuario');

    // Obtener datos del aspirante real
    try {
        const resAspirantes = await fetch('http://localhost:4000/api/aspirante');
        if (resAspirantes.ok) {
            const listaAspirantes = await resAspirantes.json();
            // Buscar aspirante por idUsuario
            aspiranteData = listaAspirantes.find(a => a.idUsuario === usuario.id);

            if (aspiranteData) {
                if (saludo) saludo.innerText = `Hola Bienvenid@, ${aspiranteData.nombre} ${aspiranteData.primerApellido}`;

                // Actualizar menú de perfil
                const lblNombre = document.getElementById('perfil-nombre');
                const lblCorreo = document.getElementById('perfil-correo');
                const lblTelefono = document.getElementById('perfil-telefono');

                if (lblNombre) lblNombre.innerText = `${aspiranteData.nombre} ${aspiranteData.primerApellido} ${aspiranteData.segundoApellido}`;
                if (lblCorreo) lblCorreo.innerText = aspiranteData.correo;
                if (lblTelefono) lblTelefono.innerText = aspiranteData.telefono;
            } else {
                if (saludo) saludo.innerText = `Hola Bienvenid@, Aspirante`;
            }
        }
    } catch (e) {
        console.error("Error obteniendo datos del aspirante:", e);
    }

    // Activar módulos si venía de un redireccionamiento
    if (programaElegido) {
        activarModulosPostRegistro(programaElegido);
    }
});

/**
 * Control del cambio de paneles (Navegación lateral)
 */
function switchView(viewId) {
    // Ocultar todas las secciones de contenido
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.style.display = 'none');

    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Actualizar estados visuales en la barra de navegación lateral
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetNavLink = document.getElementById(`nav-${viewId}`);
    if (targetNavLink) {
        targetNavLink.classList.add('active');
    }

    // Cargar notificaciones si se abre esa vista
    if (viewId === 'notificaciones') {
        cargarNotificaciones();
    }
}

/**
 * Carga las notificaciones desde la API
 */
async function cargarNotificaciones() {
    const contenedor = document.getElementById('contenedor-notificaciones');
    if (!contenedor) return;

    // Estado de carga inicial
    contenedor.innerHTML = '<div class="card"><p>Cargando notificaciones...</p></div>';

    try {
        const res = await fetch('http://localhost:4000/api/notificaciones', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (res.ok) {
            const notificaciones = await res.json();
            if (!notificaciones || notificaciones.length === 0) {
                contenedor.innerHTML = '<div class="card"><p>No tienes notificaciones nuevas.</p></div>';
            } else {
                let html = '';
                notificaciones.forEach(notif => {
                    html += `
                    <div class="card" style="margin-bottom: 10px;">
                        <p><strong><i class="fa-solid fa-bell" style="color: #8a1c24;"></i> ${notif.nombre}:</strong> ${notif.mensaje}</p>
                    </div>`;
                });
                contenedor.innerHTML = html;
            }
        } else {
            // Error o endpoint no existe
            contenedor.innerHTML = '<div class="card"><p><strong><i class="fa-solid fa-triangle-exclamation" style="color: #e67e22;"></i> Sistema FIE:</strong> Las notificaciones no están disponibles por el momento.</p></div>';
        }
    } catch (e) {
        // Fallback por si la API aún no está implementada por el backend
        console.warn("Ocurrio un error al obtener notificaciones:", e);
        contenedor.innerHTML = '<div class="card"><p><strong><i class="fa-solid fa-triangle-exclamation" style="color: #e67e22;"></i> Sistema FIE:</strong> Recuerda verificar las fechas límite del calendario de admisiones. (Modo Offline)</p></div>';
    }
}

/**
 * Flujo: Al dar clic en Maestría o Doctorado desde el panel principal deslogueado
 */
function seleccionarPrograma(nombrePrograma) {
    const token = sessionStorage.getItem('token');
    const usuario = sessionStorage.getItem('usuario');

    // SI NO HA INICIADO SESIÓN (Es un aspirante nuevo o sin credenciales activas)
    if (!token || !usuario) {
        alert(`Para postularte a la ${nombrePrograma} debes confirmar tus credenciales de registro. Redirigiendo...`);

        // Guardamos temporalmente qué programa seleccionó
        sessionStorage.setItem('programaPendiente', nombrePrograma);

        // Lo mandamos al formulario de registro limpio (registro.html)
        window.location.href = "registro.html";
    } else {
        // SI YA TIENE CUENTA E INICIÓ SESIÓN: Desbloquea y activa los módulos en el acto
        sessionStorage.setItem('programaPendiente', nombrePrograma);
        activarModulosPostRegistro(nombrePrograma);
    }
}

/**
 * Modifica la lista de convocatorias e inyecta la lógica adaptativa según el nivel (Maestría / Doctorado)
 */
async function activarModulosPostRegistro(nombrePrograma) {
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'none';
        navDocumentos.classList.add('hidden');
    }

    const panelSeleccion = document.getElementById('seleccion-programa');
    const panelListaAbierta = document.getElementById('lista-programas-abiertos');
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas-programas');

    if (panelSeleccion) panelSeleccion.style.display = 'none';
    if (panelListaAbierta) panelListaAbierta.style.display = 'block';

    if (contenedorTarjetas) {
        contenedorTarjetas.innerHTML = "<p>Cargando convocatorias...</p>";
        let htmlConvocatorias = '';
        let nivel = nombrePrograma.includes('Doctorado') ? 'DOCTORADO' : 'MAESTRIA';
        nivelAcademicoSeleccionado = nivel === 'DOCTORADO' ? 'Doctorado' : 'Maestría';

        try {
            const respuesta = await fetch('/api/convocatorias');
            if (respuesta.ok) {
                const convocatorias = await respuesta.json();
                const activas = convocatorias.filter(c => c.estado === 'Activa' && c.tipo === nivel);

                htmlConvocatorias = `<h3>Oferta Académica Desbloqueada: ${nivel === 'DOCTORADO' ? 'Doctorados' : 'Maestrías'} FIE</h3><br>`;
                if (activas.length === 0) {
                    htmlConvocatorias += `<p style="color: #555;">No hay convocatorias abiertas en este momento para este nivel.</p>`;
                } else {
                    activas.forEach(c => {
                        // Formatear fechas
                        const fechaCierre = new Date(c.fecha_fin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

                        htmlConvocatorias += `
                            <div class="convocatoria-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                                <h4>${c.nombre}</h4>
                                <p style="margin: 5px 0; color: #555; font-size: 0.95rem;"><strong>${c.posgrado_nombre || ''}</strong></p>
                                <p style="margin: 5px 0; color: #555;">${c.descripcion || 'Sin descripción disponible.'}</p>
                                <p style="font-size: 14px; color: #8a1c24; margin-bottom: 10px;"><strong>Estado:</strong> Abierta | <strong>Cierre:</strong> ${fechaCierre}</p>
                                <button class="btn-primary" style="width:auto; padding:6px 15px; font-size:13px;" onclick="prepararFlujoEstaciones('${nivelAcademicoSeleccionado}', ${c.id})">Iniciar Proceso de Registro</button>
                            </div>
                        `;
                    });
                }
            } else {
                htmlConvocatorias = `<p>Error al cargar convocatorias.</p>`;
            }
        } catch (error) {
            console.error("Error al obtener convocatorias:", error);
            htmlConvocatorias = `<p>Error de conexión al cargar convocatorias.</p>`;
        }

        contenedorTarjetas.innerHTML = htmlConvocatorias;
    }

    // Ejecutar actualización de gráficas inicial si existen los elementos
    if (document.getElementById('grafica-pastel')) {
        actualizarGraficaProceso();
    }
}

/**
 * Reconfigura los textos y despliega los formularios correctos según la herencia de datos
 */
async function prepararFlujoEstaciones(nivel, idConvocatoria) {
    if (!aspiranteData) {
        alert("No se pudo cargar la información del aspirante. Intente recargar.");
        return;
    }

    // Crear Solicitud en la base de datos
    try {
        const respuestaSoli = await fetch('http://localhost:4000/api/solicitud/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idAspi: aspiranteData.id,
                idC: idConvocatoria
            })
        });

        if (respuestaSoli.ok) {
            const dataSoli = await respuestaSoli.json();
            currentSolicitudId = dataSoli.idSolicitud;
        } else {
            alert("Hubo un error al crear la solicitud en el servidor.");
            return;
        }
    } catch (e) {
        console.error(e);
        alert("Fallo de conexión al crear solicitud.");
        return;
    }

    if (idConvocatoria) sessionStorage.setItem('idConvocatoriaPendiente', idConvocatoria);
    nivelAcademicoSeleccionado = nivel;

    // Mostrar pestaña de Documentos ahora que ya seleccionó convocatoria
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block';
        navDocumentos.classList.remove('hidden');
    }

    // Elementos generales
    const titulo = document.getElementById('titulo-flujo-documentos');
    const boxCostos = document.getElementById('box-costos-desglose');

    if (nivel === "Doctorado") {
        if (titulo) titulo.innerText = "Continuidad de Expediente Académico: Doctorado FIE";

        // Ajustar labels del Stepper
        if (document.getElementById('lbl-step-1')) document.getElementById('lbl-step-1').innerText = "CV (Heredado)";
        if (document.getElementById('lbl-step-2')) document.getElementById('lbl-step-2').innerText = "Propuesta Proyecto";
        if (document.getElementById('lbl-step-3')) document.getElementById('lbl-step-3').innerText = "Idioma / Cartas";
        if (document.getElementById('lbl-step-4')) document.getElementById('lbl-step-4').innerText = "Entrevista Sínodo";

        // Cambiar paneles visibles dentro de las estaciones
        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'none';
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'block';
        if (document.getElementById('grid-maestria-1')) document.getElementById('grid-maestria-1').style.display = 'none';
        if (document.getElementById('grid-doctorado-1')) document.getElementById('grid-doctorado-1').style.display = 'block';
        if (document.getElementById('grid-maestria-2')) document.getElementById('grid-maestria-2').style.display = 'none';
        if (document.getElementById('grid-doctorado-2')) document.getElementById('grid-doctorado-2').style.display = 'block';
        if (document.getElementById('grid-maestria-3')) document.getElementById('grid-maestria-3').style.display = 'none';
        if (document.getElementById('grid-doctorado-3')) document.getElementById('grid-doctorado-3').style.display = 'block';
        if (document.getElementById('grid-maestria-4')) document.getElementById('grid-maestria-4').style.display = 'none';
        if (document.getElementById('grid-doctorado-4')) document.getElementById('grid-doctorado-4').style.display = 'block';

        if (boxCostos) {
            boxCostos.innerHTML = `
                <h4>Aranceles y Conceptos de Pago (Doctorado)</h4>
                <div class="costo-linea"><span style="color:#27ae60;">✓ Exención por Continuidad FIE:</span> <strong>$ 0.00 MXN</strong></div>
                <small style="color:#777;">Al ser egresado directo del posgrado FIE, los derechos de examen interno quedan exentos.</small>
            `;
        }

        if (document.getElementById('btn-next-0')) {
            document.getElementById('btn-next-0').disabled = true;
        }
    } else {
        // Restaurar estado inicial de Maestría
        if (titulo) titulo.innerText = "Seguimiento de Trámites y Requisitos de Ingreso";
        if (document.getElementById('lbl-step-1')) document.getElementById('lbl-step-1').innerText = "Personales";
        if (document.getElementById('lbl-step-2')) document.getElementById('lbl-step-2').innerText = "Académicos";
        if (document.getElementById('lbl-step-3')) document.getElementById('lbl-step-3').innerText = "Cartas";
        if (document.getElementById('lbl-step-4')) document.getElementById('lbl-step-4').innerText = "CENEVAL";

        if (document.getElementById('opciones-admision-maestria')) document.getElementById('opciones-admision-maestria').style.display = 'block';
        if (document.getElementById('opciones-admision-doctorado')) document.getElementById('opciones-admision-doctorado').style.display = 'none';
        if (document.getElementById('grid-maestria-1')) document.getElementById('grid-maestria-1').style.display = 'flex';
        if (document.getElementById('grid-doctorado-1')) document.getElementById('grid-doctorado-1').style.display = 'none';
        if (document.getElementById('grid-maestria-2')) document.getElementById('grid-maestria-2').style.display = 'flex';
        if (document.getElementById('grid-doctorado-2')) document.getElementById('grid-doctorado-2').style.display = 'none';
        if (document.getElementById('grid-maestria-3')) document.getElementById('grid-maestria-3').style.display = 'flex';
        if (document.getElementById('grid-doctorado-3')) document.getElementById('grid-doctorado-3').style.display = 'none';
        if (document.getElementById('grid-maestria-4')) document.getElementById('grid-maestria-4').style.display = 'block';
        if (document.getElementById('grid-doctorado-4')) document.getElementById('grid-doctorado-4').style.display = 'none';

        if (document.getElementById('btn-next-0')) {
            document.getElementById('btn-next-0').disabled = false;
        }
        actualizarCostosAdmision();
    }

    // Redirigir a la vista de documentos
    switchView('documentos');
}

/**
 * LÓGICA DE LAS ESTACIONES (STEPPER) - NAVEGACIÓN
 */
function cambiarEstacion(nuevaEstacion) {
    // Ocultar panel actual y mostrar el nuevo
    document.getElementById(`panel-estacion-${estacionActual}`).classList.remove('active-panel');
    document.getElementById(`panel-estacion-${nuevaEstacion}`).classList.add('active-panel');

    // Manejar el estado visual en la barra de progreso (Nodos)
    document.getElementById(`node-${estacionActual}`).classList.remove('active');
    document.getElementById(`node-${estacionActual}`).classList.add('completed');
    document.getElementById(`node-${nuevaEstacion}`).classList.add('active');

    estacionActual = nuevaEstacion;
}

/**
 * Avanza estación e intenta subir los documentos al backend
 */
async function avanzarEstacion(nuevaEstacion) {
    const boton = document.getElementById(`btn-next-${estacionActual}`);
    if (boton) boton.disabled = true; // Deshabilitar temporalmente para evitar doble click

    const form = document.getElementById(`form-estacion-${estacionActual}`);
    if (form && currentSolicitudId) {
        const formData = new FormData(form);
        // Iterar sobre los archivos seleccionados en este form
        for (let [name, file] of formData.entries()) {
            if (file && file.size > 0) {
                const subidaData = new FormData();
                subidaData.append('idSoli', currentSolicitudId);
                subidaData.append('tipoDoc', name); // 'ACTA_NACIMIENTO', 'CV', etc.
                subidaData.append('archivo', file);

                try {
                    const res = await fetch('http://localhost:4000/api/documentos', {
                        method: 'POST',
                        body: subidaData
                    });

                    if (!res.ok) {
                        console.error(`Error al subir documento ${name}`);
                    }
                } catch (e) {
                    console.error("Error en petición de subida:", e);
                }
            }
        }
    }

    if (boton) boton.disabled = false;
    cambiarEstacion(nuevaEstacion);
}

/**
 * Actualización Dinámica de Costos (Estación 0) según las capturas del portal
 */
function actualizarCostosAdmision() {
    const inputs = document.querySelector('input[name="modalidad"]:checked');
    if (!inputs) return;

    const seleccionada = inputs.value;
    const costosBox = document.getElementById('box-costos-desglose');

    if (!costosBox) return;

    if (seleccionada === 'prope') {
        costosBox.innerHTML = `
            <h4>Aranceles y Conceptos de Pago (Maestría)</h4>
            <div class="costo-linea"><span>Curso Propedéutico Obligatorio:</span> <strong>$ 2,800.00 MXN</strong></div>
        `;
    } else if (seleccionada === 'examen') {
        costosBox.innerHTML = `
            <h4>Aranceles y Conceptos de Pago (Maestría)</h4>
            <div class="costo-linea"><span>Examen de Admisión General:</span> <strong>$ 1,000.00 MXN</strong></div>
        `;
    } else {
        costosBox.innerHTML = `
            <h4>Aranceles y Conceptos de Pago (Maestría)</h4>
            <div class="costo-linea"><span style="color:#27ae60;">✓ Exención de Aranceles:</span> <strong>$ 0.00 MXN</strong></div>
            <small style="color:#777; display:block; margin-top:5px;">El ingreso por promedio no genera cobro de curso propedéutico ni examen interno.</small>
        `;
    }
}

/**
 * Valida de forma dinámica los archivos requeridos dependiendo del posgrado seleccionado para habilitar botones
 */
function verificarArchivosEstacion(estacion) {
    if (nivelAcademicoSeleccionado === "Doctorado") {
        if (estacion === 0) {
            const grado = document.getElementById('file-grado-maestria').files.length > 0;
            document.getElementById('btn-next-0').disabled = !grado;
        }
        else if (estacion === 1) {
            const cv = document.getElementById('file-cv').files.length > 0;
            document.getElementById('btn-next-1').disabled = !cv;
        }
        else if (estacion === 2) {
            const propuesta = document.getElementById('file-propuesta').files.length > 0;
            document.getElementById('btn-next-2').disabled = !propuesta;
        }
        else if (estacion === 3) {
            const idioma = document.getElementById('file-idioma').files.length > 0;
            document.getElementById('btn-next-3').disabled = !idioma;
        }
        else if (estacion === 4) {
            const entrevistaCheck = document.getElementById('chk-entrevista').checked;
            document.getElementById('btn-finalizar').disabled = !entrevistaCheck;
        }
    } else {
        // Reglas de validación estándar de Maestría
        if (estacion === 1) {
            const acta = document.getElementById('file-acta').files.length > 0;
            const curp = document.getElementById('file-curp').files.length > 0;
            const ine = document.getElementById('file-ine').files.length > 0;
            const foto = document.getElementById('file-foto').files.length > 0;
            document.getElementById('btn-next-1').disabled = !(acta && curp && ine && foto);
        }
        else if (estacion === 2) {
            const certificado = document.getElementById('file-certificado').files.length > 0;
            document.getElementById('btn-next-2').disabled = !certificado;
        }
        else if (estacion === 3) {
            const c1 = document.getElementById('file-carta1').files.length > 0;
            const c2 = document.getElementById('file-carta2').files.length > 0;
            const c3 = document.getElementById('file-carta3').files.length > 0;
            document.getElementById('btn-next-3').disabled = !(c1 && c2 && c3);
        }
        else if (estacion === 4) {
            const ceneval = document.getElementById('file-ceneval').files.length > 0;
            document.getElementById('btn-finalizar').disabled = !ceneval;
        }
    }
}

/**
 * Concluye el proceso de registro mostrando alertas personalizadas por nivel y enviando los últimos archivos
 */
async function finalizarProcesoEstaciones() {
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) btnFinalizar.disabled = true;

    // Subir los últimos documentos (Estación 4)
    const form = document.getElementById(`form-estacion-4`);
    if (form && currentSolicitudId) {
        const formData = new FormData(form);
        for (let [name, file] of formData.entries()) {
            if (file && file.size > 0) {
                const subidaData = new FormData();
                subidaData.append('idSoli', currentSolicitudId);
                subidaData.append('tipoDoc', name);
                subidaData.append('archivo', file);
                try {
                    await fetch('http://localhost:4000/api/documentos', {
                        method: 'POST',
                        body: subidaData
                    });
                } catch (e) {
                    console.error("Error subiendo estación 4", e);
                }
            }
        }
    }

    if (nivelAcademicoSeleccionado === "Doctorado") {
        alert("¡Postulación a Doctorado Completada! Tus propuestas y notas de los profesores anónimos (P1, P2, P3) han sido enviadas a revisión.");
    } else {
        const fileTituloInput = document.getElementById('file-titulo');
        const tieneTitulo = fileTituloInput ? fileTituloInput.files.length > 0 : false;

        if (!tieneTitulo) {
            alert("¡Expediente Recibido con Éxito! Se ha detectado tu Título como PENDIENTE. Dispones de un periodo de prorroga institucional de 2 a 6 meses para cargar dicho documento.");
        } else {
            alert("¡Felicidades! Tu documentación completa ha sido enviada con éxito al comité de admisiones del Posgrado FIE.");
        }
    }

    // Aquí idealmente actualizamos el estado en la base de datos a EN_REVISION si tuviéramos un endpoint
    switchView('inicio');
}

// Base de datos local simulada para el estatus de los documentos del alumno
let estadosDocumentos = {
    acta: 'pendiente',
    ine: 'pendiente',
    certificado: 'pendiente',
    cartas: 'pendiente',
    ceneval: 'pendiente'
};

/**
 * Cambia el estado de un documento concreto y dispara el rediseño de la gráfica
 */
function cambiarEstadoDocumento(documento, nuevoEstado) {
    estadosDocumentos[documento] = nuevoEstado;
    actualizarGraficaProceso();
}

/**
 * Procesa matemáticamente las proporciones y redibuja la gráfica mediante CSS dinámico
 */
function actualizarGraficaProceso() {
    let totalDocs = 5;
    let aprobados = 0;
    let rechazados = 0;
    let pendientes = 0;

    for (let doc in estadosDocumentos) {
        if (estadosDocumentos[doc] === 'aprobado') aprobados++;
        else if (estadosDocumentos[doc] === 'rechazado') rechazados++;
        else pendientes++;
    }

    if (document.getElementById('lbl-aprobados')) document.getElementById('lbl-aprobados').innerText = aprobados;
    if (document.getElementById('lbl-rechazados')) document.getElementById('lbl-rechazados').innerText = rechazados;
    if (document.getElementById('lbl-pendientes')) document.getElementById('lbl-pendientes').innerText = pendientes;

    let porcAprobado = (aprobados / totalDocs) * 100;
    let porcRechazado = (rechazados / totalDocs) * 100;

    let finAprobados = porcAprobado;
    let finRechazados = finAprobados + porcRechazado;

    const grafica = document.getElementById('grafica-pastel');
    if (grafica) {
        grafica.style.background = `conic-gradient(
            #27ae60 0% ${finAprobados}%, 
            #c0392b ${finAprobados}% ${finRechazados}%, 
            #7f8c8d ${finRechazados}% 100%
        )`;
    }

    const txtPorcentaje = document.getElementById('txt-porcentaje');
    if (txtPorcentaje) {
        txtPorcentaje.innerText = `${Math.round(porcAprobado)}%`;
    }
}

/**
 * Limpieza de sesión total
 */
function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Función para regresar a la selección de Maestría/Doctorado sin reiniciar sesión
function regresarAConvocatorias() {
    const confirmacion = confirm("¿Estás seguro de que deseas volver? Si ya iniciaste un registro, podrías perder tu progreso actual.");
    if (!confirmacion) return;

    // 1. Volvemos a mostrar el contenedor con las dos tarjetas originales
    document.getElementById('seleccion-programa').style.display = 'flex';

    // 2. Ocultamos la lista detallada y el botón de regreso
    document.getElementById('lista-programas-abiertos').style.display = 'none';

    // 3. Ocultar la pestaña de documentos si nos regresamos
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'none';
        navDocumentos.classList.add('hidden');
    }
}
function toggleProfileMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('show');
}

// Cierra el menú si se hace clic fuera de él
window.addEventListener('click', function () {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
});