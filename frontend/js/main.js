// Comprobación de Sesión y Estado de Registro al inicializar la página
document.addEventListener("DOMContentLoaded", function() {
    console.log("Sistema Frontend UMSNH-FIE inicializado.");

    // 1. Mostrar saludo del usuario
    const usuarioLogueado = localStorage.getItem('usuarioLogueado') || "Aspirante";
    const saludo = document.getElementById('saludo-usuario');
    if (saludo) {
        saludo.innerText = `Hola Bienvenid@, ${usuarioLogueado}`;
    }

    // 2. VERIFICACIÓN CRÍTICA: ¿El usuario ya completó el flujo de registro?
    const yaSeRegistro = localStorage.getItem('registroCompletado');
    const programaElegido = localStorage.getItem('programaPendiente') || "Programa Seleccionado";

    if (yaSeRegistro === 'true') {
        // Si ya está registrado, forzamos que aparezcan los módulos ocultos
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
}

/**
 * Flujo: Al dar clic en Maestría o Doctorado
 */
function seleccionarPrograma(nombrePrograma) {
    alert(`Para postularte a la ${nombrePrograma} debes confirmar tus credenciales de registro. Redirigiendo...`);
    
    // Guardamos qué programa eligió para mostrarlo al volver
    localStorage.setItem('programaPendiente', nombrePrograma);
    
    // Mandamos al login con el parámetro en la URL (?action=register)
    window.location.href = 'index.html?action=register';
}

/**
 * Activa las opciones exclusivas de "Documentos y Pagos" y llena el listado de Convocatorias
 */
function activarModulosPostRegistro(nombrePrograma) {
    // 1. Mostrar la pestaña oculta de Documentos y Pagos en la barra vertical
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block'; 
        navDocumentos.classList.remove('hidden');
    }

    // 2. Modificar la interfaz interna de Convocatorias
    const panelSeleccion = document.getElementById('seleccion-programa');
    const panelListaAbierta = document.getElementById('lista-programas-abiertos');
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas-programas');

    // CORREGIDO: Se quitó el .style duplicado para evitar que truene el script
    if (panelSeleccion) panelSeleccion.style.display = 'none';
    if (panelListaAbierta) panelListaAbierta.style.display = 'block';

    // 3. Generar la lista extendida de convocatorias según la elección del alumno
    if (contenedorTarjetas) {
        let htmlConvocatorias = '';

        if (nombrePrograma.includes('Maestría')) {
            // Oferta de Maestrías para llenar la pantalla
            const maestrias = [
                { titulo: "Maestría en Ciencias en Ingeniería Eléctrica (Opción Automatización)", cierre: "15 de Julio", desc: "Enfoque en sistemas de control robusto, automatización industrial avanzada y procesamiento digital de señales." },
                { titulo: "Maestría en Ciencias en Ingeniería Eléctrica (Opción Sistemas de Potencia)", cierre: "18 de Julio", desc: "Especialización en análisis de redes eléctricas, estabilidad de sistemas operativos de potencia y energías renovables." },
                { titulo: "Maestría en Tecnologías Aplicadas a la Ingeniería FIE", cierre: "30 de Julio", desc: "Programa profesionalizante orientado al desarrollo de proyectos tecnológicos aplicados a la industria local." }
            ];

            htmlConvocatorias = `<h3>Oferta Académica Desbloqueada: Maestrías FIE</h3><br>`;
            maestrias.forEach(m => {
                htmlConvocatorias += `
                    <div class="convocatoria-item">
                        <h4>${m.titulo}</h4>
                        <p style="margin: 5px 0; color: #555;">${m.desc}</p>
                        <p style="font-size: 14px; color: #8a1c24;"><strong>Estado:</strong> Abierta | <strong>Fecha Límite de Recepción:</strong> ${m.cierre}</p>
                    </div>
                `;
            });

        } else {
            // Oferta de Doctorados para llenar la pantalla
            const doctorados = [
                { titulo: "Doctorado en Ciencias en Ingeniería Eléctrica (Sistemas Eléctricos de Potencia)", cierre: "10 de Agosto", desc: "Programa SNP de alta calidad enfocado en investigación científica, dinámica de sistemas y Smart Grids." },
                { titulo: "Doctorado Directo en Ingeniería Eléctrica (Egreso Licenciatura/Maestría)", cierre: "12 de Agosto", desc: "Modalidad flexible para la formación temprana de investigadores de alto nivel con proyectos consolidados." },
                { titulo: "Doctorado en Ciencias Interinstitucional en Computación / Control", cierre: "25 de Agosto", desc: "Líneas de investigación en Inteligencia Artificial, control automático no lineal y optimización de sistemas masivos." }
            ];

            htmlConvocatorias = `<h3>Oferta Académica Desbloqueada: Doctorados FIE</h3><br>`;
            doctorados.forEach(d => {
                htmlConvocatorias += `
                    <div class="convocatoria-item">
                        <h4>${d.titulo}</h4>
                        <p style="margin: 5px 0; color: #555;">${d.desc}</p>
                        <p style="font-size: 14px; color: #8a1c24;"><strong>Estado:</strong> Abierta | <strong>Fecha Límite de Recepción:</strong> ${d.cierre}</p>
                    </div>
                `;
            });
        }

        // Insertamos todo el bloque de HTML generado en la página
        contenedorTarjetas.innerHTML = htmlConvocatorias;
    }
}

/**
 * Limpieza de sesión total
 */
function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'index.html';
}
// Variable global para controlar qué nivel se está ejecutando en el flujo actual
let nivelAcademicoSeleccionado = "Maestría"; 

/**
 * Modifica la lista de convocatorias e inyecta la lógica adaptativa según el nivel (Maestría / Doctorado)
 */
function activarModulosPostRegistro(nombrePrograma) {
    const navDocumentos = document.getElementById('nav-documentos');
    if (navDocumentos) {
        navDocumentos.style.display = 'block'; 
        navDocumentos.classList.remove('hidden');
    }

    const panelSeleccion = document.getElementById('seleccion-programa');
    const panelListaAbierta = document.getElementById('lista-programas-abiertos');
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas-programas');

    if (panelSeleccion) panelSeleccion.style.display = 'none';
    if (panelListaAbierta) panelListaAbierta.style.display = 'block';

    if (contenedorTarjetas) {
        let htmlConvocatorias = '';

        // DETECTAMOS SI ES MAESTRÍA O DOCTORADO
        if (nombrePrograma.includes('Doctorado')) {
            nivelAcademicoSeleccionado = "Doctorado";
            
            const doctorados = [
                { id: "d1", titulo: "Doctorado en Ciencias en Ingeniería Eléctrica (Sistemas Eléctricos de Potencia)", cierre: "10 de Agosto", desc: "Programa SNP de alta calidad enfocado en investigación científica, dinámica de sistemas y Smart Grids." },
                { id: "d2", titulo: "Doctorado en Ciencias Interinstitucional en Computación / Control", cierre: "25 de Agosto", desc: "Líneas de investigación en Inteligencia Artificial y control automático no lineal." }
            ];

            htmlConvocatorias = `<h3>Oferta Académica Desbloqueada: Doctorados FIE</h3><br>`;
            doctorados.forEach(d => {
                htmlConvocatorias += `
                    <div class="convocatoria-item">
                        <h4>${d.titulo}</h4>
                        <p style="margin: 5px 0; color: #555;">${d.desc}</p>
                        <p style="font-size: 14px; color: #8a1c24; margin-bottom: 10px;"><strong>Estado:</strong> Abierta | <strong>Cierre:</strong> ${d.cierre}</p>
                        <button class="btn-primary" style="width:auto; padding:6px 15px; font-size:13px;" onclick="prepararFlujoEstaciones('Doctorado')">Iniciar Proceso de Registro</button>
                    </div>
                `;
            });
        } else {
            nivelAcademicoSeleccionado = "Maestría";
            
            const maestrias = [
                { id: "m1", titulo: "Maestría en Ciencias en Ingeniería Eléctrica (Opción Automatización)", cierre: "15 de Julio", desc: "Enfoque en sistemas de control robusto y procesamiento digital de señales." },
                { id: "m2", titulo: "Maestría en Tecnologías Aplicadas a la Ingeniería FIE", cierre: "30 de Julio", desc: "Programa profesionalizante orientado al desarrollo de proyectos tecnológicos." }
            ];

            htmlConvocatorias = `<h3>Oferta Académica Desbloqueada: Maestrías FIE</h3><br>`;
            maestrias.forEach(m => {
                htmlConvocatorias += `
                    <div class="convocatoria-item">
                        <h4>${m.titulo}</h4>
                        <p style="margin: 5px 0; color: #555;">${m.desc}</p>
                        <p style="font-size: 14px; color: #8a1c24; margin-bottom: 10px;"><strong>Estado:</strong> Abierta | <strong>Cierre:</strong> ${m.cierre}</p>
                        <button class="btn-primary" style="width:auto; padding:6px 15px; font-size:13px;" onclick="prepararFlujoEstaciones('Maestría')">Iniciar Proceso de Registro</button>
                    </div>
                `;
            });
        }
        contenedorTarjetas.innerHTML = htmlConvocatorias;
    }
}

/**
 * Reconfigura los textos y despliega los formularios correctos según la herencia de datos
 */
function prepararFlujoEstaciones(nivel) {
    nivelAcademicoSeleccionado = nivel;
    
    // Elementos generales
    const titulo = document.getElementById('titulo-flujo-documentos');
    const boxCostos = document.getElementById('box-costos-desglose');

    if(nivel === "Doctorado") {
        if(titulo) titulo.innerText = "Continuidad de Expediente Académico: Doctorado FIE";
        
        // Ajustar labels del Stepper
        document.getElementById('lbl-step-1').innerText = "CV (Heredado)";
        document.getElementById('lbl-step-2').innerText = "Propuesta Proyecto";
        document.getElementById('lbl-step-3').innerText = "Idioma / Cartas";
        document.getElementById('lbl-step-4').innerText = "Entrevista Sínodo";

        // Cambiar paneles visibles dentro de las estaciones
        document.getElementById('opciones-admision-maestria').style.display = 'none';
        document.getElementById('opciones-admision-doctorado').style.display = 'block';
        document.getElementById('grid-maestria-1').style.display = 'none';
        document.getElementById('grid-doctorado-1').style.display = 'block';
        document.getElementById('grid-maestria-2').style.display = 'none';
        document.getElementById('grid-doctorado-2').style.display = 'block';
        document.getElementById('grid-maestria-3').style.display = 'none';
        document.getElementById('grid-doctorado-3').style.display = 'block';
        document.getElementById('grid-maestria-4').style.display = 'none';
        document.getElementById('grid-doctorado-4').style.display = 'block';

        if(boxCostos) {
            boxCostos.innerHTML = `
                <h4>Aranceles y Conceptos de Pago (Doctorado)</h4>
                <div class="costo-linea"><span style="color:#27ae60;">✓ Exención por Continuidad FIE:</span> <strong>$ 0.00 MXN</strong></div>
                <small style="color:#777;">Al ser egresado directo del posgrado FIE, los derechos de examen interno quedan exentos.</small>
            `;
        }
        // El botón 0 de doctorado inicia activo si sube el grado
        document.getElementById('btn-next-0').disabled = true;
    } else {
        // Restaurar estado inicial de Maestría
        if(titulo) titulo.innerText = "Seguimiento de Trámites y Requisitos de Ingreso";
        document.getElementById('lbl-step-1').innerText = "Personales";
        document.getElementById('lbl-step-2').innerText = "Académicos";
        document.getElementById('lbl-step-3').innerText = "Cartas";
        document.getElementById('lbl-step-4').innerText = "CENEVAL";

        document.getElementById('opciones-admision-maestria').style.display = 'block';
        document.getElementById('opciones-admision-doctorado').style.display = 'none';
        document.getElementById('grid-maestria-1').style.display = 'flex';
        document.getElementById('grid-doctorado-1').style.display = 'none';
        document.getElementById('grid-maestria-2').style.display = 'flex';
        document.getElementById('grid-doctorado-2').style.display = 'none';
        document.getElementById('grid-maestria-3').style.display = 'flex';
        document.getElementById('grid-doctorado-3').style.display = 'none';
        document.getElementById('grid-maestria-4').style.display = 'block';
        document.getElementById('grid-doctorado-4').style.display = 'none';
        
        document.getElementById('btn-next-0').disabled = false;
        actualizarCostosAdmision();
    }

    // Redirigir a la vista de documentos
    switchView('documentos');
}

/**
 * Valida los archivos requeridos según el nivel académico activo
 */
function verificarArchivosEstacion(estacion) {
    if (nivelAcademicoSeleccionado === "Doctorado") {
        // VALIDACIÓN PARA DOCTORADO
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
        // VALIDACIÓN ORIGINAL PARA MAESTRÍA
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

// Asegurar que la función de navegación resetee los pasos gráficos si es necesario
let estacionActual = 0;
function cambiarEstacion(nuevaEstacion) {
    document.getElementById(`panel-estacion-${estacionActual}`).classList.remove('active-panel');
    document.getElementById(`panel-estacion-${nuevaEstacion}`).classList.add('active-panel');

    document.getElementById(`node-${estacionActual}`).classList.remove('active');
    document.getElementById(`node-${estacionActual}`).classList.add('completed');
    document.getElementById(`node-${nuevaEstacion}`).classList.add('active');

    estacionActual = nuevaEstacion;
}

function finalizarProcesoEstaciones() {
    if(nivelAcademicoSeleccionado === "Doctorado") {
        alert("¡Postulación a Doctorado Completada! Tus propuestas y notas del sínodo anónimo han sido consolidadas en Control Escolar.");
    } else {
        const tieneTitulo = document.getElementById('file-titulo').files.length > 0;
        if (!tieneTitulo) {
            alert("¡Expediente Recibido! Recuerda cargar tu título pendiente en el lapso otorgado de 2 a 6 meses.");
        } else {
            alert("¡Felicidades! Documentación de Maestría enviada correctamente.");
        }
    }
    switchView('inicio');
}

/**
 * LÓGICA DE LAS ESTACIONES (STEPPER)
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
 * Actualización Dinámica de Costos (Estación 0) según las capturas del portal
 */
function actualizarCostosAdmision() {
    const seleccionada = document.querySelector('input[name="modalidad"]:checked').value;
    const costosBox = document.getElementById('box-costos-desglose');
    
    if (!costosBox) return;

    if (seleccionada === 'prope') {
        costosBox.innerHTML = `
            <h4>Aranceles y Conceptos de Pago (Maestría)</h4>
            <div class="costo-linea"><span>Curso Propedéutico Obligatorio:</span> <strong>$ 2,800.00 MXN</strong></div>
        `;
    } else if(seleccionada === 'examen') {
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
 * Validar que los archivos requeridos estén seleccionados para encender los botones "Siguiente"
 */
function verificarArchivosEstacion(estacion) {
    if (estacion === 1) {
        const acta = document.getElementById('file-acta').files.length > 0;
        const curp = document.getElementById('file-curp').files.length > 0;
        const ine = document.getElementById('file-ine').files.length > 0;
        const foto = document.getElementById('file-foto').files.length > 0;
        
        document.getElementById('btn-next-1').disabled = !(acta && curp && ine && foto);
    } 
    else if (estacion === 2) {
        // EXCEPCIÓN SOLICITADA: El título puede faltar (en trámite), pero el certificado es obligatorio.
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

function finalizarProcesoEstaciones() {
    // Comprobar si faltó el título para lanzar aviso personalizado de prórroga
    const tieneTitulo = document.getElementById('file-titulo').files.length > 0;
    if (!tieneTitulo) {
        alert("¡Expediente Recibido con Éxito! Se ha detectado tu Título como PENDIENTE. Dispones de un periodo de prorroga institucional de 2 a 6 meses para cargar dicho documento.");
    } else {
        alert("¡Felicidades! Tu documentación completa ha sido enviada con éxito al comité de admisiones del Posgrado FIE.");
    }
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
    // Actualizamos el objeto en memoria
    estadosDocumentos[documento] = nuevoEstado;
    
    // Recalcular métricas
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

    // Contamos cada estado
    for (let doc in estadosDocumentos) {
        if (estadosDocumentos[doc] === 'aprobado') aprobados++;
        else if (estadosDocumentos[doc] === 'rechazado') rechazados++;
        else pendientes++;
    }

    // Actualizamos etiquetas numéricas en el HTML
    if(document.getElementById('lbl-aprobados')) document.getElementById('lbl-aprobados').innerText = aprobados;
    if(document.getElementById('lbl-rechazados')) document.getElementById('lbl-rechazados').innerText = rechazados;
    if(document.getElementById('lbl-pendientes')) document.getElementById('lbl-pendientes').innerText = pendientes;

    // Calculamos porcentajes y grados relativos de la circunferencia (360 grados)
    let porcAprobado = (aprobados / totalDocs) * 100;
    let porcRechazado = (rechazados / totalDocs) * 100;
    
    // Convertimos porcentajes a rangos acumulativos para el degradado cónico
    let finAprobados = porcAprobado;
    let finRechazados = finAprobados + porcRechazado;

    // Modificamos el fondo de la gráfica usando estilos en línea
    const grafica = document.getElementById('grafica-pastel');
    if (grafica) {
        grafica.style.background = `conic-gradient(
            #27ae60 0% ${finAprobados}%, 
            #c0392b ${finAprobados}% ${finRechazados}%, 
            #7f8c8d ${finRechazados}% 100%
        )`;
    }

    // Mostramos el porcentaje de avance general en el centro (basado en lo aprobado)
    const txtPorcentaje = document.getElementById('txt-porcentaje');
    if (txtPorcentaje) {
        txtPorcentaje.innerText = `${Math.round(porcAprobado)}%`;
    }
}

/**
 * Valida de forma dinámica los archivos requeridos dependiendo del posgrado seleccionado
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
 * Concluye el proceso de registro mostrando alertas personalizadas por nivel
 */
function finalizarProcesoEstaciones() {
    if (nivelAcademicoSeleccionado === "Doctorado") {
        alert("¡Postulación a Doctorado Completada! Tus propuestas y notas de los profesores anónimos (P1, P2, P3) han sido enviadas a revisión.");
    } else {
        const tieneTitulo = document.getElementById('file-titulo') ? document.getElementById('file-titulo').files.length > 0 : true;
        if (!tieneTitulo) {
            alert("¡Expediente Recibido! Recuerda cargar tu título pendiente en el lapso otorgado de 2 a 6 meses.");
        } else {
            alert("¡Felicidades! Documentación de Maestría enviada correctamente.");
        }
    }
    switchView('inicio');
}