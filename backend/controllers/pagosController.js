const db = require('../database/db');

// Obtener todos los pagos
const obtenerPagos = async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM pagos');
        return res.json(resultados);
    } catch (error) {
        console.error('Error en obtenerPagos:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener pagos' });
    }
};

// Obtener un pago por ID
const obtenerPago = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultados] = await db.query('SELECT * FROM pagos WHERE id=?', [id]);

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'Pago no encontrado' });
        }

        return res.json(resultados[0]);
    } catch (error) {
        console.error('Error en obtenerPago:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al obtener pago' });
    }
};

// Crear pago
const crearPago = async (req, res) => {
    try {
        const { idSoli, monto, referencia, estado } = req.body;

        await db.query(
            'INSERT INTO pagos (idSoli, monto, referencia, estado) VALUES (?, ?, ?, ?)',
            [idSoli, monto, referencia, estado]
        );

        return res.json({ success: true, mensaje: 'Pago registrado correctamente' });
    } catch (error) {
        console.error('Error en crearPago:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al registrar pago' });
    }
};

// Actualizar pago
const actualizarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { idSoli, monto, referencia, estado } = req.body;

        await db.query(
            'UPDATE pagos SET idSoli=?, monto=?, referencia=?, estado=? WHERE id=?',
            [idSoli, monto, referencia, estado, id]
        );

        return res.json({ success: true, mensaje: 'Pago actualizado' });
    } catch (error) {
        console.error('Error en actualizarPago:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al actualizar pago' });
    }
};

// Eliminar pago
const eliminarPago = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM pagos WHERE id=?', [id]);
        return res.json({ success: true, mensaje: 'Pago eliminado' });
    } catch (error) {
        console.error('Error en eliminarPago:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al eliminar pago' });
    }
};

module.exports = {
    obtenerPagos,
    obtenerPago,
    crearPago,
    actualizarPago,
    eliminarPago
};