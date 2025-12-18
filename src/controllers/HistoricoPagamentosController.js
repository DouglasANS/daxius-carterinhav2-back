const knex = require('../database')

module.exports = {
    async verificarCarteirinha(req, res) {
        try {
            const { user_id, produto_id } = req.body;

            // 1️⃣ Verifica se o produto existe
            const produto = await knex("ueb_sistem.produtos").where({ id: produto_id }).first();
            if (!produto) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O produto informado está com problemas ou não existe."
                });
            }

            // 2️⃣ Verifica se o usuário possui carteirinha
            const carteirinha = await knex("ueb_sistem.carteirinha_user")
                .where({ user_id })
                .orderBy("id", "desc")
                .first();

            if (!carteirinha) {
                return res.json({
                    sucesso: true,
                    etapa: "sem_carteirinha",
                    mensagem: "Usuário ainda não possui carteirinha. Solicitar cadastro.",
                    produto
                });
            }

            // 3️⃣ Verifica a vigência da carteirinha
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();

            const inicioVigencia = new Date(`${anoAtual}-04-01`);
            const fimVigencia = new Date(`${anoAtual + 1}-03-31`);

            const dataEmissao = new Date(carteirinha.validade);
            const dentroVigencia = dataEmissao >= inicioVigencia && dataEmissao <= fimVigencia;

            if (!dentroVigencia) {
                return res.json({
                    sucesso: true,
                    etapa: "fora_vigencia",
                    mensagem: "Carteirinha fora do período de vigência. Atualização necessária.",
                    produto,
                    carteirinha
                });
            }

            // 4️⃣ Tudo certo
            return res.json({
                sucesso: true,
                etapa: "ok",
                mensagem: "Ja existe Carteirinha cadastrada!",
                produto,
                carteirinha
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao verificar informações do usuário."
            });
        }
    },
    async registrarOuAtualizar(req, res) {
        try {
            const {
                user_id,
                produto_id,
                imagem_url,
                // Campos do usuário que podem ser atualizados
                data_nascimento,
                rg,
                // Dados da carteirinha
                instituicao,
                curso,
                nivel_ensino,
                validade,
                cod_uso,
                cod_identificador,
                tipo_carteira,
                ano
            } = req.body;

            // 1️⃣ Verifica se o produto existe
            const produto = await knex("ueb_sistem.produtos").where({ id: produto_id }).first();
            if (!produto) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Produto informado não encontrado ou inativo."
                });
            }

            // 2️⃣ Verifica se o usuário existe
            const usuario = await knex("ueb_sistem.users").where({ id: user_id }).first();
            if (!usuario) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Usuário não encontrado."
                });
            }

            // 3️⃣ Atualiza apenas data_nascimento e rg
            await knex("ueb_sistem.users")
                .where({ id: user_id })
                .update({
                    data_nascimento,
                    rg,
                    data_atualizacao: knex.fn.now()
                });

            // 4️⃣ Verifica se já existe uma carteirinha para o usuário
            const carteirinhaExistente = await knex("ueb_sistem.carteirinha_user")
                .where({ user_id })
                .first();

            let carteirinhaId;

            if (carteirinhaExistente) {
                // Atualiza carteirinha existente
                await knex("ueb_sistem.carteirinha_user")
                    .where({ user_id })
                    .update({
                        instituicao,
                        curso,
                        nivel_ensino,
                        validade,
                        cod_uso,
                        cod_identificador,
                        tipo_carteira,
                        ano,
                        status: "pending", // controla se está paga ou não
                        data_atualizacao: knex.fn.now()
                    });

                carteirinhaId = carteirinhaExistente.id;
            } else {
                // Cria nova carteirinha
                const [novaCarteirinhaId] = await knex("ueb_sistem.carteirinha_user")
                    .insert({
                        user_id,
                        instituicao,
                        curso,
                        nivel_ensino,
                        validade,
                        cod_uso,
                        cod_identificador,
                        tipo_carteira,
                        ano,
                        status: "pending",
                        data_criacao: knex.fn.now()
                    });

                carteirinhaId = novaCarteirinhaId;
            }

            // 5️⃣ Insere ou substitui a imagem da carteirinha
            const imagemExistente = await knex("ueb_sistem.carteirinha_image")
                .where({ user_id })
                .first();

            if (imagemExistente) {
                await knex("ueb_sistem.carteirinha_image")
                    .where({ user_id })
                    .update({
                        image: imagem_url,
                        data_atualizacao: knex.fn.now()
                    });
            } else {
                await knex("ueb_sistem.carteirinha_image")
                    .insert({
                        user_id,
                        image: imagem_url,
                        data_criacao: knex.fn.now()
                    });
            }

            // 6️⃣ Cria registro no histórico de pagamento
            await knex("ueb_sistem.pagamentos_historico").insert({
                user_id,
                produto_id,
                price: produto.preco,
                forma_pagamento: "pix",
                status: "pending",
                carteirinha_id: carteirinhaId,
                data_criacao: knex.fn.now()
            });

            return res.json({
                sucesso: true,
                mensagem: "Carteirinha e informações do usuário atualizadas com sucesso.",
                carteirinha_id: carteirinhaId
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao registrar ou atualizar carteirinha."
            });
        }
    },
    async listarTransacoes(req, res) {
        try {
            const { user_id } = req.body;

            if (!user_id) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "É necessário informar o user_id."
                });
            }

            // Busca todas as transações do usuário
            const transacoes = await knex("ueb_sistem.pagamentos_historico as ph")
                .leftJoin("ueb_sistem.produtos as p", "ph.produto_id", "p.id")
                .leftJoin("ueb_sistem.carteirinha_user as c", "ph.carteirinha_id", "c.id")
                .select(
                    "ph.id",
                    "ph.user_id",
                    "ph.produto_id",
                    "ph.pagarme_order_id",
                    "ph.qr_code",
                    "ph.qr_code_url",
                    "ph.created_at_pagarme",
                    "ph.expires_at_pagarme",
                    "ph.updated_at_pagarme",
                    "p.nome as produto_nome",
                    "p.preco as produto_preco",
                    "ph.price",
                    "ph.forma_pagamento",
                    "ph.status",
                    "ph.data_criacao",
                    "ph.data_confirmacao",
                    "ph.carteirinha_id",
                    "c.instituicao",
                    "c.curso",
                    "c.tipo_carteira",
                    "c.ano"
                )
                .where("ph.user_id", user_id)
                .orderBy("ph.data_criacao", "desc");

            console.log('transacoes====', transacoes)

            return res.json({
                sucesso: true,
                transacoes
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao buscar transações do usuário."
            });
        }
    },
    async atualizarTransacaoExpirada(req, res) {
        try {
            const { id } = req.body; // id da pagamentos_historico

            const result = await knex('ueb_sistem.pagamentos_historico')
                .where('id', id)
                .update({
                    status: "expired",
                    data_atualizacao: knex.fn.now()
                });

            return res.json({ ok: true, updated: result });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: 'Erro ao atualizar status da transação para expired'
            });
        }
    }

    ,
    async verificarPermissaoCarteirinha(req, res) {
        try {

            const { user_id } = req.body;

            if (!user_id) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "Envie o user_id."
                });
            }

            // 2️⃣ Buscar dados do usuário
            const usuario = await knex("ueb_sistem.users")
                .select("name", "data_nascimento", "cpf", "rg")
                .where("id", user_id)
                .first();

            if (!usuario) {
                return res.json({
                    statusRequest: false,
                    message: "Usuário não encontrado."
                });
            }

            // 4️⃣ Buscar dados da carteirinha
            const carteirinha = await knex("ueb_sistem.carteirinha_user") // Atualizado
                .select(
                    "id",
                    "instituicao",
                    "curso",
                    "nivel_ensino",
                    "validade",
                    "cod_identificador",
                    "cod_uso",
                    "ano",
                    "approved",
                )
                .where("user_id", user_id)
                .orderBy("ano", "desc")
                .first(); // pega a mais recente

            if (!carteirinha) {
                return res.json({
                    statusRequest: false,
                    message: "Nenhuma carteirinha cadastrada para esse usuário."
                });
            }

            console.log("ANO RECEBIDO:", carteirinha?.ano);
            console.log(typeof carteirinha?.ano);

            function isCarteirinhaValida(carteirinha) {
                if (!carteirinha?.ano) return false;

                const ano = Number(carteirinha.ano);
                const hoje = new Date();

                // Nova regra: 01/01/ano até 31/03/(ano + 1)
                const inicio = new Date(ano, 0, 1);      // 01/01/ano
                const fim = new Date(ano + 1, 2, 31);    // 31/03/(ano + 1)

                const valido = hoje >= inicio && hoje <= fim;

                return valido;
            }




            if (isCarteirinhaValida(carteirinha)) {
                console.log("Carteirinha válida");
            } else {
                console.log("Carteirinha vencida");
                return res.json({
                    statusRequest: false,
                    message: "A carteirinha venceu! Faça sua renovação."
                });
            }
            console.log(carteirinha)

            if (carteirinha?.approved == 0) {
                return res.json({
                    statusRequest: false,
                    message: "Verificação de carteirinha pendente!"
                });
            }

            // 3️⃣ Buscar imagem da carteirinha
            const imagem = await knex("ueb_sistem.carteirinha_image")
                .select("image")
                .where({ user_id, carteirinha_id: carteirinha.id })
                .first();

            // 5️⃣ Retornar tudo junto
            return res.json({
                statusRequest: true,
                message: "Acesso liberado.",
                carteirinha: {
                    carteirinhaId: carteirinha.id,
                    codigoUso: carteirinha.cod_uso,
                    cpf: usuario.cpf,
                    dataNascimento: usuario.data_nascimento,
                    escolaridade: carteirinha.nivel_ensino || null,
                    nome: usuario.name,
                    curso: carteirinha.curso,
                    rg: usuario.rg || null,
                    validadeCarteirinha: carteirinha.validade,
                    imagem: imagem?.image || null,
                    email: usuario.email,
                    instituicao: carteirinha.instituicao,
                    ano: carteirinha.ano,
                }
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao verificar permissão da carteirinha."
            });
        }
    },

    async listarHistoricoPagamentos(req, res) {
        try {
            const { user_id } = req.body;

            if (!user_id) {
                return res.status(400).json({
                    error: "O campo user_id é obrigatório."
                });
            }

            // 1️⃣ Busca os pagamentos
            const historico = await knex("ueb_sistem.pagamentos_historico")
                .where({ user_id })
                .orderBy("id", "desc");

            // 2️⃣ Monta lista com dados do produto
            const historicoComProduto = await Promise.all(
                historico.map(async (item) => {
                    let produto = null;

                    if (item.produto_id) {
                        produto = await knex("ueb_sistem.produtos")
                            .where({ id: item.produto_id })
                            .first();
                    }

                    return {
                        ...item,
                        produto: produto
                            ? {
                                id: produto.id,
                                nome: produto.nome,
                                descricao: produto.descricao,
                                preco: produto.preco,
                                tipo: produto.tipo,
                                layout: produto.layout,
                                ano: produto.ano,
                                fisica: produto.fisica,
                                digital: produto.digital,
                                frete: produto.frete
                            }
                            : {
                                id: null,
                                nome: "Produto não encontrado",
                                descricao: null,
                                preco: null,
                                tipo: null
                            }
                    };
                })
            );

            return res.status(200).json({
                total: historicoComProduto.length,
                historico: historicoComProduto
            });

        } catch (error) {
            console.error("Erro ao listar histórico de pagamentos:", error);
            return res.status(500).json({
                error: "Erro interno ao buscar histórico de pagamentos."
            });
        }
    }



};
