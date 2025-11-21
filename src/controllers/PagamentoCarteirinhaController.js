const knex = require('../database');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  async criarPedidoCarteirinha(req, res) {
    try {
      const { user_id, customerId, items_produto_id = [] } = req.body;

      // 🔹 Validações iniciais
      if (!user_id || isNaN(user_id)) {
        return res.status(400).json({ sucesso: false, mensagem: "ID do usuário inválido." });
      }

      if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
        return res.status(400).json({ sucesso: false, mensagem: "ID do cliente inválido." });
      }

      if (!Array.isArray(items_produto_id) || items_produto_id.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Nenhum produto informado." });
      }

      // 🔹 Verifica carteirinha do usuário
      const carteirinha = await knex("ueb_sistem.carteirinha_user")
        .where({ user_id })
        .orderBy("id", "desc")
        .first();

      if (!carteirinha) {
        return res.status(400).json({ sucesso: false, mensagem: "Usuário não possui carteirinha cadastrada." });
      }

      // Determina o ano vigente (01/04/AAAA → 31/03/AAAA+1)
      const hoje = new Date();
      const anoAtual = hoje.getMonth() + 1 >= 4 ? hoje.getFullYear() : hoje.getFullYear() - 1;
      const inicioAno = new Date(`${anoAtual}-04-01`);
      const fimAno = new Date(`${anoAtual + 1}-03-31`);

      const validadeCarteirinha = new Date(carteirinha.validade_fim);

      if (validadeCarteirinha < inicioAno || validadeCarteirinha > fimAno) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Carteirinha desatualizada. Atualize para o ano ${anoAtual}.`
        });
      }

      // 🔹 Verifica histórico de pagamentos
      const historicos = await knex("ueb_sistem.pagamentos_historico").where({ user_id });

      for (const produtoId of items_produto_id) {
        const pendente = historicos.find(
          h => h.produto_id === produtoId && h.status === 'pending'
        );
        if (pendente) {
          return res.status(400).json({
            sucesso: false,
            mensagem: `Já existe um pagamento pendente para o produto ${produtoId}.`,
            pagamento_id: pendente.id,
            detalhes: pendente
          });
        }
      }

      // 🔹 Busca os produtos
      const produtos = await knex("ueb_sistem.produtos").whereIn("id", items_produto_id);

      if (produtos.length !== items_produto_id.length) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Um ou mais produtos informados não existem."
        });
      }

      // 🔹 Calcula total e itens
      let totalAmount = 0;
      const items = produtos.map(item => {
        const preco = Math.round(item.preco * 100);
        totalAmount += preco;
        return {
          amount: preco,
          description: item.descricao,
          quantity: 1,
          code: item.id
        };
      });

      if (totalAmount <= 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Valor total inválido." });
      }

      // 🔹 Autenticação com Pagar.me
      const apiKey = process.env.PAGARME_API_KEY;
      const token = Buffer.from(apiKey + ":").toString("base64");

      const data = {
        items,
        payments: [
          {
            payment_method: 'pix',
            pix: { expires_in: 1800 },
            amount: totalAmount
          }
        ],
        customer_id: customerId
      };

      const response = await axios.post("https://api.pagar.me/core/v5/orders", data, {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${token}`
        }
      });

      const pedido = response.data;

      // 🔹 Registra o pagamento no histórico interno
      for (const produto of produtos) {
        await knex("ueb_sistem.pagamentos_historico").insert({
          user_id,
          produto_id: produto.id,
          pagarme_order_id: pedido.id,
          price: produto.preco,
          status: pedido.status || 'pending',
          forma_pagamento: 'pix',
          qr_code: pedido.charges?.[0]?.last_transaction?.qr_code || null,
          qr_code_url: pedido.charges?.[0]?.last_transaction?.qr_code_url || null,
          data_criacao: knex.fn.now()
        });
      }

      // 🔹 Retorna o pedido criado
      return res.status(200).json({
        sucesso: true,
        mensagem: "Pedido criado com sucesso no Pagar.me e registrado no histórico.",
        pedido
      });

    } catch (error) {
      console.error('Erro ao criar pedido:', error.response?.data || error.message);
      return res.status(500).json({
        sucesso: false,
        erro: 'Falha ao criar pedido no Pagar.me',
        detalhes: error.response?.data || error.message
      });
    }
  }
};
