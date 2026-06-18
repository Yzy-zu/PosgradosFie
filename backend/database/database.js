// database.js
// Importar los módulos nativos de Node/JavaScript necesarios
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Cargar las variables de entorno del archivo .env
dotenv.config();

// Crear el pool de conexiones a la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'posgrados', // Nombre de tu base de datos del respaldo SQL
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Asegura la codificación Acorrecta de caracteres especiales evitando problemas con columnas de texto
    charset: 'utf8mb4' 
});

// Promisificar el pool para poder utilizar async/await de JavaScript en tu server.js
const promisePool = pool.promise();

console.log('Conexion exitosa');

// Exportar el módulo para que server.js pueda requerirlo
module.exports = promisePool;