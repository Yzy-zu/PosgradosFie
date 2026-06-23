exports.login = (req, res) => {

    const { correo, password } = req.body;

    res.json({
        mensaje: 'Login funcionando',
        correo
    });

};