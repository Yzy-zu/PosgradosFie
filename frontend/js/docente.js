// Base de Datos Local Simulada para el Portal de Docente
const aspirantesIniciales = [
    {
        id: "asp-001",
        nombre: "Juan Pérez Gómez",
        programa: "Maestría en Ciencias en Ingeniería Eléctrica (Opción Automatización)",
        correo: "juan.perez@correo.com",
        fechaRegistro: "2026-06-10",
        mecanismo: "Curso Propedéutico",
        nivel: "Maestría",
        documentos: [
            { id: "acta", nombre: "Acta de Nacimiento", estado: "pendiente", note: "", content: "ACTA DE NACIMIENTO DIGITAL OFICIAL\n---------------------------------\nNombre del Registrado: Juan Pérez Gómez\nFecha de Nacimiento: 12 de Mayo de 2002\nLugar de Nacimiento: Morelia, Michoacán, México\nNacionalidad: Mexicana\nCURP: PEGJ020512HMNRRS09\n\nSello Digital de la Secretaría de Gobernación vigente. Certificación del Registro Civil efectuada en formato digital XML." },
            { id: "curp", nombre: "Clave CURP", estado: "aprobado", note: "", content: "CLAVE ÚNICA DE REGISTRO DE POBLACIÓN (CURP)\n------------------------------------------\nCURP: PEGJ020512HMNRRS09\nNombre: Juan Pérez Gómez\nFecha de Registro: 15 de Mayo de 2002\nEntidad de Registro: Michoacán\n\nEstatus: Certificada por el Registro Civil ante la RENAPO." },
            { id: "ine", nombre: "Identificación Oficial (INE)", estado: "pendiente", note: "", content: "INSTITUTO NACIONAL ELECTORAL\nCREDENCIAL PARA VOTAR\n--------------------------\nNombre: Juan Pérez Gómez\nDomicilio: Calle Melchor Ocampo #450, Col. Centro, Morelia, Mich.\nClave de Elector: PRGMJN02051239H200\nCURP: PEGJ020512HMNRRS09\nRegistro: 2020 01\n\nFotografía e identificación oficial legible y vigente. Firmas al reverso validadas." },
            { id: "certificado", nombre: "Certificado de Calificaciones", estado: "pendiente", note: "", content: "CERTIFICADO DE ESTUDIOS PROFESIONALES\n------------------------------------\nInstitución: Instituto Tecnológico de Morelia\nCarrera: Ingeniería en Electrónica\nPasante: Juan Pérez Gómez\nPeriodo: 2020-2024\nPromedio General obtenido: 8.7 (Ocho punto siete)\n\nLista de Materias:\n- Control Analógico: 9.0\n- Microcontroladores: 8.0\n- Instrumentación Industrial: 9.0\n- Programación Avanzada: 10.0\n- Seminario de Tesis: 9.0\n\nFirmado y sellado electrónicamente por la Dirección de Control Escolar." },
            { id: "cartas", nombre: "Cartas de Recomendación", estado: "pendiente", note: "", content: "CARTA DE RECOMENDACIÓN ACADÉMICA\n--------------------------------\nFecha: 02 de Junio de 2026\nPara: Comité de Admisión de Posgrado FIE - UMSNH\n\nPor medio de la presente, recomiendo ampliamente al C. Juan Pérez Gómez para ingresar a la Maestría en Ciencias en Ingeniería Eléctrica. Durante su formación de licenciatura, demostró un alto nivel intelectual, proactividad y rigor científico, destacando en el desarrollo de un módulo de control adaptativo para brazos robóticos.\n\nAtentamente,\nDr. Alejandro Ramos Vega\nProfesor-Investigador SNI Nivel I\nFIE-UMSNH" },
            { id: "ceneval", nombre: "Examen CENEVAL EXANI-III", estado: "rechazado", note: "La puntuación total no es legible en el documento cargado. Favor de volver a escanear a color asegurando resolución nítida de la tabla de puntajes.", content: "CENTRO NACIONAL DE EVALUACIÓN PARA LA EDUCACIÓN SUPERIOR (CENEVAL)\nREPORTE DE RESULTADOS DE EXAMEN - EXANI-III\n-----------------------------------------------\nNombre del sustentante: Juan Pérez Gómez\nFolio Ceneval: 9982716\nFecha de examen: 18 de Mayo de 2026\n\n[ERROR DE LECTURA: ESCANEO EN BAJA CALIDAD Y MANCHADO]\nPuntaje Global: [ILEGIBLE]\nPuntaje en Metodología de Investigación: [ILEGIBLE]\nPuntaje en Pensamiento Matemático: 1050\nEstatus: Requiere carga de archivo corregido." }
        ]
    },
    {
        id: "asp-002",
        nombre: "María Elena Rodríguez",
        programa: "Doctorado en Ciencias en Ingeniería Eléctrica (Sistemas Eléctricos de Potencia)",
        correo: "maria.elena@gmail.com",
        fechaRegistro: "2026-06-12",
        mecanismo: "Grado de Maestría Académica",
        nivel: "Doctorado",
        documentos: [
            { id: "grado-maestria", nombre: "Grado de Maestría", estado: "aprobado", note: "", content: "TÍTULO DE GRADO ACADÉMICO PROFESIONAL\n------------------------------------\nLa Universidad Michoacana de San Nicolás de Hidalgo otorga a:\nMaría Elena Rodríguez\n\nEl Grado de: Maestría en Ciencias en Ingeniería Eléctrica\nCon mención honorífica por la defensa de la tesis: 'Optimización de Flujos de Potencia en Redes de Distribución Inteligentes'.\n\nDado en Morelia, Michoacán el 14 de Enero de 2026. Registrado ante la Dirección General de Profesiones de la SEP." },
            { id: "cv", nombre: "Currículum Vítae (CV) Único", estado: "pendiente", note: "", content: "CURRÍCULUM VÍTAE ÚNICO (CONACYT SIMULADO)\n----------------------------------------\nDatos de Identificación:\nNombre: María Elena Rodríguez\nGrados Obtenidos:\n- Licenciatura en Ingeniería Eléctrica (UMSNH, 2023) - Promedio: 9.3\n- Maestría en Ciencias en Ingeniería Eléctrica (UMSNH, 2026) - Promedio: 9.8\n\nProducción Científica:\n- 1 artículo publicado en IEEE Transactions on Power Systems (Coautora).\n- 2 contribuciones en congresos internacionales de IEEE (RVP-AI/2025).\n- Idiomas: Inglés certificado TOEFL ITP (560 puntos)." },
            { id: "propuesta", nombre: "Propuesta de Proyecto de Investigación", estado: "pendiente", note: "", content: "PROPUESTA DE PROYECTO DE INVESTIGACIÓN DOCTORAL\n---------------------------------------------\nTítulo: Control Tolerante a Fallas Basado en Observadores Difusos para Generadores Eólicos Autónomos en Zonas Remotas.\nCandidata: María Elena Rodríguez\nAsesor Propuesto: Dr. Carlos Martínez Silva\n\nResumen Ejecutivo:\nEsta investigación propone diseñar e implementar una arquitectura de control automático tolerante a fallas (FTC) para mitigar el impacto de fallas en sensores y actuadores de aerogeneradores de imanes permanentes (PMSG). Se emplearán modelos matemáticos Takagi-Sugeno y observadores difusos para reconstruir los estados de falla en tiempo real y compensarlos sin interrupción de potencia eléctrica." },
            { id: "idioma", nombre: "Constancia de Idioma Oficial", estado: "aprobado", note: "", content: "CENTRO DE IDIOMAS UMSNH\nCONSTANCIA DE CERTIFICACIÓN OFICIAL DE INGLÉS\n-------------------------------------------\nFolio: IDI-ING-2026-9082\nSe certifica que la alumna: María Elena Rodríguez\n\nHa acreditado satisfactoriamente la evaluación TOEFL ITP.\nPuntaje Oficial Obtenido: 560 puntos (Nivel B2 según MCER)\nFecha de emisión: 10 de Febrero de 2026\nValidez oficial institucional por 2 años." }
        ]
    },
    {
        id: "asp-003",
        nombre: "Carlos Alberto Sánchez",
        programa: "Maestría en Tecnologías Aplicadas a la Ingeniería FIE",
        correo: "carlos.sanchez@gmail.com",
        fechaRegistro: "2026-06-18",
        mecanismo: "Examen de Admisión",
        nivel: "Maestría",
        documentos: [
            { id: "acta", nombre: "Acta de Nacimiento", estado: "aprobado", note: "", content: "ACTA DE NACIMIENTO OFICIAL\n-------------------------\nNombre: Carlos Alberto Sánchez\nFecha de Nacimiento: 04 de Noviembre de 2001\nLugar: Uruapan, Michoacán\nPadres: Juan Sánchez Ruiz y Clara Ruiz Huerta\nEstatus: Certificación gubernamental en formato digital completa." },
            { id: "curp", nombre: "Clave CURP", estado: "aprobado", note: "", content: "CLAVE ÚNICA DE REGISTRO DE POBLACIÓN (CURP)\n------------------------------------------\nCURP: SACC011104HMNRRD02\nNombre: Carlos Alberto Sánchez" },
            { id: "ine", nombre: "Identificación Oficial (INE)", estado: "aprobado", note: "", content: "INSTITUTO NACIONAL ELECTORAL\nNombre: Carlos Alberto Sánchez\nDomicilio: Privada de Bugambilias #12, Uruapan, Mich.\nClave de Elector: SNCHCR011104H800" },
            { id: "certificado", nombre: "Certificado de Calificaciones", estado: "aprobado", note: "", content: "CERTIFICADO DE ESTUDIOS PROFESIONALES\n------------------------------------\nInstitución: Universidad de Guadalajara\nCarrera: Ingeniería Mecánica\nEgresado: Carlos Alberto Sánchez\nPromedio General: 9.1 (Nueve punto uno)\n\nEstatus: Copia fotostática legible y certificada ante notario público de materias aprobadas." },
            { id: "cartas", nombre: "Cartas de Recomendación", estado: "aprobado", note: "", content: "RECOMENDACIÓN ACADÉMICA PROFESIONAL\n------------------------------------\nRecomendante: Dra. Patricia Torres Luna\nDocente Investigador FIE-UMSNH\n\nExpreso mi recomendación favorable para Carlos Alberto Sánchez. Es un egresado sobresaliente, hábil en el diseño termodinámico asistido por computadora y con alta ética profesional." },
            { id: "ceneval", nombre: "Examen CENEVAL EXANI-III", estado: "aprobado", note: "", content: "CENEVAL EXANI-III OFICIAL\n--------------------------\nNombre: Carlos Alberto Sánchez\nFolio: 8092716\nPuntuación Global: 1080 puntos\nEstatus: Aprobado (Supera el mínimo de 1000 puntos establecido por el reglamento)." }
        ]
    },
    {
        id: "asp-004",
        nombre: "Laura Sofia Méndez",
        programa: "Maestría en Ciencias en Ingeniería Eléctrica (Opción Automatización)",
        correo: "laura.mendez@outlook.com",
        fechaRegistro: "2026-06-20",
        mecanismo: "Ingreso por Promedio (Egresados FIE)",
        nivel: "Maestría",
        documentos: [
            { id: "acta", nombre: "Acta de Nacimiento", estado: "pendiente", note: "", content: "ACTA DE NACIMIENTO DIGITAL\n--------------------------\nNombre: Laura Sofia Méndez\nFecha de Nacimiento: 10 de Septiembre de 2003\nLugar: Morelia, Michoacán" },
            { id: "curp", nombre: "Clave CURP", estado: "pendiente", note: "", content: "CLAVE CURP\nCURP: MENL030910FMNRSS01\nNombre: Laura Sofia Méndez" },
            { id: "ine", nombre: "Identificación Oficial (INE)", estado: "pendiente", note: "", content: "INE DIGITAL CREDENCIAL PARA VOTAR\nNombre: Laura Sofia Méndez\nRegistro: Validez vigente." },
            { id: "certificado", nombre: "Certificado de Calificaciones", estado: "pendiente", note: "", content: "CERTIFICADO ACADÉMICO PARCIAL\n-----------------------------\nInstitución: Facultad de Ingeniería Eléctrica, UMSNH\nCarrera: Ingeniería Eléctrica\nNombre: Laura Sofia Méndez\nPromedio Acumulado: 9.6 (Nueve punto seis)\n\nEstatus: Promedio excelente. Cumple con los requisitos del ingreso directo sin examen." }
        ]
    }
];

// Variables de Estado Global de la Interfaz
let aspirantes = [];
let idAspiranteActivo = null;
let documentoARechazar = null;

// Inicialización de la Aplicación
document.addEventListener("DOMContentLoaded", function() {
    console.log("Portal de Docente Inicializado.");

    // Cargar o inicializar la base de datos simulada en localStorage para persistencia
    const localData = localStorage.getItem("docenteAspirantes");
    if (localData) {
        try {
            aspirantes = JSON.parse(localData);
        } catch (e) {
            console.error("Error cargando datos locales, inicializando con valores predeterminados.");
            aspirantes = [...aspirantesIniciales];
            localStorage.setItem("docenteAspirantes", JSON.stringify(aspirantes));
        }
    } else {
        aspirantes = [...aspirantesIniciales];
        localStorage.setItem("docenteAspirantes", JSON.stringify(aspirantes));
    }

    // Configurar el saludo de usuario personalizado
    const usuarioLogueado = localStorage.getItem('usuarioLogueado') || "Docente Evaluador";
    const saludo = document.getElementById('saludo-usuario');
    if (saludo) {
        saludo.innerText = `Hola Bienvenid@, ${usuarioLogueado}`;
    }

    // Calcular estadísticas iniciales e inyectar el listado
    actualizarEstadisticas();
    filtrarYMostrarAspirantes();
});

/**
 * Control de Navegación Lateral (Cambio de Secciones)
 */
function switchView(viewId) {
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.style.display = 'none');

    // Mostrar sección de destino
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Actualizar clase activa en enlaces de navegación
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNavLink = document.getElementById(`nav-${viewId}`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
}

/**
 * Cierre de Sesión Limpiando Variables No Persistentes de Login
 */
function cerrarSesion() {
    localStorage.removeItem('usuarioLogueado');
    alert("Sesión cerrada de forma segura.");
    window.location.href = 'login.html';
}

/**
 * Calcula Contadores Estadísticos y Redibuja Gráfica de Avance
 */
function actualizarEstadisticas() {
    let totalAspirantes = aspirantes.length;
    let revisadosCompleto = 0; // Todos los documentos aprobados
    let incompletos = 0; // Al menos un documento rechazado
    let pendientes = 0; // Resto (tienen pendientes, ninguno rechazado)

    let totalDocs = 0;
    let docsAprobados = 0;
    let docsRechazados = 0;
    let docsPendientes = 0;

    aspirantes.forEach(asp => {
        let docs = asp.documentos;
        let tieneRechazados = false;
        let tienePendientes = false;

        docs.forEach(doc => {
            totalDocs++;
            if (doc.estado === 'aprobado') {
                docsAprobados++;
            } else if (doc.estado === 'rechazado') {
                docsRechazados++;
                tieneRechazados = true;
            } else {
                docsPendientes++;
                tienePendientes = true;
            }
        });

        if (tieneRechazados) {
            incompletos++;
        } else if (tienePendientes) {
            pendientes++;
        } else {
            revisadosCompleto++;
        }
    });

    // Inyectar contadores numéricos en el dashboard
    document.getElementById('stat-total').innerText = totalAspirantes;
    document.getElementById('stat-revisados').innerText = revisadosCompleto;
    document.getElementById('stat-incompletos').innerText = incompletos;
    document.getElementById('stat-pendientes').innerText = pendientes;

    // Actualizar leyenda de gráfica de documentos
    document.getElementById('lbl-aprobados').innerText = docsAprobados;
    document.getElementById('lbl-rechazados').innerText = docsRechazados;
    document.getElementById('lbl-pendientes').innerText = docsPendientes;

    // Calcular porcentajes para la gráfica circular (Pie Chart Conic-Gradient)
    if (totalDocs > 0) {
        let porcAprobado = (docsAprobados / totalDocs) * 100;
        let porcRechazado = (docsRechazados / totalDocs) * 100;
        
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
    } else {
        const txtPorcentaje = document.getElementById('txt-porcentaje');
        if (txtPorcentaje) txtPorcentaje.innerText = "0%";
    }
}

/**
 * Filtra los aspirantes de acuerdo al nombre, programa y estado del expediente
 */
function filtrarYMostrarAspirantes() {
    const queryNombre = document.getElementById('filtro-nombre').value.toLowerCase().trim();
    const filtroProg = document.getElementById('filtro-programa').value;
    const filtroEst = document.getElementById('filtro-estado').value;

    const aspirantesFiltrados = aspirantes.filter(asp => {
        // Filtro por nombre
        const matchesNombre = asp.nombre.toLowerCase().includes(queryNombre);
        
        // Filtro por programa
        const matchesProg = filtroProg === "" || asp.programa.includes(filtroProg);
        
        // Determinar estado general del aspirante
        let estadoGeneral = 'pendiente';
        const tieneRechazados = asp.documentos.some(d => d.estado === 'rechazado');
        const tienePendientes = asp.documentos.some(d => d.estado === 'pendiente');

        if (tieneRechazados) {
            estadoGeneral = 'incompleto';
        } else if (!tienePendientes) {
            estadoGeneral = 'revisado';
        }

        const matchesEstado = filtroEst === "" || estadoGeneral === filtroEst;

        return matchesNombre && matchesProg && matchesEstado;
    });

    renderizarListaAspirantes(aspirantesFiltrados);
}

/**
 * Renderiza los elementos de la lista de aspirantes en el contenedor izquierdo
 */
function renderizarListaAspirantes(lista) {
    const contenedor = document.getElementById('contenedor-aspirantes');
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `<div style="text-align: center; color: #888; padding: 20px; font-size: 13px;">No se encontraron aspirantes.</div>`;
        return;
    }

    lista.forEach(asp => {
        // Determinar estado general para el Badge visual de la lista
        const tieneRechazados = asp.documentos.some(d => d.estado === 'rechazado');
        const tienePendientes = asp.documentos.some(d => d.estado === 'pendiente');
        
        let badgeHtml = "";
        if (tieneRechazados) {
            badgeHtml = `<span class="badge badge-rechazado">Rechazado / Inc.</span>`;
        } else if (tienePendientes) {
            badgeHtml = `<span class="badge badge-pendiente">Pendiente (${asp.documentos.filter(d => d.estado === 'pendiente').length})</span>`;
        } else {
            badgeHtml = `<span class="badge badge-aprobado">Exp. Completo</span>`;
        }

        const item = document.createElement('div');
        item.className = `aspirante-item ${idAspiranteActivo === asp.id ? 'active' : ''}`;
        item.onclick = () => seleccionarAspirante(asp.id);

        item.innerHTML = `
            <h4>${asp.nombre}</h4>
            <p><strong>Nivel:</strong> ${asp.nivel}</p>
            <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${asp.programa}</p>
            ${badgeHtml}
        `;
        contenedor.appendChild(item);
    });
}

/**
 * Abre el expediente del aspirante seleccionado en el panel de detalle derecho
 */
function seleccionarAspirante(id) {
    idAspiranteActivo = id;
    
    // Volver a renderizar la lista para actualizar el resaltado ".active"
    filtrarYMostrarAspirantes();

    const asp = aspirantes.find(a => a.id === id);
    if (!asp) return;

    // Mostrar panel de contenido y ocultar placeholder
    document.getElementById('placeholder-detalle').style.display = 'none';
    document.getElementById('contenido-detalle').style.display = 'block';

    // Rellenar información básica
    document.getElementById('det-nombre').innerText = asp.nombre;
    document.getElementById('det-programa').innerText = asp.programa;
    document.getElementById('det-correo').innerText = asp.correo;
    document.getElementById('det-fecha').innerText = asp.fechaRegistro;
    document.getElementById('det-mecanismo').innerText = asp.mecanismo;
    document.getElementById('det-nivel').innerText = asp.nivel;

    // Actualizar badge superior del estado
    const badgeEstado = document.getElementById('det-estado-badge');
    const tieneRechazados = asp.documentos.some(d => d.estado === 'rechazado');
    const tienePendientes = asp.documentos.some(d => d.estado === 'pendiente');

    badgeEstado.className = "badge";
    if (tieneRechazados) {
        badgeEstado.classList.add('badge-rechazado');
        badgeEstado.innerText = "Rechazado / Incompleto";
    } else if (tienePendientes) {
        badgeEstado.classList.add('badge-pendiente');
        badgeEstado.innerText = "Pendiente de Revisión";
    } else {
        badgeEstado.classList.add('badge-aprobado');
        badgeEstado.innerText = "Expediente Completo";
    }

    // Ocultar previsualización de documentos previos
    cerrarVistaPrevia();

    // Rellenar tabla de documentos
    const tbody = document.getElementById('tabla-documentos-cuerpo');
    tbody.innerHTML = "";

    asp.documentos.forEach(doc => {
        const tr = document.createElement('tr');
        
        // Estatus visual del documento
        let statusBadge = "";
        if (doc.estado === 'aprobado') {
            statusBadge = `<span class="badge badge-aprobado">✓ Aprobado</span>`;
        } else if (doc.estado === 'rechazado') {
            statusBadge = `<span class="badge badge-rechazado">✗ Rechazado</span>`;
        } else {
            statusBadge = `<span class="badge badge-pendiente">? Pendiente</span>`;
        }

        // Fila de notas si existe rechazo
        let noteHtml = "";
        if (doc.estado === 'rechazado' && doc.note) {
            noteHtml = `<div class="rejection-note-text"><strong>Motivo del rechazo:</strong> ${doc.note}</div>`;
        }

        tr.innerHTML = `
            <td>
                <span style="font-weight: bold; color: #1a1f2c;">${doc.nombre}</span>
                ${noteHtml}
            </td>
            <td>${statusBadge}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn-view-doc" onclick="verDocumento('${doc.id}')">👁️ Ver</button>
                <button class="btn-stat btn-accept" title="Aprobar Documento" onclick="aprobarDocumento('${doc.id}')">✓</button>
                <button class="btn-stat btn-reject" title="Rechazar Documento" onclick="rechazarDocumentoPrompt('${doc.id}')">✗</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Despliega el bloque simulado de lectura del documento en el pie del detalle
 */
function verDocumento(docId) {
    const asp = aspirantes.find(a => a.id === idAspiranteActivo);
    if (!asp) return;

    const doc = asp.documentos.find(d => d.id === docId);
    if (!doc) return;

    const previewBox = document.getElementById('contenedor-preview');
    const previewNombre = document.getElementById('preview-nombre-doc');
    const previewTexto = document.getElementById('preview-contenido-texto');

    previewNombre.innerText = doc.nombre;
    previewTexto.innerText = doc.content;
    
    previewBox.style.display = 'block';
    
    // Hacer scroll automático hacia la visualización de la vista previa
    previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Oculta el visor del documento
 */
function cerrarVistaPrevia() {
    const previewBox = document.getElementById('contenedor-preview');
    if (previewBox) {
        previewBox.style.display = 'none';
    }
}

/**
 * Aprueba el documento indicado del aspirante activo, guardando los cambios
 */
function aprobarDocumento(docId) {
    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id === docId);
    if (docIndex === -1) return;

    // Actualizar estado en memoria
    aspirantes[aspIndex].documentos[docIndex].estado = 'aprobado';
    aspirantes[aspIndex].documentos[docIndex].note = ''; // Limpiar nota previa si existía

    // Guardar en almacenamiento local
    localStorage.setItem("docenteAspirantes", JSON.stringify(aspirantes));

    // Refrescar vistas
    actualizarEstadisticas();
    seleccionarAspirante(idAspiranteActivo);
}

/**
 * Abre el cuadro modal de captura para definir el por qué del rechazo
 */
function rechazarDocumentoPrompt(docId) {
    const asp = aspirantes.find(a => a.id === idAspiranteActivo);
    if (!asp) return;

    const doc = asp.documentos.find(d => d.id === docId);
    if (!doc) return;

    documentoARechazar = docId;

    // Mostrar el modal overlay
    const modal = document.getElementById('modal-rechazo');
    modal.style.display = 'flex';

    // Rellenar metadatos en el modal
    document.getElementById('modal-titulo-documento').innerText = `Rechazar: ${doc.nombre}`;
    document.getElementById('modal-nota-texto').value = doc.note || "";
    document.getElementById('modal-nota-texto').focus();
}

/**
 * Cierra el modal de captura sin guardar modificaciones
 */
function cerrarModalRechazo() {
    document.getElementById('modal-rechazo').style.display = 'none';
    documentoARechazar = null;
}

/**
 * Confirma el cambio del estatus a rechazado guardando la nota explicativa
 */
function guardarRechazoDocumento() {
    const noteText = document.getElementById('modal-nota-texto').value.trim();
    
    if (noteText === "") {
        alert("Por favor, ingresa el motivo del rechazo del archivo. Es obligatorio informarle al aspirante el por qué.");
        return;
    }

    const aspIndex = aspirantes.findIndex(a => a.id === idAspiranteActivo);
    if (aspIndex === -1) return;

    const docIndex = aspirantes[aspIndex].documentos.findIndex(d => d.id === documentoARechazar);
    if (docIndex === -1) return;

    // Actualizar estado y nota en memoria
    aspirantes[aspIndex].documentos[docIndex].estado = 'rechazado';
    aspirantes[aspIndex].documentos[docIndex].note = noteText;

    // Guardar en almacenamiento local
    localStorage.setItem("docenteAspirantes", JSON.stringify(aspirantes));

    // Cerrar modal
    cerrarModalRechazo();

    // Refrescar vistas
    actualizarEstadisticas();
    seleccionarAspirante(idAspiranteActivo);
}
