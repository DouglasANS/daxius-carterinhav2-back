const knex = require('../database');
require('dotenv').config();


module.exports = {
    async listarCarteirinhasBatch(req, res) {
        try {
            const LIMIT = 1000;
            const { offset = 0 } = req.body;

            const ultimaCarteirinha = knex("areadoaluno.carteirinha_user")
                .select("user_id")
                .max("ano as ano")
                .groupBy("user_id")
                .as("uc");

            const rows = await knex("areadoaluno.users as u")
                .leftJoin(ultimaCarteirinha, "u.id", "uc.user_id")
                .leftJoin("areadoaluno.carteirinha_user as c", function () {
                    this.on("c.user_id", "=", "u.id")
                        .andOn("c.ano", "=", "uc.ano");
                })
                .select(
                    "u.id as user_id",
                    "u.name as nome",
                    "u.cpf",
                    "u.criado_por",
                    "u.email",

                    "c.digital",
                    "c.fisica",
                    "c.frete",
                    "c.validade",
                    "c.ano",
                    "c.data_criacao",
                    "c.data_atualizacao"
                )
                .orderBy("u.id")      // ORDENA POR USER
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
                message: "Erro ao buscar usuários."
            });
        }
    }






};
