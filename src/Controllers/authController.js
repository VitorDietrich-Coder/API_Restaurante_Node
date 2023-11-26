const express = require('express');
const conn = require('../config/bd.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const md5 = require('md5');
const authConfig = require('../../../../../Downloads/api-rest-nodejs-master/api-rest-nodejs-master/src/config/auth.json');

const router = express.Router();

function generateTotken(params = {}) {
  return jwt.sign(params, process.env.SECRET, {
    expiresIn: 5000,
  });
}

 
router.post('/cadastrar/funcionario', async (req, res) => {
  const { nome, cargo, email, cpf, telefone, senha, endereco} = req.body;
  const password = md5(senha);

  try {
      conn.query('SELECT * FROM Funcionarios WHERE email = ? || cpf = ?', [email, cpf], function (error, results) {
      console.log(results);
      if (results.length > 0)
      {
       return res.status(400).json({message: 'Funcionário já está cadastrado'});
      }
      conn.query('INSERT INTO enderecos (rua, numero, cidade, estado, cep) VALUES (?, ?, ?, ?, ?)', 
      [endereco.rua, endereco.numero, endereco.cidade, endereco.estado, endereco.cep], 
      function (error, enderecoResult) 
      {
        if (error) 
        {
          return res.status(400).send({ error: 'Erro ao cadastrar funcionario' });
        }
        const enderecoId = enderecoResult.insertId;
        conn.query('INSERT INTO funcionarios (nome, cpf, email, telefone, senha, cargo, endereco_id) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [nome, cpf, email, telefone, password, cargo, enderecoId], 
          function (error, funcionarioResult) 
          {
            const funcionarioId = funcionarioResult.insertId;
            if (error) 
            {
              return res.status(400).send({ error: 'Erro ao cadastrar funcionario' });
            }   
        return res.send({
          funcionarioId, nome, telefone, email, cpf, enderecoId
          });
        });
      });
    });
  } 
  catch (err)
  {
    next(err);
    return res.status(400).send({ error: error.message + 'Registration failed' });
  }  
});

router.post('/login/funcionario', async (req, res) => {
  const { email, senha } = req.body;
  const password = md5(senha);
  try {
    conn.query('SELECT * FROM funcionarios WHERE email = ?', [email], function (error, results) {
      if (error) {
        return res.status(500).send({ error: 'Erro ao consultar funcionario' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'Não existe funcionário cadastrado com esse email'});
      }
      console.log(password);
      console.log(results[0].senha);
      if (password != results[0].senha)
      {
        return res.status(400).json({ message: 'Senha incorreta' });
      }
      const idFuncionario = results[0].id; // Acessar o ID do primeiro resultado (supondo que seja único)

      return res.send({
        idFuncionario,
        token: generateTotken({ id: idFuncionario })
      });
    });
  } catch (err) {
    return res.status(400).send({ error: 'Registration failed' });
  }
});

module.exports = app => app.use('/auth', router);
