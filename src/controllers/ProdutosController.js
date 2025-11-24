const knex = require('../database')

module.exports = {
    async index(req, res) {
        try {
            const results = await knex('ueb_sistem.produtos')
                .select('*')
                .where({ tipo: 'carteirinha', ativo: 1 }) // 👈 agora filtra só ativos
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
    },
    async cadastrarCarteirinha(req, res) {
        try {
            const {
                user_id,
                instituicao,
                curso,
                nivel_ensino,
                criadoPor_id,
                ano,
                cod_identificador = '7A137F5',
                tipo_carteira,
                image, // <- imagem base64 ou URL enviada pelo front
            } = req.body;

            async function gerarCodUsoUnico() {
                const gerarTextoAleatorio = (tamanho = 7) => {
                    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let resultado = '';
                    for (let i = 0; i < tamanho; i++) {
                        const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
                        resultado += caracteres[indiceAleatorio];
                    }
                    return resultado;
                };

                let codigo;
                let existe = true;

                while (existe) {
                    codigo = gerarTextoAleatorio();

                    const encontrado = await knex("ueb_sistem.carteirinha_user")
                        .where("cod_uso", codigo)
                        .first();

                    existe = !!encontrado;
                }

                return codigo;
            }

            // 1️⃣ Verificação dos campos obrigatórios
            if (!user_id || !instituicao || !nivel_ensino || !ano) {
                return res.status(400).json({
                    error: "Campos obrigatórios: user_id, instituicao, nivel_ensino, ano"
                });
            }

            // 2️⃣ Verificar se já existe carteirinha para esse user no ano
            const carteiraExistente = await knex('ueb_sistem.carteirinha_user')
                .where({ user_id, ano })
                .first();

            if (carteiraExistente) {
                return res.json({
                    statusRequest: false,
                    message: `Já existe uma carteirinha cadastrada para o ano ${ano}.`
                });
            }

            // 3️⃣ Calcular validade automaticamente
            const validade = `${Number(ano) + 1}-03-31`;

            // 4️⃣ Preparar dados para inserir
            const novaCarteirinha = {
                user_id,
                instituicao,
                curso: curso || null,
                nivel_ensino,
                validade,
                cod_uso: await gerarCodUsoUnico() || null,
                cod_identificador: cod_identificador || null,
                tipo_carteira: tipo_carteira || null,
                criadoPor_id: criadoPor_id || null,
                ano,
                status: null,
                editavel: 1
            };

            // 5️⃣ Inserir a carteirinha
            const [idCriado] = await knex('ueb_sistem.carteirinha_user')
                .insert(novaCarteirinha);

            // 6️⃣ Inserir a imagem na tabela "carteirinha_image"
            if (image) {
                await knex("ueb_sistem.carteirinha_image").insert({
                    user_id: user_id,
                    image: image, // base64, blob ou URL — do jeito que vier do front
                });
            }

            return res.json({
                statusRequest: true,
                message: "Carteirinha cadastrada com sucesso.",
                id: idCriado
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Erro ao cadastrar carteirinha"
            });
        }
    }





};
