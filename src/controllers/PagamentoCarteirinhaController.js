const knex = require('../database');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  async criarPedidoCarteirinha(req, res) {
    try {
      const { user_id, customerId, produto_id } = req.body;

      // 🔹 Validações iniciais
      if (!user_id || isNaN(user_id)) {
        return res.status(400).json({ sucesso: false, mensagem: "ID do usuário inválido." });
      }

      if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
        return res.status(400).json({ sucesso: false, mensagem: "ID do cliente inválido." });
      }

      if (!produto_id || isNaN(produto_id)) {
        return res.status(400).json({ sucesso: false, mensagem: "Produto inválido." });
      }

      // 🔹 Verifica carteirinha do usuário
      const carteirinha = await knex("ueb_sistem.carteirinha_user")
        .where({ user_id })
        .orderBy("id", "desc")
        .first();

      if (!carteirinha) {
        return res.status(400).json({ sucesso: false, mensagem: "Usuário não possui carteirinha cadastrada." });
      }

      // Determina o ano vigente
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

      // 🔹 Verifica histórico de pagamento PENDENTE para o MESMO produto
      const pendente = await knex("ueb_sistem.pagamentos_historico")
        .where({ user_id, produto_id, status: "pending" })
        .first();

      if (pendente) {
        return res.status(200).json({
          sucesso: false,
          mensagem: "Já existe um pagamento pendente para este produto.",
          pagamento_id: pendente.id,
          detalhes: pendente
        });
      }

      // 🔹 Buscar produto
      const produto = await knex("ueb_sistem.produtos")
        .where({ id: produto_id })
        .first();

      if (!produto) {
        return res.status(400).json({ sucesso: false, mensagem: "Produto não encontrado." });
      }

      const precoCentavos = Math.round(produto.preco * 100);

      // 🔹 Autenticação com Pagar.me
      const apiKey = process.env.PAGARME_API_KEY;
      const token = Buffer.from(apiKey + ":").toString("base64");

      const data = {
        items: [
          {
            amount: precoCentavos,
            description: produto.nome,
            quantity: 1,
            code: produto.id
          }
        ],
        payments: [
          {
            payment_method: 'pix',
            pix: { expires_in: 1800 },
            amount: precoCentavos
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
      console.log(pedido)
      console.log('pedido - - -- - -', pedido.charges?.[0]?.last_transaction)

      // 🔹 Inserir UM registro no histórico
      await knex("ueb_sistem.pagamentos_historico").insert({
        user_id,
        produto_id,
        pagarme_order_id: pedido.id,
        price: produto.preco,
        status: pedido.status || 'pending',
        forma_pagamento: 'pix',
        qr_code: pedido.charges?.[0]?.last_transaction?.qr_code || null,
        qr_code_url: pedido.charges?.[0]?.last_transaction?.qr_code_url || null,
        data_criacao: knex.fn.now(),
        data_atualizacao: knex.fn.now(),
        expires_at_pagarme: pedido.charges?.[0]?.last_transaction?.expires_at,
        created_at_pagarme: pedido.charges?.[0]?.last_transaction?.created_at,
        updated_at_pagarme: pedido.charges?.[0]?.last_transaction?.updated_at,
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: "Pedido criado com sucesso.",
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
