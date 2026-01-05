const knex = require('../database')

module.exports = {

    async getCarteirinhaImagem(req, res) {
        try {
            const { carteirinha_id } = req.body;

            if (!carteirinha_id) {
                return res.status(400).json({ error: "carteirinha_id é obrigatório" });
            }

            // Consulta a imagem
            const result = await knex("areadoaluno.carteira")
                .select("imagem")
                .where({ carteirinha_id: carteirinha_id })
                .first();

            if (!result) {
                return res.status(404).json({ error: "Imagem não encontrada" });
            }

            // Retorna a imagem diretamente
            return res.json({
                image: result.image
            });

        } catch (error) {
            console.error("Erro ao buscar imagem da carteirinha:", error);
            return res.status(500).json({
                error: "Erro ao buscar imagem da carteirinha"
            });
        }
    },

};
