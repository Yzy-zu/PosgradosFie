// validarSolicitud.js

const validarSolicitud = (req, res, next) => {
    const { aspirante_id, posgrado_id } = req.body;
    const errores = [];

    // Validar que se envíe el ID del aspirante
    if (!aspirante_id) {
        errores.push('El ID del aspirante es obligatorio.');
    } else if (isNaN(aspirante_id)) {
        errores.push('El ID del aspirante debe ser un número válido.');
    }

    // Validar que se envíe el ID del posgrado al que aplica
    if (!posgrado_id) {
        errores.push('El ID del posgrado es obligatorio.');
    } else if (isNaN(posgrado_id)) {
        errores.push('El ID del posgrado debe ser un número válido.');
    }

    // Si hay errores, respondemos inmediatamente sin pasar al controlador
    if (errores.length > 0) {
        return res.status(400).json({
            ok: false,
            msg: 'Errores en la validación de la solicitud.',
            errores
        });
    }

    next();
};

module.exports = validarSolicitud;