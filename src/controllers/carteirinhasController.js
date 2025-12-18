const knex = require('../database');
require('dotenv').config();


module.exports = {
    async listarCarteirinhasPaginado(req, res) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 1000;
            const offset = (page - 1) * limit;

            // total geral
            const [{ total }] = await knex("ueb_sistem.carteirinha_user")
                .count("* as total");

            // dados paginados
            const data = await knex("ueb_sistem.carteirinha_user as c")
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
                .orderBy("c.data_criacao", "desc")
                .limit(limit)
                .offset(offset);

            return res.json({
                statusRequest: true,
                page,
                limit,
                total: Number(total),
                loaded: offset + data.length,
                hasMore: offset + data.length < total,
                data
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao listar carteirinhas."
            });
        }
    }


};
