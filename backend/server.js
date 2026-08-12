const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

    /**
     * El cliente envía { rol: 'ADMIN'|'DOCENTE'|'ASPIRANTE', idUsuario: N }
     * y el servidor lo une a:
     *   - la room de su rol   (ej. 'ADMIN')
     *   - su room personal    (ej. 'usuario_42')
     */
    socket.on('registrarSala', ({ rol, idUsuario }) => {
        if (rol) {
            socket.join(rol);
        }
        if (idUsuario) {
            socket.join(`usuario_${idUsuario}`);
        }
        console.log(`Socket ${socket.id} → sala '${rol}' + 'usuario_${idUsuario}'`);
    });

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

// Servir carpetas estáticas de archivos e imágenes
app.use('/files', express.static(path.join(__dirname, 'files')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/avisos', require('./routes/avisos.routes'));
app.use('/api/filemanager', require('./routes/fileManager.routes'));

// -------------------------------------------------------------------
// Ruta protegida para servir archivos de solicitud (Bug 10 Fix)
// Acepta el JWT como query param ?token= para links directos en nueva pestaña
// -------------------------------------------------------------------
const jwt = require('jsonwebtoken');
app.get('/api/files/{*path}', (req, res) => {
    // En Express 5 con path-to-regexp v8, {*path} devuelve un array
    const filename = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path;
    
    // Las imágenes del carrusel de Avisos deben ser públicas
    const isPublic = filename && filename.startsWith('admin/Avisos/');
    
    if (!isPublic) {
        const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
        if (!token) {
            return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
        }
        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error('Error in /api/files/:', error);
            return res.status(403).json({ mensaje: 'Token inválido o expirado.', details: error.message });
        }
    }

    if (!filename || filename.includes('..')) {
        return res.status(403).json({ mensaje: 'Ruta de archivo inválida.' });
    }
    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
});

// Nota: La ruta POST /api/entrevistas (legacy) fue migrada a /api/entrevista via entrevista.routes.js

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aspirante.html'));
});

server.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});

// Rutas temporales/básicas para secretario si aún no las tienes declaradas
app.get('/api/secretario/aspirantes', (req, res) => {
    res.json({ success: true, aspirantes: [] });
});

app.get('/api/secretario/documentos', (req, res) => {
    res.json({ success: true, documentos: [] });
});