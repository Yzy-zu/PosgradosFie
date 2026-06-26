const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'fie',
    password: 'fie',
    database: 'posgrados'
});

db.connect((err) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log('Base de datos conectada');
});

module.exports = db;