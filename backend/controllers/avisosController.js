const db = require('../database/db');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '..', 'uploads', 'admin', 'Avisos');

// Función recursiva para buscar imágenes
const getAllImages = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllImages(fullPath, fileList);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
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
        // 1. Obtener todas las imágenes físicas
        const imagePaths = getAllImages(baseDir);
        
        if (imagePaths.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Obtener los registros de la DB para saber cuáles están inactivos
        // (Usamos IN con la lista de rutas encontradas para optimizar)
        const placeholders = imagePaths.map(() => '?').join(',');
        const query = `SELECT rutaArchivo, activo FROM avisos_carrusel WHERE rutaArchivo IN (${placeholders})`;
        const [registrosDB] = await db.query(query, imagePaths);

        // Crear mapa para fácil búsqueda
        const estadoMap = {};
        registrosDB.forEach(reg => {
            estadoMap[reg.rutaArchivo] = reg.activo;
        });

        // 3. Filtrar y formatear respuesta
        // Si no está en la DB, asumimos que está activo (1). Si está en DB, respetamos su valor.
        const activos = imagePaths.filter(ruta => {
            const activo = estadoMap[ruta] !== undefined ? estadoMap[ruta] : 1;
            return activo == 1; // o true
        });

        // Convertir al formato que espera el frontend
        const respuesta = activos.map(ruta => ({
            rutaArchivo: ruta, // Esto será 'Avisos/foto.jpg' o 'Avisos/2026/foto.jpg'
            titulo: path.basename(ruta)
        }));

        res.status(200).json(respuesta);
    } catch (error) {
        console.error('Error al obtener avisos activos:', error);
        res.status(500).json({ mensaje: 'Error al obtener avisos', error: error.message });
    }
};

module.exports = {
    obtenerAvisosActivos
};
