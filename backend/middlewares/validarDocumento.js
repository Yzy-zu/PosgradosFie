// validarDocumento.js

const validarDocumento = (req, res, next) => {
    const { solicitud_id, tipo_documento, estatus } = req.body;
    const errores = [];

    // Si se está creando, debe ir ligado a una solicitud
    if (req.method === 'POST' && !solicitud_id) {
        errores.push('El ID de la solicitud asociada es obligatorio.');
    }

    // Validar el tipo de documento (ej. 'Identificación', 'Certificado')
    if (!tipo_documento || tipo_documento.trim() === '') {
        errores.push('El tipo de documento es obligatorio.');
    }

    // Si viene un estatus (por ejemplo, cuando el Secretario califica el documento)
    if (estatus) {
        const estatusValidos = ['PENDIENTE', 'APROBADO', 'RECHAZADO']; // Tus ENUM de la BD
        if (!estatusValidos.includes(estatus.toUpperCase())) {
            errores.push(`El estatus '${estatus}' no es válido. Debe ser: ${estatusValidos.join(', ')}`);
        }
    }

    if (errores.length > 0) {
        return res.status(400).json({
            ok: false,
            msg: 'Errores en la validación del documento.',
            errores
        });
    }

    next();
};

module.exports = validarDocumento;