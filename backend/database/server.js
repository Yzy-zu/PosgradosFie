// server.js (Ecosistema Node.js / JavaScript)
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./database'); // Tu pool de conexiones a MySQL

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_fie_umsnh';

// Middlewares para procesar JSON y permitir peticiones del Front
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------------------------------------------------------
// CONFIGURACIÓN DE MULTER (Manejo de archivos binarios en JavaScript)
// -------------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Los archivos se guardan en esta carpeta local
    },
    filename: (req, file, cb) => {
        // Estructura: solicitud-[ID]-[TipoDoc]-[Timestamp].[Extension]
        const idSoli = req.user ? req.user.idSolicitud : 'anonimo';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `solicitud-${idSoli}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// -------------------------------------------------------------------------
// MIDDLEWARE: VERIFICACIÓN DE TOKEN
// -------------------------------------------------------------------------
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso denegado.' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token no válido.' });
    }
};

// -------------------------------------------------------------------------
// ENDPOINTS PRINCIPALES
// -------------------------------------------------------------------------

/**
 * LOGIN: Valida credenciales e inyecta relaciones relacionales en el Token
 */
app.post('/api/auth/login', async (req, res) => {
    const { usuario, contrasena } = req.body; // 'usuario' corresponde a 'correo' en tu SQL

    try {
        const [users] = await db.query('SELECT * FROM Usuario WHERE correo = ?', [usuario]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuario inexistente.' });

        const user = users[0];
        // Nota: Recuerda usar la columna como 'contrasena' sin ñ para evitar fallos de codificación SQL
        if (contrasena !== user.contrasena) return res.status(401).json({ error: 'Credenciales inválidas.' });

        let idAspirante = null; let idSolicitud = null;

        if (user.rol === 'ASPIRANTE') {
            const [aspi] = await db.query('SELECT id FROM Aspirante WHERE idUsuario = ?', [user.id]);
            if (aspi.length > 0) {
                idAspirante = aspi[0].id;
                const [soli] = await db.query('SELECT id FROM Solicitud WHERE idAspi = ? LIMIT 1', [idAspirante]);
                if (soli.length > 0) idSolicitud = soli[0].id;
            }
        }

        // Generar el token con JavaScript
        const token = jwt.sign(
            { id: user.id, correo: user.correo, rol: user.rol, idAspirante, idSolicitud }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({ token, usuario: { correo: user.correo, rol: user.rol, idAspirante, idSolicitud } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Fallo interno del servidor.' });
    }
});

/**
 * SUBIR DOCUMENTO: Almacena el archivo físico y actualiza la tabla 'Documento' de Prisma
 */
app.post('/api/documentos/subir', verificarToken, upload.single('documento'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Archivo no adjuntado.' });

    const { tipoDoc } = req.body; // Valores ENUM: 'CV', 'CURP', 'TITULO_LIC', etc.
    const idSolicitud = req.user.idSolicitud;
    const rutaArchivo = req.file.path;

    if (!idSolicitud) return res.status(400).json({ error: 'No cuentas con una solicitud activa.' });

    try {
        const sql = `
            INSERT INTO Documento (idSoli, tipoDoc, rutaArchivo, estadoDoc) 
            VALUES (?, ?, ?, 'PENDIENTE')
            ON DUPLICATE KEY UPDATE rutaArchivo = ?, estadoDoc = 'PENDIENTE'
        `;
        await db.query(sql, [idSolicitud, tipoDoc, rutaArchivo, rutaArchivo]);
        res.json({ message: 'Documento procesado correctamente en JavaScript.', rutaArchivo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al escribir el registro.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo  ${PORT}`);
});