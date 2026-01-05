const knex = require('../database')

module.exports = {
    async index(req, res) {
        try {
            const results = await knex.select('*').from('areadoaluno.modulos_user').orderBy('id', 'asc');
            return res.json(results);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar vínculos de módulos de usuários' });
        }
    },

    // 🔹 BUSCAR vínculo específico por ID
    async showModulesByUser(req, res) {
        try {
            const { user_id } = req.body;
    
            // 1️⃣ Busca todos os vínculos do usuário
            const vinculos = await knex('areadoaluno.modulos_user')
                .where({ user_id });
    
            if (vinculos.length === 0) {
                return res.json({
                    user_id,
                    modulos: [],
                    message: "Usuário não possui módulos vinculados"
                });
            }
    
            // 2️⃣ Extrai todos os IDs de módulo
            const modulosIds = vinculos.map(v => v.modulo_id);
    
            // 3️⃣ Busca informações completas dos módulos
            const modulosData = await knex('areadoaluno.modulos')
                .whereIn('id', modulosIds)
                .select('id', 'nome', 'descricao', 'modulo');
    
            // 4️⃣ Monta o JSON final
            const response = {
                user_id,
                total_modulos: modulosData.length,
                modulos: modulosData
            };
    
            return res.json(response);
    
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar módulos do usuário' });
        }
    },
    

    // 🔹 CRIAR novo vínculo
    async create(req, res) {
        try {
            const { user_id, modulo_id } = req.body;

            if (!user_id || !modulo_id) {
                return res.status(400).json({ error: 'Campos obrigatórios: user_id e modulo_id' });
            }

            const [id] = await knex('areadoaluno.modulos_user').insert({ user_id, modulo_id });

            return res.status(201).json({ id, message: 'Vínculo criado com sucesso' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao criar vínculo' });
        }
    },

    // 🔹 ATUALIZAR vínculo existente
    async update(req, res) {
        try {
            const { id, user_id, modulo_id } = req.body;

            const vinculo = await knex('areadoaluno.modulos_user').where({ id }).first();

            if (!vinculo) {
                return res.status(404).json({ error: 'Vínculo não encontrado' });
            }

            await knex('areadoaluno.modulos_user')
                .where({ id })
                .update({ user_id, modulo_id });

            return res.json({ message: 'Vínculo atualizado com sucesso' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao atualizar vínculo' });
        }
    },

    // 🔹 DELETAR vínculo
    async delete(req, res) {
        try {
            const { id } = req.params;

            const deleted = await knex('areadoaluno.modulos_user').where({ id }).del();

            if (!deleted) {
                return res.status(404).json({ error: 'Vínculo não encontrado' });
            }

            return res.json({ message: 'Vínculo excluído com sucesso' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao excluir vínculo' });
        }
    },
};
