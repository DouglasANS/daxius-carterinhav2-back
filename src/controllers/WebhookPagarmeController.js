const knex = require('../database');

module.exports = {
  async pagarmeWebhookStatusPix(req, res) {
    try {
      const payload = req.body;
      console.log('1', req.body);

      // 🔹 Extrai dados do webhook
      const orderId = payload.data?.id || payload.order_id;
      const status = payload.data?.status || payload.payment_status;

      if (!orderId || !status) {
        return res.status(400).json({ sucesso: false, mensagem: "Dados inválidos no webhook." });
      }

      console.log('2', { orderId, status });

      // 🔹 Busca pagamentos no histórico
      const pagamentos = await knex("ueb_sistem.pagamentos_historico")
        .where({ pagarme_order_id: orderId });

      if (!pagamentos || pagamentos.length === 0) {
        return res.status(404).json({ sucesso: false, mensagem: "Pedido não encontrado no histórico." });
      }

      console.log('3', pagamentos);

      // 🔹 Atualiza status do pagamento
      await knex("ueb_sistem.pagamentos_historico")
        .where({ pagarme_order_id: orderId })
        .update({ status: status, data_atualizacao: knex.fn.now() });

      console.log('4 - pagamentos atualizado');

      // 🔹 Atualiza status da carteirinha (somente pending ou expirado)
      for (const pagamento of pagamentos) {
        const carteirinha = await knex("ueb_sistem.carteirinha_user")
          .where({ user_id: pagamento.user_id })
          .orderBy("id", "desc")
          .first();

        console.log('5 - carteirinha encontrada', carteirinha);

        if (carteirinha && (carteirinha.status === 'pending' || carteirinha.status === 'expirado' || carteirinha.status === null)) {
          // Atualiza somente a carteirinha específica
          if (status === 'paid') {
            await knex("ueb_sistem.carteirinha_user")
              .where({ id: carteirinha.id })  // ✅ aqui usamos o id
              .update({ status: 'paid', data_atualizacao: knex.fn.now() });

            console.log('6 - carteirinha atualizada para concluido');
          }
        }
      }

      return res.json({ sucesso: true, mensagem: "Webhook processado com sucesso." });

    } catch (error) {
      console.error("Erro no webhook do Pagar.me:", error);
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },
};
