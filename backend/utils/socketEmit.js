/**
 * socketEmit.js
 * Utilidad centralizada para emitir eventos Socket.io a rooms específicas.
 * Uso: const emit = require('../utils/socketEmit');
 *      emit.aAdmin(req, 'actualizacionGlobal');
 *      emit.aAspiranteEspecifico(req, idUsuario, 'actualizacionGlobal');
 */

const getIO = (req) => req.app.get('io') || null;

/** Solo al rol ADMIN */
const aAdmin = (req, evento = 'actualizacionGlobal') => {
    const io = getIO(req);
    if (io) io.to('ADMIN').emit(evento);
};

/** Solo al rol DOCENTE */
const aDocente = (req, evento = 'actualizacionGlobal') => {
    const io = getIO(req);
    if (io) io.to('DOCENTE').emit(evento);
};

/** A todos los ASPIRANTE conectados */
const aAspirantes = (req, evento = 'actualizacionGlobal') => {
    const io = getIO(req);
    if (io) io.to('ASPIRANTE').emit(evento);
};

/**
 * Al aspirante específico (su room personal) + al ADMIN.
 * Usar cuando el docente/admin hace algo sobre un aspirante concreto.
 */
const aAspiranteEspecifico = (req, idUsuario, evento = 'actualizacionGlobal') => {
    const io = getIO(req);
    if (io) {
        io.to(`usuario_${idUsuario}`).emit(evento);
        io.to('ADMIN').emit(evento);
    }
};

/** ADMIN + DOCENTE — aspirante hace algo que ambos deben ver */
const aAdminYDocente = (req, evento = 'actualizacionGlobal') => {
    const io = getIO(req);
    if (io) {
        io.to('ADMIN').emit(evento);
        io.to('DOCENTE').emit(evento);
    }
};

/** ADMIN + todos los ASPIRANTE — ej. cambia convocatoria/posgrado */
const aAdminYAspirantes = (req, evento = 'actualizacionGlobal') => {
    const io = getIO(req);
    if (io) {
        io.to('ADMIN').emit(evento);
        io.to('ASPIRANTE').emit(evento);
    }
};

module.exports = {
    aAdmin,
    aDocente,
    aAspirantes,
    aAspiranteEspecifico,
    aAdminYDocente,
    aAdminYAspirantes
};
