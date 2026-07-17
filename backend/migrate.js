const db = require('./database/db');

const sql = `
-- 1. Crear catalogo de requisitos
CREATE TABLE IF NOT EXISTS catalogo_requisitos (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    categoria VARCHAR(100) DEFAULT 'GENERAL'
);

-- 2. Insertar algunos catalogos comunes iniciales (Si no existen)
INSERT IGNORE INTO catalogo_requisitos (nombre, categoria) VALUES
('Acta de Nacimiento', 'IDENTIDAD'),
('Clave CURP', 'IDENTIDAD'),
('Identificación Oficial (INE)', 'IDENTIDAD'),
('Fotografía Tamaño Infantil', 'IDENTIDAD'),
('Certificado de Calificaciones', 'ACADEMICO'),
('Currículum Vítae (CV)', 'ACADEMICO'),
('Propuesta de Proyecto de Investigación', 'ACADEMICO'),
('Constancia de Idioma', 'ACADEMICO'),
('Carta de Recomendación Académica', 'ACADEMICO'),
('Comprobante CENEVAL', 'EVALUACION');

-- 3. Modificar convocatoria_requisitos
ALTER TABLE convocatoria_requisitos 
ADD COLUMN requisito_id INT(11) AFTER convocatoria_id;

-- 4. Modificar constraint (drop old column and add fk)
ALTER TABLE convocatoria_requisitos
DROP COLUMN descripcion;

ALTER TABLE convocatoria_requisitos
ADD CONSTRAINT fk_requisito_catalogo
FOREIGN KEY (requisito_id) REFERENCES catalogo_requisitos(id)
ON DELETE CASCADE;
`;

const queries = sql.split(';').filter(q => q.trim() !== '');

async function run() {
    for (const query of queries) {
        try {
            await new Promise((resolve, reject) => {
                db.query(query, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                });
            });
            console.log("Success:", query.trim().split('\n')[0]);
        } catch (e) {
            console.error("Error executing:", query.trim().split('\n')[0]);
            console.error(e.message);
        }
    }
    process.exit();
}

run();
