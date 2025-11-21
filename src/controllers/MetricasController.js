const knex = require('../database')

module.exports = {
    async index(req, res) {
        try {
            const results = await knex
                .select('data', 'total_logins')
                .from('ueb_sistem.metricas_login_diario')
                .orderBy('data', 'asc');
                console.log(results)
            // Trata o retorno para o dashboard
            const dataFormatada = results.map(row => ({
                data: new Date(row.data).toLocaleDateString('pt-BR'),
                total: row.total_logins
            }));
            console.log(dataFormatada)
            return res.json(dataFormatada);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar métricas de login diário' });
        }
    },
};
