const translations = {
    es: {
        // Sidebar
        "sb_label_principal": "PRINCIPAL",
        "sb_inicio": "Inicio",
        "sb_proceso": "Proceso",
        "sb_convocatorias": "Convocatorias",
        "sb_documentos": "Documentos",
        "sb_maestria": "Maestría",
        "sb_doctorado": "Doctorado",
        "sb_ajustes": "Ajustes",
        "sb_cerrar_sesion": "Cerrar Sesión",

        // Topbar
        "tb_bienvenido": "Bienvenido de vuelta",
        "tb_perfil": "Mi Perfil",
        "tb_bandeja": "Bandeja de Mensajes",
        "tb_cargando": "Cargando...",
        "tb_selecciona_msj": "Selecciona un mensaje<br>para ver la conversación",
        
        // Modal & Loader
        "global_cargando": "Cargando información, por favor espera...",

        // Settings Drawer
        "st_ajustes": "Ajustes",
        "st_cuenta_seguridad": "Cuenta y Seguridad",
        "st_cambiar_pass": "Cambiar contraseña",
        "st_actualiza_cred": "Actualiza tu credencial de acceso",
        "st_btn_cambiar": "Cambiar",
        "st_cerrar_sesiones": "Cerrar otras sesiones",
        "st_desconecta_otros": "Desconecta otros dispositivos activos",
        "st_btn_cerrar": "Cerrar Sesiones",
        "st_apariencia": "Apariencia",
        "st_tema_visual": "Tema Visual",
        "st_elige_tema": "Elige claro, oscuro o del sistema",
        "st_regional": "Regional",
        "st_idioma": "Idioma",
        "st_idioma_desc": "Idioma de la plataforma",
        "st_notificaciones": "Notificaciones",
        "st_noti_push": "Notificaciones Push",
        "st_noti_desc": "Avisos dentro de la plataforma",
        "st_btn_guardar": "Guardar Cambios",

        // Dynamic Texts (Documents)
        "cat_identidad": "IDENTIDAD Y GENERALES",
        "cat_academico": "ANTECEDENTES ACADÉMICOS",
        "cat_evaluacion": "EVALUACIÓN Y OTROS",
        "doc_aprobado": "APROBADO",
        "doc_rechazado": "RECHAZADO",
        "doc_pendiente": "PENDIENTE",
        "doc_no_encontrado": "No se encontraron documentos adjuntos.",
        "doc_sin_obs": "Sin observaciones por parte del evaluador en esta solicitud.",
        "doc_docs_aprobados": "Documentos aprobados",
        "doc_detalles": "Detalles del Documento",
        "doc_comentarios": "Comentarios",
        "doc_ver_doc": "Ver Documento",
        "doc_solicitud": "Solicitud",
        "doc_subido_el": "Subido el",
        "doc_subido_reciente": "Subido recientemente",
        "doc_doc_adjunto": "Documento adjunto",
        "doc_en_revision": "En Revisión",
        "doc_resubir_btn": "Re-subir",
        "doc_intento_txt1": "(Será tu Intento",
        "doc_intento_txt2": "de 3)",
        "doc_limite_alcanzado": "Se ha alcanzado el límite máximo de 3 intentos para este documento.",
        
        // Toast Revisión
        "toast_rev_title": "Expediente bajo revisión",
        "toast_rev_sub": "Serás notificado si se requiere alguna corrección",
        "toast_rev_badge": "EN REVISIÓN",

        // Modalities
        "mod_examen_admision": "Examen de Admisión",
        "mod_curso_propedeutico": "Curso Propedéutico",
        "mod_promedio": "Promedio",
        "mod_examen_conocimientos": "Examen de Conocimientos",

        // Main Dashboard
        "dash_docs": "Documentos",
        "dash_esperando_datos": "Esperando datos...",
        "dash_expediente": "Expediente",
        "dash_convocatoria": "Convocatoria",
        "dash_avisos": "Avisos y Comunicados",

        // Proceso
        "proc_estatus_exp": "Estatus del Expediente Digital",
        "proc_aprobados": "Aprobados",
        "proc_rechazados": "Rechazados",
        "proc_pendientes": "Pendientes",

        // Convocatorias
        "conv_cambiar_prog": "Cambiar de Programa / Volver",
        "conv_msg_desbloqueo": "Has iniciado sesión y desbloqueado los accesos para el registro formal al programa seleccionado.",
        "conv_tramite_curso": "Trámite de Admisión en Curso",
        "conv_participando": "Actualmente estás participando en el proceso de selección institucional para el:",
        "conv_opcion_sel": "Opción seleccionada:",
        "conv_btn_continuar": "Continuar mi Trámite",
        "conv_btn_fechas": "Ver fechas y detalles del proceso",
        "conv_duracion": "Duración:",
        "conv_modalidad": "Modalidad:",
        "conv_apertura": "Apertura",
        "conv_docs": "Documentos",
        "conv_entrevistas": "Entrevistas",
        "conv_resultados": "Resultados",
        "conv_semestre": "Semestre",
        "conv_volver_resumen": "Volver al resumen",
        "conv_abierta": "Abierta",
        "conv_cierre": "Cierre",
        "conv_btn_iniciar": "Iniciar Proceso de Registro",
        "conv_sin_desc": "Sin descripción disponible.",
        "conv_oferta_desbloqueada": "Oferta Académica Desbloqueada:",
        "conv_sin_abiertas": "No hay convocatorias abiertas en este momento para este nivel.",

        // Documentos View
        "doc_msg_completar": "Completa cada una de las estaciones requeridas para enviar tu postulación a revisión administrativa.",
        "doc_btn_cancelar": "Cancelar Solicitud",
        "doc_step_admision": "Admisión",
        "doc_step_identidad": "Identidad y Generales",
        "doc_step_academicos": "Académicos",
        "doc_step_evaluacion": "Evaluación",
        "doc_est0_titulo": "Estación 0: Mecanismo de Admisión Seleccionado",
        "doc_est0_desc": "De acuerdo a la normativa institucional, selecciona tu modalidad de ingreso:",
        "doc_est0_btn_detalles": "Más Detalles de esta Modalidad",
        "doc_est0_btn_confirmar": "Confirmar y Continuar",
        "doc_est1_titulo": "Estación 1: Identidad y Datos Generales",
        "doc_est1_desc": "Sube los documentos oficiales de identificación y datos generales. Los campos con asterisco (*) son obligatorios.",
        "doc_btn_volver": "Volver",
        "doc_btn_siguiente": "Siguiente Estación",
        "doc_est2_titulo": "Estación 2: Antecedentes Académicos",
        "doc_est2_desc": "Carga tus títulos, certificados e historial académico oficial.",
        "doc_est3_titulo": "Estación 3: Evaluación y Cartas",
        "doc_est3_desc": "Sube los resultados de tus certificaciones, exámenes y cartas de recomendación.",
        "doc_est3_protesta": "<strong>Bajo protesta de decir verdad</strong>, declaro que la información y documentación proporcionada es auténtica y verídica. Entiendo que al enviar este expediente no podré modificarlo después.",
        "doc_btn_concluir": "Concluir y Enviar Expediente",

        // Profile Modal
        "prof_title": "Mi Perfil",
        "prof_badge": "Aspirante",
        "prof_personal": "Datos Personales",
        "prof_correo": "Correo",
        "prof_tel": "Teléfono",
        "prof_curp": "CURP",
        "prof_nacimiento": "Nacimiento",
        "prof_estado_civil": "Estado Civil",
        "prof_cp": "Código Postal",
        "prof_direccion": "Dirección",
        "prof_academica": "Formación Académica",
        "prof_lic": "Licenciatura",
        "prof_inst": "Institución",
        "prof_egreso": "Fecha Egreso",
        "prof_titulacion": "Fecha Titulación",
        "prof_promedio": "Promedio",
        "prof_otros": "Otros Estudios",
        "prof_laborales": "Datos Laborales",
        "prof_ocupacion": "Ocupación",
        "prof_ciudad": "Ciudad",
        "prof_estado": "Estado",
        "prof_tel_lab": "Teléfono Laboral",
        "prof_btn_cerrar": "Cerrar",
        "prof_no_reg": "No registrado/a",
        "prof_ninguno": "Ninguno",

        // DB Requirements
        "Acta Nacimiento": "Acta Nacimiento",
        "CURP": "CURP",
        "Identificacion Oficial (INE)": "Identificación Oficial (INE)",
        "Constancia Idiomas": "Constancia Idiomas",
        "Fotografía Tamaño Infantil": "Fotografía Tamaño Infantil",
        "Comprobante de Domicilio": "Comprobante de Domicilio",
        "Curriculum Vitae (CV) Actualizado": "Curriculum Vitae (CV) Actualizado",
        "Carta de Exposición de Motivos": "Carta de Exposición de Motivos",
        "Título de Licenciatura": "Título de Licenciatura",
        "Certificado Oficial de Calificaciones": "Certificado Oficial de Calificaciones",
        "Cédula Profesional": "Cédula Profesional",
        "Propuesta de Proyecto de Investigación": "Propuesta de Proyecto de Investigación",
        "Carta de Recomendación Académica 1": "Carta de Recomendación Académica 1",
        "Carta de Recomendación Académica 2": "Carta de Recomendación Académica 2",
        "Resultados de Examen EXANI-III (CENEVAL)": "Resultados de Examen EXANI-III (CENEVAL)",
        "Comprobante de Pago de Aranceles": "Comprobante de Pago de Aranceles",
        "Titulo de Grado de Maestria": "Título de Grado de Maestría",
        "Carta de Recomendacion Academica 3": "Carta de Recomendación Académica 3",
        "Constancia de Dominio del Idioma Ingles": "Constancia de Dominio del Idioma Inglés"
    },
    en: {
        // Sidebar
        "sb_label_principal": "MAIN",
        "sb_inicio": "Dashboard",
        "sb_proceso": "Process",
        "sb_convocatorias": "Admissions",
        "sb_documentos": "Documents",
        "sb_maestria": "Master's Degree",
        "sb_doctorado": "Doctorate (Ph.D.)",
        "sb_ajustes": "Settings",
        "sb_cerrar_sesion": "Log Out",

        // Topbar
        "tb_bienvenido": "Welcome back",
        "tb_perfil": "My Profile",
        "tb_bandeja": "Messages Inbox",
        "tb_cargando": "Loading...",
        "tb_selecciona_msj": "Select a message<br>to view the conversation",
        
        // Modal & Loader
        "global_cargando": "Loading information, please wait...",

        // Settings Drawer
        "st_ajustes": "Settings",
        "st_cuenta_seguridad": "Account & Security",
        "st_cambiar_pass": "Change password",
        "st_actualiza_cred": "Update your access credentials",
        "st_btn_cambiar": "Change",
        "st_cerrar_sesiones": "Close other sessions",
        "st_desconecta_otros": "Disconnect other active devices",
        "st_btn_cerrar": "Close Sessions",
        "st_apariencia": "Appearance",
        "st_tema_visual": "Visual Theme",
        "st_elige_tema": "Choose light, dark, or system",
        "st_regional": "Regional",
        "st_idioma": "Language",
        "st_idioma_desc": "Platform language",
        "st_notificaciones": "Notifications",
        "st_noti_push": "Push Notifications",
        "st_noti_desc": "In-platform alerts",
        "st_btn_guardar": "Save Changes",

        // Dynamic Texts (Documents)
        "cat_identidad": "IDENTITY & GENERAL DATA",
        "cat_academico": "ACADEMIC BACKGROUND",
        "cat_evaluacion": "EVALUATION & OTHER",
        "doc_aprobado": "APPROVED",
        "doc_rechazado": "REJECTED",
        "doc_pendiente": "PENDING",
        "doc_no_encontrado": "No attached documents found.",
        "doc_sin_obs": "No observations from the evaluator for this request.",
        "doc_docs_aprobados": "Approved documents",
        "doc_detalles": "Document Details",
        "doc_comentarios": "Comments",
        "doc_ver_doc": "View Document",
        "doc_solicitud": "Request",
        "doc_subido_el": "Uploaded on",
        "doc_subido_reciente": "Uploaded recently",
        "doc_doc_adjunto": "Attached document",
        "doc_en_revision": "Under Review",
        "doc_resubir_btn": "Re-upload",
        "doc_intento_txt1": "(This will be Attempt",
        "doc_intento_txt2": "of 3)",
        "doc_limite_alcanzado": "The maximum limit of 3 attempts for this document has been reached.",

        // Toast Revisión
        "toast_rev_title": "File under review",
        "toast_rev_sub": "You will be notified if any corrections are required",
        "toast_rev_badge": "UNDER REVIEW",

        // Modalities
        "mod_examen_admision": "Admission Exam",
        "mod_curso_propedeutico": "Preparatory Course",
        "mod_promedio": "GPA",
        "mod_examen_conocimientos": "Knowledge Exam",

        // Main Dashboard
        "dash_docs": "Documents",
        "dash_esperando_datos": "Waiting for data...",
        "dash_expediente": "File",
        "dash_convocatoria": "Admission",
        "dash_avisos": "Notices and Announcements",

        // Proceso
        "proc_estatus_exp": "Digital File Status",
        "proc_aprobados": "Approved",
        "proc_rechazados": "Rejected",
        "proc_pendientes": "Pending",

        // Convocatorias
        "conv_cambiar_prog": "Change Program / Back",
        "conv_msg_desbloqueo": "You have logged in and unlocked access for formal registration to the selected program.",
        "conv_tramite_curso": "Admission Process in Progress",
        "conv_participando": "You are currently participating in the institutional selection process for:",
        "conv_opcion_sel": "Selected option:",
        "conv_btn_continuar": "Continue my Process",
        "conv_btn_fechas": "View process dates and details",
        "conv_duracion": "Duration:",
        "conv_modalidad": "Modality:",
        "conv_apertura": "Opening",
        "conv_docs": "Documents",
        "conv_entrevistas": "Interviews",
        "conv_resultados": "Results",
        "conv_semestre": "Semester",
        "conv_volver_resumen": "Back to summary",
        "conv_abierta": "Open",
        "conv_cierre": "Deadline",
        "conv_btn_iniciar": "Start Registration Process",
        "conv_sin_desc": "No description available.",
        "conv_oferta_desbloqueada": "Unlocked Academic Offer:",
        "conv_sin_abiertas": "There are no open calls for applications at this moment for this level.",

        // Documentos View
        "doc_msg_completar": "Complete each of the required stations to submit your application for administrative review.",
        "doc_btn_cancelar": "Cancel Request",
        "doc_step_admision": "Admission",
        "doc_step_identidad": "Identity & General",
        "doc_step_academicos": "Academics",
        "doc_step_evaluacion": "Evaluation",
        "doc_est0_titulo": "Station 0: Selected Admission Mechanism",
        "doc_est0_desc": "According to institutional regulations, select your admission modality:",
        "doc_est0_btn_detalles": "More Details of this Modality",
        "doc_est0_btn_confirmar": "Confirm and Continue",
        "doc_est1_titulo": "Station 1: Identity & General Data",
        "doc_est1_desc": "Upload official identification documents and general data. Fields with an asterisk (*) are mandatory.",
        "doc_btn_volver": "Back",
        "doc_btn_siguiente": "Next Station",
        "doc_est2_titulo": "Station 2: Academic Background",
        "doc_est2_desc": "Upload your degrees, certificates, and official academic history.",
        "doc_est3_titulo": "Station 3: Evaluation and Letters",
        "doc_est3_desc": "Upload the results of your certifications, exams, and recommendation letters.",
        "doc_est3_protesta": "<strong>Under penalty of perjury</strong>, I declare that the information and documentation provided is authentic and true. I understand that upon submitting this file, I will not be able to modify it later.",
        "doc_btn_concluir": "Conclude and Submit File",

        // Profile Modal
        "prof_title": "My Profile",
        "prof_badge": "Applicant",
        "prof_personal": "Personal Data",
        "prof_correo": "Email",
        "prof_tel": "Phone",
        "prof_curp": "SSN/CURP",
        "prof_nacimiento": "Birth Date",
        "prof_estado_civil": "Marital Status",
        "prof_cp": "Zip Code",
        "prof_direccion": "Address",
        "prof_academica": "Academic Background",
        "prof_lic": "Bachelor's Degree",
        "prof_inst": "Institution",
        "prof_egreso": "Graduation Date",
        "prof_titulacion": "Degree Date",
        "prof_promedio": "GPA",
        "prof_otros": "Other Studies",
        "prof_laborales": "Employment Data",
        "prof_ocupacion": "Occupation",
        "prof_ciudad": "City",
        "prof_estado": "State",
        "prof_tel_lab": "Work Phone",
        "prof_btn_cerrar": "Close",
        "prof_no_reg": "Not registered",
        "prof_ninguno": "None",

        // DB Requirements
        "Acta Nacimiento": "Birth Certificate",
        "CURP": "SSN/CURP",
        "Identificacion Oficial (INE)": "Official ID (INE)",
        "Constancia Idiomas": "Language Proficiency Certificate",
        "Fotografía Tamaño Infantil": "Passport Size Photograph",
        "Comprobante de Domicilio": "Proof of Address",
        "Curriculum Vitae (CV) Actualizado": "Updated Curriculum Vitae (CV)",
        "Carta de Exposición de Motivos": "Statement of Purpose",
        "Título de Licenciatura": "Bachelor's Degree Certificate",
        "Certificado Oficial de Calificaciones": "Official Transcript of Records",
        "Cédula Profesional": "Professional License",
        "Propuesta de Proyecto de Investigación": "Research Project Proposal",
        "Carta de Recomendación Académica 1": "Academic Recommendation Letter 1",
        "Carta de Recomendación Académica 2": "Academic Recommendation Letter 2",
        "Resultados de Examen EXANI-III (CENEVAL)": "EXANI-III Exam Results (CENEVAL)",
        "Comprobante de Pago de Aranceles": "Proof of Fee Payment",
        "Titulo de Grado de Maestria": "Master's Degree Certificate",
        "Carta de Recomendacion Academica 3": "Academic Recommendation Letter 3",
        "Constancia de Dominio del Idioma Ingles": "English Proficiency Certificate"
    }
};

/**
 * Obtiene el idioma actual (por defecto español)
 */
function getIdiomaActual() {
    return localStorage.getItem('idioma') || 'es';
}

/**
 * Devuelve el texto traducido según la llave y el idioma actual
 */
function t(key) {
    const lang = getIdiomaActual();
    if (translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    // Fallback a español si no existe la traducción, o devuelve la llave si no existe del todo
    if (translations['es'] && translations['es'][key]) {
        return translations['es'][key];
    }
    return key;
}

/**
 * Recorre todos los elementos con data-i18n en el DOM y aplica las traducciones
 */
function aplicarTraduccionesDOM() {
    const elementos = document.querySelectorAll('[data-i18n]');
    elementos.forEach(el => {
        const key = el.getAttribute('data-i18n');
        // Si el elemento permite innerHTML (por ejemplo, si tiene etiquetas <br>), se usa innerHTML
        // De lo contrario, textContent es más seguro. Por defecto usaremos innerHTML para mayor flexibilidad.
        el.innerHTML = t(key);
    });

    // Traducir atributos title (tooltips)
    const elementosTitle = document.querySelectorAll('[data-i18n-title]');
    elementosTitle.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });
}

/**
 * Cambia el idioma global y recarga la página para aplicar los cambios en JS dinámico
 */
function cambiarIdioma(langValue) {
    let langCode = 'es';
    if (langValue === 'English (US)' || langValue === 'en') {
        langCode = 'en';
    } else {
        langCode = 'es';
    }
    
    if (langCode !== getIdiomaActual()) {
        localStorage.setItem('idioma', langCode);
        location.reload(); // Recarga limpia para asegurar que todo el JS dinámico se regenere
    }
}

// Escuchar cuando el DOM esté listo para aplicar las traducciones
document.addEventListener('DOMContentLoaded', () => {
    aplicarTraduccionesDOM();
    
    // Seleccionar el dropdown de idioma correcto si existe
    const selectIdioma = document.getElementById('setting-idioma');
    if (selectIdioma) {
        selectIdioma.value = getIdiomaActual() === 'en' ? 'English (US)' : 'Español (México)';
    }
});
