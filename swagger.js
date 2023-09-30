const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swagg = require('./src/swagger_comments.json');

const options = {
  definition: {
    openapi: '3.0.0', // Especifique a versão do OpenAPI que você está usando
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Documentação da API',
    },
  },
  apis: ['src/Controllers/*.js'], // Caminho para os arquivos que contêm suas rotas
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swagg));
};
