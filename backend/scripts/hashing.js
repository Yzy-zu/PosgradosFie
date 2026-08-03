/**
 * Script de migración (una sola ejecución).
 * Hashea con bcrypt todas las contraseñas que aún estén en texto plano.
 * Detecta hashes ya existentes por el prefijo '$2b$' para no doble-hashear.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');

const SALT_ROUNDS = 10;

async function migrar() {
    const [usuarios] = await db.query('SELECT id, correo, contraseña FROM usuario');

    console.log(`\nTotal de usuarios encontrados: ${usuarios.length}`);
    let migrados = 0;
    let omitidos = 0;

    for (const u of usuarios) {
        const pass = u['contraseña'];

        // Si ya es hash bcrypt ($2b$ o $2a$), lo saltamos
        if (pass && (pass.startsWith('$2b$') || pass.startsWith('$2a$'))) {
            console.log(`  [SKIP]  ${u.correo} — ya tiene hash`);
            omitidos++;
            continue;
        }

        const hash = await bcrypt.hash(pass, SALT_ROUNDS);
        await db.query('UPDATE usuario SET contraseña = ? WHERE id = ?', [hash, u.id]);
        console.log(`  [OK]    ${u.correo} — hasheado correctamente`);
        migrados++;
    }

    console.log(`\nMigración completada: ${migrados} hasheados, ${omitidos} omitidos.\n`);
    process.exit(0);
}

migrar().catch(err => {
    console.error('Error durante la migración:', err);
    process.exit(1);
});
