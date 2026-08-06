const db = require('../database/db');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '..', 'uploads', 'admin', 'Avisos');

// Función recursiva para buscar imágenes y videos
const getAllMedia = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllMedia(fullPath, fileList);
        } else {
            const ext = path.extname(file).toLowerCase();
            const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.ogg', '.mov'];
            if (allowedExts.includes(ext)) {
                // Obtener ruta relativa a /uploads/admin/
                const relativePath = path.relative(path.join(__dirname, '..', 'uploads', 'admin'), fullPath);
                // Convertir backslashes a slashes para la web
                fileList.push(relativePath.replace(/\\/g, '/'));
            }
        }
    });
    
    return fileList;
};

const obtenerAvisosActivos = async (req, res) => {
    try {
        // 1. Obtener todos los archivos multimedia físicos
        const mediaPaths = getAllMedia(baseDir);
        
        if (mediaPaths.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Obtener los registros de la DB para saber cuáles están inactivos
        const placeholders = mediaPaths.map(() => '?').join(',');
        const query = `SELECT rutaArchivo, activo FROM avisos_carrusel WHERE rutaArchivo IN (${placeholders})`;
        const [registrosDB] = await db.query(query, mediaPaths);

        // Crear mapa para fácil búsqueda
        const estadoMap = {};
        registrosDB.forEach(reg => {
            estadoMap[reg.rutaArchivo] = reg.activo;
        });

        // 3. Filtrar y formatear respuesta
        const activos = mediaPaths.filter(ruta => {
            const activo = estadoMap[ruta] !== undefined ? estadoMap[ruta] : 1;
            return activo == 1;
        });

        // Convertir al formato que espera el frontend
        const videoExts = ['.mp4', '.webm', '.ogg', '.mov'];
        const respuesta = activos.map(ruta => {
            const ext = path.extname(ruta).toLowerCase();
            return {
                rutaArchivo: ruta,
                titulo: path.basename(ruta),
                tipo: videoExts.includes(ext) ? 'video' : 'imagen'
            };
        });

        res.status(200).json(respuesta);
    } catch (error) {
        console.error('Error al obtener avisos activos:', error);
        res.status(500).json({ mensaje: 'Error al obtener avisos', error: error.message });
    }
};

module.exports = {
    obtenerAvisosActivos
};
