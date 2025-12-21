const knex = require('../database');
require('dotenv').config();


module.exports = {
    async listarCarteirinhasBatch(req, res) {
        try {
            const LIMIT = 1000;
            const { offset = 0 } = req.body;

            const rows = await knex("ueb_sistem.carteirinha_user as c")
                .leftJoin("ueb_sistem.users as u", "u.id", "c.user_id")
                .select(
                    "u.name as nome",
                    "u.cpf",
                    "u.criado_por",
                    "c.digital",
                    "c.fisica",
                    "c.frete",
                    "c.validade",
                    "c.ano",
                    "c.data_criacao",
                    "c.data_atualizacao"
                )
                .orderBy("c.id")
                .limit(LIMIT)
                .offset(offset);

            return res.json({
                statusRequest: true,
                offset,
                batchSize: rows.length,
                hasMore: rows.length === LIMIT,
                data: rows
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao buscar carteirinhas."
            });
        }
    }




};
