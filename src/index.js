const express = require('express');
const bodyParser = require('body-parser');
const swaggerSetup = require('../swagger.js');
const cors = require('cors');

const app = express();

// Configuração do middleware de CORS
app.use(cors()); // Esta linha aceita requisições de qualquer origem



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require('./Controllers/authController.js')(app);
require('./Controllers/projectController.js')(app);

swaggerSetup(app);

// Inicialize o servidor
const PORT = process.env.PORTA || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});