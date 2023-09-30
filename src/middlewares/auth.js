const jwt = require('jsonwebtoken');
require('dotenv').config();
const authConfig = require('../../../../../Downloads/api-rest-nodejs-master/api-rest-nodejs-master/src/config/auth.json');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).send({ error: 'No token provided' });

  const parts = authHeader.split(' ');

  if (!parts.length === 2)
    return res.status(401).send({ erro: 'Token error' });

  const [ scheme, token ] = parts;

  if (!/^Bearer/i.test(scheme))
    return res.status(401).send({ error: 'Token malformatted' });

  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: 'Token invalid'});
    } 

    req.userId = decoded.id;
    return next();
  })
  
   
};
