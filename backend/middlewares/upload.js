const multer = require('multer');
const path = require('path');

// Configuración del almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const nombre = Date.now() + path.extname(file.originalname);
        cb(null, nombre);
    }
});

// M-05: mapa estricto MIME → extensiones permitidas.
// Valida tanto el MIME declarado como la extensión real del archivo
// para evitar spoofing con Content-Type falso.
const MIME_EXTENSIONES = {
    'application/pdf': ['.pdf'],
    'image/jpeg':      ['.jpg', '.jpeg'],
    'image/png':       ['.png'],
};

const fileFilter = (req, file, cb) => {
    const extensionesPermitidas = MIME_EXTENSIONES[file.mimetype];
    if (!extensionesPermitidas) {
        return cb(new Error('Tipo de archivo no permitido'), false);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!extensionesPermitidas.includes(ext)) {
        return cb(new Error('La extensión del archivo no coincide con su tipo declarado'), false);
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

module.exports = upload;