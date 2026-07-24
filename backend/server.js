const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Agregado para Socket.io
const { Server } = require('socket.io'); // Agregado para Socket.io
require('dotenv').config();
require('./database/db');

const app = express();
const server = http.createServer(app); // Servidor HTTP
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Guardar la instancia de socket.io para usarla en los controladores
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado vía Socket.io:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));
// Servir la carpeta de uploads de manera estática
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuario', require('./routes/usuario.routes'));
app.use('/api/posgrado', require('./routes/posgrado.routes'));
app.use('/api/convocatorias', require('./routes/convocatorias.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));
app.use('/api/aspirante', require('./routes/aspirante.routes'));
app.use('/api/docentes', require('./routes/docentes.routes'));
//app.use('/api/evaluacion', require('./routes/evaluacion.routes'));
//app.use('/api/pagos', require('./routes/pagos.routes'));
app.use('/api/solicitud', require('./routes/solicitud.routes'));
app.use('/api/documentos', require('./routes/documentos.routes'));
app.use('/api/requisitos', require('./routes/requisitos.routes'));




app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aspirante.html'));
});

server.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});