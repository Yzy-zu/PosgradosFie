// validarPosgrado.js

const validarPosgrado = (req, res, next) => {
    const { nombre, codigo } = req.body;
    const errores = [];

    // Validar el nombre del posgrado
    if (!nombre || nombre.trim() === '') {
        errores.push('El nombre del posgrado es obligatorio.');
    }

    // Validar un código de identificación (ej. MIE, DIE)
    if (!codigo || codigo.trim() === '') {
        errores.push('El código o siglas del posgrado son obligatorios.');
    }

    if (errores.length > 0) {
        return res.status(400).json({
            ok: false,
            msg: 'Errores en la validación del posgrado.',
            errores
        });
    }

    next();
};

module.exports = validarPosgrado;