const knex = require('../database')

module.exports = {
    async index(req, res) {
        try {
            const results = await knex('ueb_sistem.produtos')
                .select('*')
                .where('tipo', 'carteirinha') // filtro solicitado
                .orderBy('id', 'asc');

            return res.json(results);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar produtos do tipo carteirinha' });
        }
    },
    async verificarCarteirinha(req, res) {
        try {
            const { user_id, ano } = req.body;

            if (!user_id || !ano) {
                return res.status(400).json({
                    error: "envie user_id e ano"
                });
            }

            // Buscar carteirinha do usuário
            const carteira = await knex('ueb_sistem.carteirinha_user')
                .where({ user_id })
                .orderBy('id', 'desc') // pega a mais recente
                .first();

            // 1️⃣ Se não existir
            if (!carteira) {
                return res.json({
                    statusRequest: false,
                    message: "Nenhuma carteirinha encontrada. Atualize seus dados."
                });
            }

            // 2️⃣ Se existir, mas o ano é diferente
            if (carteira.ano !== ano) {
                return res.json({
                    statusRequest: false,
                    message: `Você já tem uma carteirinha registrada para o ano ${carteira.ano}. Atualize os dados para o ano ${ano}.`
                });
            }

            // 3️⃣ Tudo certo
            return res.json({
                statusRequest: true,
                message: "Tudo certo para continuar."
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Erro ao verificar carteirinha"
            });
        }
    }


};
