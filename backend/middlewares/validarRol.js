const validarRol = (...rolesPermitidos) => {

    const rolesNormalizados =
        rolesPermitidos.map(
            rol =>
                String(rol)
                    .trim()
                    .toUpperCase()
        );

    return (req, res, next) => {

        const usuario =
            req.usuario;

        if (!usuario) {

            return res.status(401).json({
                ok: false,
                mensaje:
                    "No hay un usuario autenticado en la petición."
            });
        }

        const rolUsuario =
            String(usuario.rol || "")
                .trim()
                .toUpperCase();

        if (
            !rolesNormalizados.includes(
                rolUsuario
            )
        ) {

            return res.status(403).json({
                ok: false,
                mensaje:
                    `Acceso denegado. Roles permitidos: ${rolesNormalizados.join(", ")}`
            });
        }

        next();
    };
};

module.exports = validarRol;