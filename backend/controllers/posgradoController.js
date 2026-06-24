const db = require('../database/db');

exports.obtenerPosgrados = (req, res) => {

    const sql = 'SELECT * FROM posgrado';

    db.query(sql, (err, result) => {

      if (err) {
            return res.status(500).json({
                error: err
            });
        }

        res.json(result);

    });

};