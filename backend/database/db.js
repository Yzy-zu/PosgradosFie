const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'fie',
    password: process.env.DB_PASSWORD || 'fie',
    database: process.env.DB_NAME || 'posgrado',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Base de datos conectada (Pool)');
    connection.release();
});

module.exports = db;