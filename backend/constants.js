/**
 * constants.js
 * ==============================================================
 * Punto único de verdad para IDs de catálogos de la BD.
 *
 * CUÁNDO ACTUALIZAR ESTE ARCHIVO:
 *   - Si un requisito del catálogo es reemplazado por uno nuevo,
 *     actualiza el ID aquí y reinicia el servidor.
 *   - Si se agrega una nueva etapa al workflow, actualiza ETAPAS.
 *
 * CÓMO CONSULTAR EL CATÁLOGO:
 *   mysql -u fie -pfie posgrado -e "SELECT id, nombre, categoria FROM catalogo_requisitos;"
 *   mysql -u fie -pfie posgrado -e "SELECT id, nombre FROM etapa_proceso;"
 * ==============================================================
 */

module.exports = {

    // ----------------------------------------------------------
    // IDs de requisitos académicos usados en validación de promedio
    // Tabla: catalogo_requisitos
    // ----------------------------------------------------------
    REQUISITOS: {
        TITULO_LICENCIATURA:          9,
        CERTIFICADO_CALIFICACIONES:  10,
        CEDULA_PROFESIONAL:          11,
    },

    // ----------------------------------------------------------
    // IDs de etapas del workflow
    // Tabla: etapa_proceso
    // ----------------------------------------------------------
    ETAPAS: {
        VALIDACION_PROMEDIO: 5,
        RESULTADO:           6,
        PAGO:                9,
    },

};
