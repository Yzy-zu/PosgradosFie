const express = require('express');
const cors = require('cors');
const path = require('path');

require('./database/db');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', require('./routes/auth.routes'));

app.use('/api/posgrado', require('./routes/posgrado.routes'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});