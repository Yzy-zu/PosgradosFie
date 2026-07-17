
const validarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Obtenemos el usuario que previamente inyectó el middleware 'auth'
        const usuario = req.usuario; 

        if (!usuario) {
            return res.status(401).json({
                ok: false,
                msg: 'No hay un usuario autenticado en la petición.'
            });
        }

        // Verificamos si el rol del usuario está dentro de los roles permitidos
        if (!rolesPermitidos.includes(usuario.rol)) {
            return res.status(403).json({
                ok: false,
                msg: `Acceso denegado. Se requiere uno de los siguientes roles: [${rolesPermitidos.join(', ')}]`
            });
        }

        next(); // Si tiene el rol, continúa a la ruta/controlador
    };
};

module.exports = validarRol;