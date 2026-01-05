const knex = require('../database')

module.exports = {
    async registrosPorMes(req, res, next) {
        try {
            const dados = await knex('areadoaluno.metricas_registro_carteirinha')
                .select(
                    knex.raw('YEAR(data_cadastro) AS ano'),
                    knex.raw('MONTH(data_cadastro) AS mes'),
                    knex.raw('COUNT(*) AS total')
                )
                .groupByRaw('YEAR(data_cadastro), MONTH(data_cadastro)')
                .orderBy('ano', 'asc')
                .orderBy('mes', 'asc');

            const organizado = {};

            dados.forEach(({ ano, mes, total }) => {
                if (!organizado[ano]) {
                    organizado[ano] = {};
                }
                organizado[ano][mes] = total;
            });

            res.json({ data: organizado });

        } catch (err) {
            next(err);
        }
    }
    ,

    async registrosPorFuncionario(req, res, next) {
        try {

            // 1️⃣ Métricas agregadas (SEM JOIN)
            const metricas = await knex
                .from(
                    knex('areadoaluno.metricas_registro_carteirinha')
                        .select(
                            knex.raw('YEAR(data_cadastro) AS ano'),
                            'id_funcionario'
                        )
                        .as('base')
                )
                .select('ano', 'id_funcionario')
                .count('* as total')
                .groupBy('ano', 'id_funcionario')
                .orderBy('ano', 'asc');

            // 2️⃣ Funcionários válidos
            const funcionarios = await knex('areadoaluno.users')
                .select('id', 'name')
                .whereIn('role', ['adm', 'funcionario'])

            // 3️⃣ Mapa id → nome
            const funcionariosMap = {};
            funcionarios.forEach(f => {
                funcionariosMap[f.id] = f.name;
            });

            // 4️⃣ Estrutura final
            const resultado = {};

            metricas.forEach(({ ano, id_funcionario, total }) => {
                // ignora métricas de usuários fora do filtro
                if (!funcionariosMap[id_funcionario]) return;

                if (!resultado[ano]) {
                    resultado[ano] = {};
                }

                resultado[ano][funcionariosMap[id_funcionario]] = Number(total);
            });

            return res.json({
                data: resultado
            });

        } catch (err) {
            next(err);
        }
    }



    ,
    async registrosPorAno(req, res, next) {
        try {
            const dados = await knex('areadoaluno.metricas_registro_carteirinha')
                .select('ano')
                .count('* as total')
                .groupBy('ano');

            res.json(
                dados.map(d => ({
                    name: d.ano,
                    value: d.total
                }))
            );

        } catch (err) {
            next(err);
        }
    },
    async registrosPorDiaFuncionario(req, res, next) {
        try {
            // Versão corrigida
            const metricas = await knex('areadoaluno.metricas_registro_carteirinha as m')
                .select(
                    knex.raw('DATE(m.data_cadastro) as data'),
                    'm.id_funcionario',
                    knex.raw('COUNT(*) as total')
                )
                .groupByRaw('DATE(m.data_cadastro), m.id_funcionario')
                .orderBy('data', 'asc');

            const funcionarios = await knex('areadoaluno.users')
                .select('id', 'name')
                .whereIn('role', ['adm', 'funcionario']);

            const funcionariosMap = {};
            funcionarios.forEach(f => {
                funcionariosMap[f.id] = f.name;
            });

            // Estruturar resultado
            const resultado = {};

            metricas.forEach(({ data, id_funcionario, total }) => {
                if (!funcionariosMap[id_funcionario]) return;

                // Converter data para string de forma segura
                let dataStr;
                if (data instanceof Date) {
                    dataStr = data.toISOString().split('T')[0];
                } else if (typeof data === 'string') {
                    dataStr = data.split('T')[0]; // Remove a parte do tempo se existir
                } else {
                    // Se for outro formato, tenta converter
                    dataStr = new Date(data).toISOString().split('T')[0];
                }

                const [ano, mes, dia] = dataStr.split('-');

                if (!resultado[ano]) resultado[ano] = {};
                if (!resultado[ano][mes]) resultado[ano][mes] = {};
                if (!resultado[ano][mes][dia]) resultado[ano][mes][dia] = {};

                resultado[ano][mes][dia][funcionariosMap[id_funcionario]] = Number(total);
            });

            res.json({ data: resultado });

        } catch (err) {
            next(err);
        }
    }


};
