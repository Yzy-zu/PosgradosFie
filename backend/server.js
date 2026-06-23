const express = require('express');
const cors = require('cors');

require('./database/db');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/posgrado', require('./routes/posgrado.routes'));

app.get('/', (req, res) => {
    res.send('Servidor funcionando');
});

app.listen(3000, () => {
    console.log('Servidor ejecutándose en puerto 3000');
});