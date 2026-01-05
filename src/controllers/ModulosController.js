const knex = require('../database')

module.exports = {
    async index(req, res) {
        try {
            const results = await knex.select('*').from('areadoaluno.modulos').orderBy('id', 'asc');
            return res.json(results);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar módulos' });
        }
    },

    // 🔹 BUSCAR módulo por ID
    async show(req, res) {
        try {
            const { id } = req.params;
            const modulo = await knex('areadoaluno.modulos').where({ id }).first();

            if (!modulo) {
                return res.status(404).json({ error: 'Módulo não encontrado' });
            }

            return res.json(modulo);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar módulo' });
        }
    },

    // 🔹 CRIAR novo módulo
    async create(req, res) {
        try {
            const { nome, descricao, modulo } = req.body;

            if (!nome) {
                return res.status(400).json({ error: 'O campo nome é obrigatório' });
            }
            if (!modulo) {
                return res.status(400).json({ error: 'O campo módulo é obrigatório' });
            }

            const [id] = await knex('areadoaluno.modulos').insert({ nome, descricao, modulo });

            return res.status(201).json({ id, message: 'Módulo criado com sucesso' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao criar módulo' });
        }
    },

    // 🔹 ATUALIZAR módulo existente
    async update(req, res) {
        try {
            const { id, nome, descricao, modulo } = req.body;

            const moduloData = await knex('areadoaluno.modulos').where({ id }).first();

            if (!moduloData) {
                return res.status(404).json({ error: 'Módulo não encontrado' });
            }

            await knex('areadoaluno.modulos')
                .where({ id })
                .update({
                    nome,
                    descricao,
                    modulo,
                    data_atualizacao: knex.fn.now()
                });

            return res.json({ message: 'Módulo atualizado com sucesso' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao atualizar módulo' });
        }
    },

    // 🔹 DELETAR módulo
    async delete(req, res) {
        try {
            const { id } = req.params;

            const deleted = await knex('areadoaluno.modulos').where({ id }).del();

            if (!deleted) {
                return res.status(404).json({ error: 'Módulo não encontrado' });
            }

            return res.json({ message: 'Módulo excluído com sucesso' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao excluir módulo' });
        }
    }
};
