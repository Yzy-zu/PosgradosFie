const db = require('../database/db');
const bcrypt = require('bcrypt');

const registrarAspirante = async (req, res) => {

    try {

        const {
            nombre,
            primerApellido,
            segundoApellido,
            curp,
            correo,
            telefono,
            fechaNacimiento,
            direccion,
            password
        } = req.body;

        // ============================
        // VALIDACIONES
        // ============================

        if (
            !nombre ||
            !primerApellido ||
            !curp ||
            !correo ||
            !telefono ||
            !fechaNacimiento ||
            !direccion ||
            !password
        ) {

            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });

        }

        // ============================
        // VALIDAR CORREO
        // ============================

        const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!correoRegex.test(correo)) {

            return res.status(400).json({
                mensaje: "Correo inválido."
            });

        }

        // ============================
        // VALIDAR CURP
        // ============================

        if (curp.length !== 18) {

            return res.status(400).json({
                mensaje: "La CURP debe tener 18 caracteres."
            });

        }

        // ============================
        // VALIDAR TELÉFONO
        // ============================

        if (!/^\d{10}$/.test(telefono)) {

            return res.status(400).json({
                mensaje: "El teléfono debe tener 10 dígitos."
            });

        }

        // ============================
        // VALIDAR CONTRASEÑA
        // ============================

        if (password.length < 8) {

            return res.status(400).json({
                mensaje: "La contraseña debe tener mínimo 8 caracteres."
            });

        }

        // ============================
        // BUSCAR CORREO
        // ============================

        db.query(
            "SELECT * FROM usuario WHERE correo = ?",
            [correo],
            async (err, resultadoCorreo) => {

                if (err) {

                    return res.status(500).json(err);

                }

                if (resultadoCorreo.length > 0) {

                    return res.status(409).json({
                        mensaje: "El correo ya está registrado."
                    });

                }

                // ============================
                // BUSCAR CURP
                // ============================

                db.query(
                    "SELECT * FROM aspirante WHERE curp = ?",
                    [curp],
                    async (err, resultadoCurp) => {

                        if (err) {

                            return res.status(500).json(err);

                        }

                        if (resultadoCurp.length > 0) {

                            return res.status(409).json({
                                mensaje: "La CURP ya está registrada."
                            });

                        }

                        // ============================
                        // ENCRIPTAR CONTRASEÑA
                        // ============================

                        const passwordHash = await bcrypt.hash(password, 10);

                        // ============================
                        // INSERTAR USUARIO
                        // ============================

                        db.query(

                            "INSERT INTO usuario(correo,password,rol) VALUES(?,?,?)",

                            [correo, passwordHash, "aspirante"],

                            (err, resultadoUsuario) => {

                                if (err) {

                                    return res.status(500).json(err);

                                }

                                const idUsuario = resultadoUsuario.insertId;

                                // ============================
                                // INSERTAR ASPIRANTE
                                // ============================

                                db.query(

                                    `INSERT INTO aspirante
                                    (nombre,
                                    primerApellido,
                                    segundoApellido,
                                    curp,
                                    correo,
                                    telefono,
                                    fechaNacimiento,
                                    direccion,
                                    idUsuario)

                                    VALUES(?,?,?,?,?,?,?,?,?)`,

                                    [
                                        nombre,
                                        primerApellido,
                                        segundoApellido,
                                        curp,
                                        correo,
                                        telefono,
                                        fechaNacimiento,
                                        direccion,
                                        idUsuario
                                    ],

                                    (err) => {

                                        if (err) {

                                            return res.status(500).json(err);

                                        }

                                        return res.status(201).json({

                                            mensaje: "Aspirante registrado correctamente."

                                        });

                                    }

                                );

                            }

                        );

                    }

                );

            }

        );

    } catch (error) {

        return res.status(500).json(error);

    }

};

module.exports = {

    registrarAspirante

};  