const express = require('express');
const router = express.Router();
const fileManagerController = require('../controllers/fileManagerController');
const auth = require('../middlewares/auth');
const validarRol = require('../middlewares/validarRol');
const multer = require('multer');
const path = require('path');

// Multer base (guarda en /uploads, el controlador lo mueve a su carpeta final)
const upload = multer({
    dest: path.join(__dirname, '..', 'uploads')
});

// Todas las rutas protegidas para ADMIN
router.use(auth, validarRol('ADMIN'));

router.get('/list', fileManagerController.listarDirectorio);
router.post('/folder', fileManagerController.crearCarpeta);
router.post('/upload', upload.single('archivo'), fileManagerController.subirArchivo);
router.put('/rename', fileManagerController.renombrar);
router.delete('/delete', fileManagerController.eliminar);
router.post('/toggle-aviso', fileManagerController.toggleAviso);

module.exports = router;
