const express = require('express');
const router = express.Router();
const conn = require('../config/bd.js');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);
 
router.post('/cadastrar/cliente', function (req, res) {
  const { nome, telefone, email, cpf_cnpj, endereco } = req.body;
  console.log();
  conn.query('SELECT * FROM  clientes WHERE cpf_cnpj = ?', [cpf_cnpj], function (error, results) {
      if (results.length > 0)
      {
        res.status(400).json({message: 'Cliente já está cadastrado'});
      }
      else
      {
        conn.query('INSERT INTO enderecos (rua, numero, cidade, estado, cep) VALUES (?, ?, ?, ?, ?)', 
        [endereco.rua, endereco.numero, endereco.cidade, endereco.estado, endereco.cep], 
        function (error, enderecoResult) 
        {
          if (error) 
          {
            return res.status(400).json({ error: 'Erro ao cadastrar cliente' });
          }
          const enderecoId = enderecoResult.insertId;
          conn.query('INSERT INTO clientes (nome, telefone, email, cpf_cnpj, endereco_id) VALUES (?, ?, ?, ?, ?)', 
            [nome, telefone, email, cpf_cnpj, enderecoId], 
            function (error, clienteResult) 
            {
              const clienteId = clienteResult.insertId;
              console.log(clienteResult);
              if (error) 
              {;
                return res.status(400).json({ error: 'Erro ao cadastrar cliente' });
              }    
              res.status(200).json({message: 'Cliente cadastrado com sucesso.', clienteId, nome, telefone, email, cpf_cnpj, enderecoId});
            });
        });
      }
   });
});
 
router.post('/cadastrar/fornecedor', function (req, res) {
  const { nome, telefone, email, cpf_cnpj, endereco } = req.body;

  conn.query('SELECT * FROM fornecedores WHERE cpf_cnpj = ?', [cpf_cnpj], function (error, results) {
      if (results.length > 0)
      {
        res.status(500).json({message: 'Fornecedor já está cadastrado!'});
      }
      else
      {
        conn.query('INSERT INTO enderecos (rua, numero, cidade, estado, cep) VALUES (?, ?, ?, ?, ?)', 
        [endereco.rua, endereco.numero, endereco.cidade, endereco.estado, endereco.cep], 
        function (error, enderecoResult) 
        {
          if (error) 
          {
            return res.status(500).json({ error: 'Erro ao cadastrar fornecedor' });
          }
          const enderecoId = enderecoResult.insertId;
          conn.query('INSERT INTO fornecedores (nome, telefone, email, cpf_cnpj, endereco_id) VALUES (?, ?, ?, ?, ?)', 
            [nome, telefone, email, cpf_cnpj, enderecoId], 
            function (error, fornecedorResult) 
            {
              const fornecedorId = fornecedorResult.insertId;
              if (error) 
              {
                return res.status(500).json({ error: 'Erro ao cadastrar fornecedor' });
              }    
              res.status(200).json({message: 'Fornecedor cadastrado com sucesso.', fornecedorId, nome, telefone, email, cpf_cnpj, enderecoId});
            });
        });
      }
   });
});

router.post('/cadastrar/produto', function (req, res) {//inserindo valores
  const { nome, preco, fornecedor_id, quantidade, marca } = req.body;
  conn.query('SELECT * FROM  fornecedores WHERE id = ?', [fornecedor_id], function (error, results) {
    if (results.length == 0)
    {
       return res.status(500).json({message: 'fornecedor inválido, verifique!'});
    }
      conn.query('INSERT INTO produtos (nome, preco, fornecedor_id, quantidade, marca) values (?,?,?,?,?)', [nome, preco, fornecedor_id, quantidade, marca], function (error, results) {
        const produto_id = results.insertId;
        if (error) 
        {
          return res.status(500).json({ error: 'Erro ao cadastrar produto.' });
        }    
       return res.status(200).json({message: 'Produto cadastrado com sucesso.', produto_id, nome, preco, quantidade})
      });
  });
});

router.post('/cadastrar/pedido', function (req, res) {//inserindo valores
  const { cliente_id, itens } = req.body;
  const dataCriacao = retornaHoraFormatada();
  var valor = 0;
    conn.query('SELECT * FROM  clientes WHERE id = ?', [cliente_id], async function (error, results) {
      if (results.length < 1)
      {
        return res.status(400).json({message: 'cliente inválido, verifique!'});
      }
    const valorTotal = await GeraValorTotal(Array.from(itens), valor);
    conn.query('INSERT INTO pedidos (cliente_id, data_criacao, valor_total) VALUES (?, ?, ?)', 
    [cliente_id, dataCriacao, valorTotal], 
    function (error, pedidoResult) 
    {
      if (error) 
      {
        return res.status(400).json({ error: 'Erro ao cadastrar pedido.' + error });
      }
      const pedidoid = pedidoResult.insertId;
 
      ValidaProduto(itens).then(({ produtosExistentes }) => {
        console.log(produtosExistentes)
        if(produtosExistentes.length < 1)
        {
          return res.status(400).json({ error: 'Erro ao cadastrar pedido, produto inválido.' });
        }
        produtosExistentes.forEach(produto => {
      conn.query('Insert into itenspedido (pedido_id, produto_id, quantidade) values(?, ?, ?)', 
        [pedidoid, produto.produto_id, produto.quantidade], 
        function (error, itensPedidoResult) 
        {
          if (error) 
          {
            return res.status(400).json({ error: 'Erro ao cadastrar itens no pedido' });
          }  
        });
      });
    return res.status(200).json({message: 'Pedido criado com sucesso!', pedidoid}); 
    }); 
  });
}); 
}); 

router.post('/adicionar-item', function (req, res) {//alterando valores
  const { id_pedido, itens } = req.body;
    conn.query('SELECT * FROM pedidos WHERE id = ? and fechado = ?', [id_pedido, 0], async function (error, results) {
      if (results.length == 0) {
        return res.status(500).json({message: 'Pedido inválido, verifique!'});
    }
    ValidaProduto(itens).then(async ({ produtosExistentes }) => {
      console.log(produtosExistentes)
      if(produtosExistentes.length < 1)
      {
        return res.status(400).json({ error: 'Erro ao adicionar, produto inválido.' });
      }
      const valor = results[0].valor_total;
      const valorTotal = await GeraValorTotal(Array.from(itens), valor);
      produtosExistentes.forEach(produto => {
      conn.query('Insert into itensPedido (pedido_id, produto_id, quantidade) values(?, ?, ?)',
      [id_pedido, produto.produto_id, produto.quantidade], 
      function (error, results) {
        if (error){
          return res.status(400).json({message: 'Item inserido com sucesso no pedido!'})
        }
        conn.query('UPDATE pedidos set valor_total = ? where id = ?', [valorTotal, id_pedido], function (error, results) {
          if (error) throw error;
          });
          res.status(200).json({message: 'Item adicionado com sucesso!'})
      });
     });
   });
  });
})


router.post('/fechar-pedido', function (req, res) {
  const { id_pedido, pessoasConta } = req.body;
  var teste = pessoasConta;
  conn.query('SELECT * FROM pedidos WHERE id = ? and fechado = ?', [id_pedido, 0], function (error, pedidoResult) {
    if (pedidoResult.length == 0)
    {
      return res.status(400).json({message: 'Pedido inválido, verifique!'});
    }
   if (teste > 4 )   
    {
      return res.status(400).json({message: 'Você não pode dividir a conta para mais de 4 pessoas!'});
    }
    console.log(pessoasConta);
    conn.query('UPDATE pedidos set fechado = ? where id = ?', [1, id_pedido], function (error, results) {
      if (error) return res.status(400).json({message: 'Não foi possível atualizar o pedido'});

      conn.query('SELECT * FROM pedidos WHERE id = ? ', [id_pedido], function (error, resultadoPedido) {
        const resultado = resultadoPedido[0];
        const cliente = resultadoPedido[0].cliente_id;
        const data_criacao = resultadoPedido[0].data_criacao;
        const valor_total = resultadoPedido[0].valor_total;
        const valorPorPessoa = resultadoPedido[0].valor_total / pessoasConta; 
       return res.status(200).json({message: 'Pedido fechado com sucesso!', id_pedido, cliente, data_criacao, valor_total, valorPorPessoa })
     });
      });
  });
})


router.get('/listar-produtos', function (req, res) {
   conn.query('SELECT * FROM produtos', 
        function (err, results, fields  ) { 
            res.status(200).json(results)
 })  
})

router.get('/listar-pedidos', function (req, res) {
  conn.query('SELECT * FROM pedidos where fechado <> 1', 
       function (err, results, fields  ) { 
           res.status(200).json(results)
  })  
})

router.get('/listar-clientes', function (req, res) {
  const query = `
  SELECT enderecos.*, clientes.*
  FROM clientes
  JOIN enderecos ON clientes.endereco_id = enderecos.id
`;

conn.query(query, function (err, results, fields) {
  if (err) {
    return res.status(500).json({ error: err.message });
  }

  res.status(200).json(results);
});
});

router.get('/listar-fornecedores', function (req, res) {
  const query = `
  SELECT enderecos.*, fornecedores.*
  FROM fornecedores
  JOIN enderecos ON fornecedores.endereco_id = enderecos.id
`;

conn.query(query, function (err, results, fields) {
  if (err) {
    return res.status(500).json({ error: err.message });
  }

  res.status(200).json(results);
});
})

router.get('/listar-funcionarios', function (req, res) {
  conn.query('SELECT * FROM funcionarios', 
       function (err, results, fields  ) { 
           res.status(200).json(results)
  })  
})

router.get('/listar-produto/:id', function (req, res) {
  const produtoId = req.params.id;

  conn.query(`SELECT * FROM produtos WHERE id = ${produtoId}`, 
    function (err, results, fields) { 
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json(results);
    });
})

router.get('/listar-pedido/:id', function (req, res) {
  const pedidoId = req.params.id;

  conn.query(
    `
    SELECT 
    p.id as numero_pedido,
    p.cliente_id,
    c.nome as nomeCliente,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'produto_id', i.produto_id,
        'nomeProduto', pr.nome,
        'quantidade', i.quantidade
      )
    ) as itens
  FROM 
    pedidos p
  JOIN 
    clientes c ON p.cliente_id = c.id
  LEFT JOIN 
    itenspedido i ON p.id = i.pedido_id
  LEFT JOIN 
    produtos pr ON i.produto_id = pr.id
  WHERE 
    p.id = ? AND p.fechado <> 1
  GROUP BY
    p.id, p.cliente_id;
  
    `,
    [pedidoId, pedidoId],
    function (err, results, fields) { 
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json(results);
    }
  );
});


router.get('/listar-cliente/:id', function (req, res) {
  const clienteId = req.params.id;

  conn.query(`SELECT * FROM clientes WHERE id = ${clienteId}`, 
    function (err, results, fields) { 
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json(results);
    });
})

router.get('/listar-fornecedor/:id', function (req, res) {
  const fornecedorId = req.params.id;

  conn.query(`SELECT * FROM fornecedores WHERE id = ${fornecedorId}`, 
    function (err, results, fields) { 
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json(results);
    });
})


router.get('/listar-funcionario/:id', function (req, res) {
  const funcionarioId = req.params.id;

  conn.query(`SELECT * FROM funcionarios WHERE id = ${funcionarioId}`, 
    function (err, results, fields) { 
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json(results);
    });
})

router.get('/relatorio-cozinha', function (req, res) {

  const sql = `
  SELECT 
    PE.id as id_pedido,
    P.nome as produto,
    IP.quantidade as quantidade_consumida,
    C.nome as cliente,
    P.preco as preco_unitario,
    IP.quantidade * P.preco as valor_total_item,
    F.nome as fornecedor
  FROM ItensPedido IP
  JOIN Produtos P ON IP.produto_id = P.id
  JOIN Pedidos PE ON IP.pedido_id = PE.id
  JOIN Clientes C ON PE.cliente_id = C.id
  JOIN Fornecedores F ON P.fornecedor_id = F.id;
`;

  conn.query(sql, 
        function (err, results, fields  ) {     
            const produtosAgrupados = results.reduce((acc, row) => {
                const { id_pedido, produto, quantidade_consumida, preco_unitario, valor_total_item, fornecedor, cliente } = row;
                if (!acc[id_pedido]) {
                    acc[id_pedido] = { produtos: [], valor_total_pedido: 0 };
                }
                acc[id_pedido].cliente  = cliente;
                acc[id_pedido].produtos.push({ produto, quantidade_consumida, preco_unitario, valor_total_item, fornecedor });
                acc[id_pedido].valor_total_pedido = valor_total_item * acc[id_pedido].produtos.length;
                return acc;
            }, {});
            const respostaFinal = Object.keys(produtosAgrupados).map(id_pedido => ({
                id_pedido: parseInt(id_pedido),
                cliente: produtosAgrupados[id_pedido].cliente,
                produtos: produtosAgrupados[id_pedido].produtos,
                valor_total_pedido: parseFloat(produtosAgrupados[id_pedido].valor_total_pedido).toFixed(2)
            }));

            res.status(200).json(respostaFinal);
        });    
});


router.delete('/excluir-produto-pedido/:idpedido/:idproduto', async function (req, res) {
  const id_pedido = req.params.idpedido;
  const id_produto = req.params.idproduto;
  var pedido = await ValidaObjeto(id_pedido, "pedidos");
  if (pedido == undefined)
  {
    return res.status(500).json({message: 'Pedido inválido, verifique!'});
  }
  var produto = await ValidaObjetoItemPedido(id_produto, id_pedido, "ItensPedido");
  if (produto == undefined)
  {
    return res.status(500).json({message: 'Produto inválido, verifique!'});
  }
  conn.query('DELETE FROM itensPedido WHERE pedido_id = ? and produto_id = ?', [id_pedido, id_produto], function (error, results) {
    if (error) throw error;
    res.status(200).json(produto)
  });
})


router.delete('/excluir-pedido/:id', async function (req, res) {
  const id_pedido = req.params.id;
  conn.query('SELECT * FROM pedidos WHERE id = ? and fechado = ?', [id_pedido, 0], 
  function (error, results){
    if (results.length == 0) {
      return res.status(400).json({message: 'Pedido inválido, verifique!'});
  }
  
  conn.query('DELETE FROM pedidos WHERE id=?', [id_pedido], function (error, results) {
    if (error) throw error;
  });
  res.status(200).json(results)
  });
})



router.put('/alterar-produto', async function (req, res) {
  const { id_produto, nome, preco, fornecedor_id, quantidade, marca } = req.body;
  conn.query('SELECT * FROM  fornecedores WHERE id = ?', [fornecedor_id], function (error, results) {
        if (results.length == 0)
        {
          return res.status(500).json({message: 'fornecedor inválido, verifique!'});
        }
        conn.query('SELECT * FROM  produtos WHERE id = ?', [id_produto], function (error, results) {
          if (results.length == 0)
          {
            return res.status(500).json({message: 'Produto selecionado é inválido, verifique!'});
          }
      conn.query('UPDATE produtos set nome = ?, preco = ?,  fornecedor_id = ?, quantidade = ? , marca = ? where id = ?', [nome, preco, fornecedor_id, quantidade, marca, id_produto], function (error, results2) {
        if (error) throw error;
        });
        res.status(200).json({message: 'Produto alterado com sucesso!'})  
    });
    });
})

router.put('/alterar-cliente', async function (req, res) {
  const { id_cliente, nome, email, telefone, endereco } = req.body;
  conn.query('SELECT * FROM  clientes WHERE id = ?', [id_cliente], function (error, resultsCliente) {
        if (resultsCliente.length == 0)
        {
          return res.status(500).json({message: 'Cliente inválido, verifique!'});
        }
        conn.query('UPDATE Enderecos set rua = ?, numero = ?,  cidade = ?, estado = ? , cep = ? where id = ?', [endereco.rua, endereco.numero, endereco.cidade, endereco.estado, endereco.cep, resultsCliente.enderecoId], function (error, results2) {
          if (error) throw error;
          });
      conn.query('UPDATE clientes set nome = ?, email = ?, telefone = ? where id = ?', [nome, email, telefone, id_cliente], function (error, results2) {
        if (error) throw error;
        });
        res.status(200).json({message: 'Cliente alterado com sucesso!'})  
    });
})

router.put('/alterar-fornecedor', async function (req, res) {
  const { id_fornecedor, nome, email, telefone, endereco } = req.body;
  conn.query('SELECT * FROM  fornecedores WHERE id = ?', [id_fornecedor], function (error, resultsCliente) {
        if (resultsCliente.length == 0)
        {
          return res.status(500).json({message: 'Cliente inválido, verifique!'});
        }
        conn.query('UPDATE Enderecos set rua = ?, numero = ?,  cidade = ?, estado = ? , cep = ? where id = ?', [endereco.rua, endereco.numero, endereco.cidade, endereco.estado, endereco.cep, resultsCliente.enderecoId], function (error, results2) {
          if (error) throw error;
          });
      conn.query('UPDATE fornecedores set nome = ?, email = ?, telefone = ? where id = ?', [nome, email, telefone, id_fornecedor], function (error, results2) {
        if (error) throw error;
        });
        res.status(200).json({message: 'Fornecedor alterado com sucesso!'})  
    });
})





function ValidaObjeto(id, tabela) {
  return new Promise((resolve, reject) => {
    conn.query(`SELECT * FROM ${tabela} Where id = ${id}`, function (err, results, fields) 
    {
      if (err) reject(err);
      resolve(results[0]);  
    });
  });
}

function ValidaObjetoItemPedido(idProduto, idPedido, tabela) {
  return new Promise((resolve, reject) => {
    conn.query(`SELECT * FROM ${tabela} Where produto_id = ${idProduto} and pedido_id = ${idPedido}`, function (err, results, fields) 
    {
      if (err) {
        console.error("Erro na consulta SQL:", err);
        reject(err);
      } else {
        console.log("Resultados da consulta:", results);
        resolve(results[0]);  
      }
    });
  });
}

function ValidaProduto(itens) {
  return new Promise((resolve, reject) => {
    const produtosExistentes = [];
    const produtosNaoExistentes = [];
    itens.forEach(item => {
      const id = item.produto_id;
      conn.query(`SELECT * FROM produtos WHERE id = ${id}`, function (err, results, fields) {
        if (err) reject(err);
        if (results.length > 0) {
          produtosExistentes.push(item);
        } else {
          produtosNaoExistentes.push(item);
        }
        if (itens.indexOf(item) === itens.length - 1) {
          resolve({ produtosExistentes });
        }
      });
    });
  });
}


async function GeraValorTotal(itens, valor) {
  for (const item of itens) {
    try {
      const produto = await ValidaObjeto(item.produto_id, "produtos");
      if (produto && produto.preco) 
      {
        const preco = produto.preco;
        const quantidade = item.quantidade;
        valor += quantidade * preco;
      }  
    } catch (error) {
      console.error(error);
    }
  }
  return valor;
}

function retornaHoraFormatada()
{
  const agora = new Date(); 
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');
  const segundo = String(agora.getSeconds()).padStart(2, '0');

  return dataHoraFormatada = `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;

}

module.exports = app => app.use('/projects', router);
