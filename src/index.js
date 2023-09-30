const express = require('express');
const bodyParser = require('body-parser');
const swaggerSetup = require('../swagger.js');


const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require('./Controllers/authController.js')(app);
require('./Controllers/projectController.js')(app);

swaggerSetup(app);

app.listen(3000);
