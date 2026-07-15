const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./database/db');

const app = express();
const PORT = 4000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuario', require('./routes/usuario.routes'));
app.use('/api/posgrado', require('./routes/posgrado.routes'));
app.use('/api/convocatorias', require('./routes/convocatorias.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));
app.use('/api/aspirante', require('./routes/aspirante.routes'));
//app.use('/api/docentes', require('./routes/docentes.routes'));
//app.use('/api/evaluacion', require('./routes/evaluacion.routes'));
//app.use('/api/pagos', require('./routes/pagos.routes'));
app.use('/api/solicitud', require('./routes/solicitud.routes'));
app.use('/api/documentos', require('./routes/documentos.routes'));




app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aspirante.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
})
