const fs = require('fs');
const path = require('path');
const db = require('../database/db');

// Asegurar que el directorio base exista
const baseDir = path.join(__dirname, '..', 'uploads', 'admin');
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
}

// Función auxiliar para evitar path traversal
const safeJoin = (base, requestPath) => {
    // Normalizar la ruta solicitada y resolverla contra el directorio base
    const targetPath = path.join(base, requestPath || '');
    // Verificar que targetPath comience con baseDir
    if (targetPath.indexOf(baseDir) !== 0) {
        throw new Error('Acceso denegado');
    }
    return targetPath;
};

const listarDirectorio = async (req, res) => {
    try {
        const queryPath = req.query.path || '/';
        const targetPath = safeJoin(baseDir, queryPath);

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ mensaje: 'Directorio no encontrado' });
        }

        const items = fs.readdirSync(targetPath, { withFileTypes: true });
        
        let result = items.map(item => {
            const stat = fs.statSync(path.join(targetPath, item.name));
            return {
                name: item.name,
                isDirectory: item.isDirectory(),
                size: stat.size,
                createdAt: stat.birthtime,
                modifiedAt: stat.mtime,
                activo: 1 // Default
            };
        });

        // Ordenar: carpetas primero, luego alfabéticamente
        result.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });

        // Solo si la ruta contiene Avisos, cruzamos con la DB
        if (queryPath.includes('Avisos')) {
            const [dbRows] = await db.query('SELECT rutaArchivo, activo FROM avisos_carrusel');
            const mapEstado = {};
            dbRows.forEach(row => { mapEstado[row.rutaArchivo] = row.activo; });

            result = result.map(item => {
                if (!item.isDirectory) {
                    const relativePath = queryPath === '/' ? item.name : queryPath.substring(1) + '/' + item.name;
                    // Asegurar que comience con Avisos/
                    const fullPath = relativePath.startsWith('Avisos') ? relativePath : 'Avisos/' + relativePath;
                    if (mapEstado[fullPath] !== undefined) {
                        item.activo = mapEstado[fullPath];
                    }
                }
                return item;
            });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(403).json({ mensaje: error.message });
    }
};

const crearCarpeta = (req, res) => {
    try {
        const { currentPath, folderName } = req.body;
        if (!folderName || folderName.includes('/') || folderName.includes('\\')) {
            return res.status(400).json({ mensaje: 'Nombre de carpeta inválido' });
        }

        const targetPath = safeJoin(baseDir, path.join(currentPath || '/', folderName));
        
        if (fs.existsSync(targetPath)) {
            return res.status(400).json({ mensaje: 'La carpeta ya existe' });
        }

        fs.mkdirSync(targetPath);
        res.status(201).json({ mensaje: 'Carpeta creada' });
    } catch (error) {
        res.status(403).json({ mensaje: error.message });
    }
};

const subirArchivo = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mensaje: 'No se subió ningún archivo' });
        }
        // El archivo ya fue guardado por multer temporalmente en 'uploads/'
        // Tenemos que moverlo a la ruta correcta
        const currentPath = req.body.currentPath || '/';
        const tempPath = req.file.path;
        const targetPath = safeJoin(baseDir, path.join(currentPath, req.file.originalname));

        // Si ya existe, podríamos renombrarlo o fallar
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(tempPath); // borrar el temp
            return res.status(400).json({ mensaje: 'Ya existe un archivo con ese nombre' });
        }

        fs.renameSync(tempPath, targetPath);

        res.status(201).json({ mensaje: 'Archivo subido' });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(403).json({ mensaje: error.message });
    }
};

const eliminar = (req, res) => {
    try {
        const { itemPath } = req.body;
        const targetPath = safeJoin(baseDir, itemPath);

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ mensaje: 'Archivo o carpeta no encontrado' });
        }

        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(targetPath);
        }

        res.status(200).json({ mensaje: 'Eliminado correctamente' });
    } catch (error) {
        res.status(403).json({ mensaje: error.message });
    }
};

const renombrar = (req, res) => {
    try {
        const { currentPath, oldName, newName } = req.body;
        if (!newName || newName.includes('/') || newName.includes('\\')) {
            return res.status(400).json({ mensaje: 'Nombre inválido' });
        }

        const oldPathFull = safeJoin(baseDir, path.join(currentPath, oldName));
        const newPathFull = safeJoin(baseDir, path.join(currentPath, newName));

        if (!fs.existsSync(oldPathFull)) {
            return res.status(404).json({ mensaje: 'El elemento original no existe' });
        }

        if (fs.existsSync(newPathFull)) {
            return res.status(400).json({ mensaje: 'Ya existe un elemento con ese nombre' });
        }

        fs.renameSync(oldPathFull, newPathFull);
        res.status(200).json({ mensaje: 'Renombrado correctamente' });
    } catch (error) {
        res.status(403).json({ mensaje: error.message });
    }
};

const toggleAviso = async (req, res) => {
    try {
        const { rutaArchivo } = req.body;
        if (!rutaArchivo) return res.status(400).json({ mensaje: 'Ruta no proporcionada' });

        // Verificamos si existe un registro en BD
        const [rows] = await db.query('SELECT activo FROM avisos_carrusel WHERE rutaArchivo = ?', [rutaArchivo]);
        
        let nuevoEstado = 0; // Si no existe, asumimos que estaba activo (1) y queremos pasarlo a 0

        if (rows.length === 0) {
            // No existe, insertamos con estado 0 (inactivo)
            await db.query('INSERT INTO avisos_carrusel (titulo, rutaArchivo, activo, orden) VALUES (?, ?, ?, ?)', 
                [path.basename(rutaArchivo), rutaArchivo, 0, 0]);
        } else {
            // Sí existe, invertimos su estado
            nuevoEstado = rows[0].activo ? 0 : 1;
            await db.query('UPDATE avisos_carrusel SET activo = ? WHERE rutaArchivo = ?', [nuevoEstado, rutaArchivo]);
        }

        res.status(200).json({ mensaje: 'Estado cambiado', activo: nuevoEstado });
    } catch (error) {
        console.error('Error en toggleAviso:', error);
        res.status(500).json({ mensaje: 'Error al cambiar estado' });
    }
};

module.exports = {
    listarDirectorio,
    crearCarpeta,
    subirArchivo,
    eliminar,
    renombrar,
    toggleAviso
};
