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
// La carpeta de uploads ya no se sirve de manera estática para proteger los archivos (Prioridad 2)
// Servir imágenes y flyers generales
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuario', require('./routes/usuario.routes'));
app.use('/api/posgrado', require('./routes/posgrado.routes'));
app.use('/api/convocatorias', require('./routes/convocatorias.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));
app.use('/api/aspirante', require('./routes/aspirante.routes'));
app.use('/api/docentes', require('./routes/docentes.routes'));
app.use('/api/coordinador', require('./routes/coordinador.routes'));
app.use('/api/solicitud', require('./routes/solicitud.routes'));
app.use('/api/documentos', require('./routes/documentos.routes'));
app.use('/api/programacion-examen', require('./routes/programacionExamen.routes'));
app.use('/api/programacion-curso', require('./routes/programacionCurso.routes'));
app.use('/api/validacion-promedio', require('./routes/validacionPromedio.routes'));
app.use('/api/pagos', require('./routes/pagos.routes'));
app.use('/api/entrevista', require('./routes/entrevista.routes'));
app.use('/api/requisitos', require('./routes/requisitos.routes'));
app.use('/api/solicitud-temas', require('./routes/solicitudTema.routes'));

// -------------------------------------------------------------------
// Ruta protegida para servir archivos de solicitud (Bug 10 Fix)
// Acepta el JWT como query param ?token= para links directos en nueva pestaña
// -------------------------------------------------------------------
const jwt = require('jsonwebtoken');
app.get('/api/files/:filename', (req, res) => {
    const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const filename = req.params.filename;
        // Sanear el nombre para evitar path traversal
        const safeFilename = path.basename(filename);
        const filePath = path.join(__dirname, 'uploads', safeFilename);
        res.sendFile(filePath, (err) => {
            if (err) {
                return res.status(404).json({ mensaje: 'Archivo no encontrado.' });
            }
        });
    } catch (e) {
        return res.status(403).json({ mensaje: 'Token inválido o expirado.' });
    }
});

// Nota: La ruta POST /api/entrevistas (legacy) fue migrada a /api/entrevista via entrevista.routes.js



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aspirante.html'));
});

server.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});