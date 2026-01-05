const knex = require('../database')

module.exports = {
    async index(req, res) {
        try {

            const config = await knex("areadoaluno.current_carteirinha")
                .where({ id: 1 })
                .first();

            const anoAtual = config?.ano || 2025;

            const results = await knex('areadoaluno.produtos')
                .select('*')
                .where({ tipo: 'carteirinha', ativo: 1, ano: anoAtual }) // 👈 agora filtra só ativos
                .orderBy('id', 'asc');

            return res.json(results);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar produtos do tipo carteirinha' });
        }
    },

    async verificarCarteirinha(req, res) {
        try {
            const { user_id } = req.body;

            // Buscar o ano atual da configuração
            const config = await knex("areadoaluno.current_carteirinha")
                .where({ id: 1 })
                .first();

            const anoAtual = config?.ano || 2025;

            if (!user_id || !anoAtual) {
                return res.status(400).json({
                    error: "envie user_id e ano"
                });
            }

            // Buscar carteirinha do ano atual (mais recente)
            const carteiraAnoAtual = await knex("areadoaluno.carteirinha_user")
                .where({ user_id, ano: anoAtual })
                .orderBy("id", "desc")
                .first();

            // 1️⃣ NÃO existe carteirinha do ano atual
            if (!carteiraAnoAtual) {
                return res.json({
                    statusRequest: false,
                    message: `Nenhuma carteirinha encontrada para o ano ${anoAtual}. Atualize seus dados.`,
                    temEndereco: false,
                    temCarteirinha: false,
                    data: null
                });
            }

            // 2️⃣ Procurar endereço de entrega para esta carteirinha
            const enderecoEntrega = await knex("areadoaluno.carteirinha_endereco")
                .where({ carteirinha_id: carteiraAnoAtual.id })
                .first();

            // 2.1️⃣ Carteirinha existe mas NÃO tem endereço cadastrado
            if (!enderecoEntrega) {
                return res.json({
                    statusRequest: true,
                    message: "Carteirinha encontrada, mas o endereço de entrega ainda não foi preenchido.",
                    temEndereco: false,
                    temCarteirinha: true,
                    carteirinha: carteiraAnoAtual
                });
            }

            // 3️⃣ Carteirinha existe E endereço existe
            return res.json({
                statusRequest: true,
                message: "Carteirinha e endereço encontrados com sucesso.",
                temEndereco: true,
                temCarteirinha: true,
                carteirinha: carteiraAnoAtual,
                endereco: enderecoEntrega
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Erro ao verificar carteirinha"
            });
        }
    }

    ,

    async cadastrarCarteirinha(req, res) {
        const trx = await knex.transaction(); // criar transação

        try {
            const {
                user_id,
                instituicao,
                curso,
                nivel_ensino,
                criadoPor_id,
                cod_identificador = '7A137F5',
                tipo_carteira,
                image, // imagem da carteirinha
                imageSize,
                comprovante, // base64 do comprovante
                comprovanteType,
                comprovanteSize
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
                    const encontrado = await trx("areadoaluno.carteirinha_user")
                        .where("cod_uso", codigo)
                        .first();
                    existe = !!encontrado;
                }

                return codigo;
            }

            if (!user_id || !instituicao || !nivel_ensino) {
                return res.status(400).json({
                    error: "Campos obrigatórios: user_id, instituicao, nivel_ensino"
                });
            }

            const config = await trx("areadoaluno.current_carteirinha")
                .where({ id: 1 })
                .first();

            const anoAtual = config?.ano || 2025;

            const carteiraExistente = await trx('areadoaluno.carteirinha_user')
                .where({ user_id, ano: anoAtual })
                .first();

            if (carteiraExistente) {
                return res.json({
                    statusRequest: false,
                    message: `Já existe uma carteirinha cadastrada para o ano ${anoAtual}.`
                });
            }

            const validade = `${Number(anoAtual) + 1}-03-31`;

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
                ano: anoAtual,
                status: null,
                editavel: 1
            };

            const [idCriado] = await trx('areadoaluno.carteirinha_user')
                .insert(novaCarteirinha);

            if (image) {
                await trx("areadoaluno.carteira").insert({
                    user_id: user_id,
                    carteirinha_id: idCriado,
                    imagem: image,
                    size: imageSize || null
                });
            }

            if (comprovante) {
                await trx("areadoaluno.carteirinha_comprovante").insert({
                    user_id: user_id,
                    carteirinha_id: idCriado,
                    documento: comprovante,
                    type: comprovanteType || null,
                    size: comprovanteSize || null
                });
            }

            await trx.commit(); // confirma tudo se não deu erro

            return res.json({
                statusRequest: true,
                message: "Carteirinha cadastrada com sucesso.",
                id: idCriado
            });

        } catch (error) {
            await trx.rollback(); // desfaz todas as operações se deu erro
            console.error(error);
            return res.status(500).json({
                error: "Erro ao cadastrar carteirinha"
            });
        }
    },





    async listarProdutosFaltantes(req, res) {
        try {
            const { user_id } = req.body;

            // 0. Buscar ano atual da carteira
            const config = await knex("areadoaluno.current_carteirinha") // Atualizado
                .where({ id: 1 })
                .first();

            const anoAtual = config?.ano || 2025;

            console.log(anoAtual)

            // 2. Buscar produtos ativos do ano ATUAL
            const produtos = await knex("areadoaluno.produtos")
                .where({ tipo: "carteirinha", ativo: 1, ano: anoAtual })
                .select("*");

            console.log(produtos)
            // 3. Buscar todos os históricos do usuário para o ANO ATUAL
            const historicos = await knex("areadoaluno.pagamentos_historico as h")
                .leftJoin("areadoaluno.produtos as p", "h.produto_id", "p.id")
                .where("h.user_id", user_id)
                .andWhere("p.ano", anoAtual)
                .select("h.*", "p.ano as produto_ano");

            // 4. Montar produtos com statusHistorico
            const produtosComStatus = [];

            for (const prod of produtos) {
                const histProd = historicos.filter(h => h.produto_id === prod.id);

                let statusHistorico = "none";
                let ultimoHistorico = null; // 👈 aqui guardamos o único que vai pro front

                if (histProd.length > 0) {

                    // 1️⃣ Se tiver PAID → pega o último PAID
                    const pagos = histProd.filter(h => h.status === "paid");
                    if (pagos.length > 0) {
                        const ultimoPago = pagos.sort(
                            (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
                        )[0];

                        statusHistorico = "paid";
                        ultimoHistorico = ultimoPago; // 👈 envia só ele
                    }
                    else {
                        // 2️⃣ Não tem PAID → pegar pendings
                        const pendings = histProd.filter(h => h.status === "pending");

                        if (pendings.length > 0) {
                            const ultimoPending = pendings.sort(
                                (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
                            )[0];

                            const now = new Date();
                            const expiresAt = new Date(ultimoPending.expires_at_pagarme);

                            if (now > expiresAt) {
                                // expirou → atualizar no banco
                                statusHistorico = "expired";
                                await knex("areadoaluno.pagamentos_historico")
                                    .where({ id: ultimoPending.id })
                                    .update({ status: "expired" });

                                ultimoHistorico = {
                                    ...ultimoPending,
                                    status: "expired"
                                };
                            } else {
                                statusHistorico = "pending";
                                ultimoHistorico = ultimoPending;
                            }
                        }
                        else {
                            // 3️⃣ Só expirados, pegar o último
                            const expirados = histProd.filter(h => h.status === "expired");

                            if (expirados.length > 0) {
                                const ultimoExpirado = expirados.sort(
                                    (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
                                )[0];

                                statusHistorico = "expired";
                                ultimoHistorico = ultimoExpirado;
                            }
                        }
                    }
                }

                produtosComStatus.push({
                    ...prod,
                    statusHistorico,
                    historico: ultimoHistorico // 👈 SOMENTE 1 OBJETO
                });
            }

            console.log('produtosComStatus', produtosComStatus)

            const carteirinha = await knex("areadoaluno.carteirinha_user")
                .where({ user_id })
                .orderBy("id", "desc")
                .first();

            // --------------------------------------------------------
            // 🐞 CORREÇÃO DE BUG — usuário sem histórico algum
            // --------------------------------------------------------

            const usuarioSemHistorico = historicos.length === 0;

            if (
                usuarioSemHistorico &&
                carteirinha &&
                carteirinha.digital === 1 &&
                carteirinha.fisica === 1
            ) {
                const produtoCombo = produtosComStatus.find(
                    p => p.digital === 1 && p.fisica === 1 && p.frete === 1
                );

                if (produtoCombo) {
                    return res.json([
                        {
                            ...produtoCombo,
                            preco: 0,
                            statusHistorico: "paid",
                            historico: {
                                status: "paid",
                                valor: 0,
                                fake: true,
                                observacao: "historico_gerado_por_migracao",
                                data_criacao: new Date()
                            }
                        }
                    ]);
                }
            }

            // --------------------------------------------------------
            // 5. 🔥 NOVA REGRA PRINCIPAL: esconder os produtos maiores
            // --------------------------------------------------------

            // 0. Identificar produtos A, B e C
            const produtoA = produtosComStatus.find(
                p => p.digital === 1 && p.fisica === 0 && p.frete === 0
            );

            const produtoB = produtosComStatus.find(
                p => p.digital === 0 && p.fisica === 1 && p.frete === 1
            );

            const produtoC = produtosComStatus.find(
                p => p.digital === 1 && p.fisica === 1 && p.frete === 1
            );

            // Estados
            const digitalPago = produtoA?.statusHistorico === "paid";
            const comboPago = produtoC?.statusHistorico === "paid";

            // --------------------------------------------------------
            // 🆕 REGRA NOVA: se o C (1,1,1) estiver pago → mostrar apenas ele
            // --------------------------------------------------------
            if (comboPago) {
                return res.json([produtoC]);  // ← apenas ele
            }

            // --------------------------------------------------------
            // Regras antigas continuam abaixo
            // --------------------------------------------------------

            let produtosFiltrados;

            if (digitalPago) {
                // 👉 A pago → mostrar A + B (0,1,1)
                produtosFiltrados = produtosComStatus.filter(p =>
                    (p.digital === 1 && p.fisica === 0 && p.frete === 0) ||  // A
                    (p.digital === 0 && p.fisica === 1 && p.frete === 1)     // B
                );
            } else {
                // 👉 A não pago → mostrar A + C (1,1,1)
                produtosFiltrados = produtosComStatus.filter(p =>
                    (p.digital === 1 && p.fisica === 0 && p.frete === 0) ||  // A
                    (p.digital === 1 && p.fisica === 1 && p.frete === 1)     // C
                );
            }

            return res.json(produtosFiltrados);




        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Erro ao filtrar produtos" });
        }
    },
    async aprovarCarteirinha(req, res) {
        try {
            const { carteirinha_id } = req.body;

            if (!carteirinha_id) {
                return res.status(400).json({ error: "carteirinha_id é obrigatório" });
            }

            // Atualiza status approved = 1
            const result = await knex("areadoaluno.carteirinha_user")
                .where({ id: carteirinha_id })
                .update({ approved: 1 });

            if (result === 0) {
                return res.status(404).json({ error: "Carteirinha não encontrada" });
            }

            return res.json({
                message: "Carteirinha aprovada com sucesso!",
                approved: true
            });

        } catch (error) {
            console.error("Erro ao aprovar carteirinha:", error);
            return res.status(500).json({
                error: "Erro ao aprovar carteirinha"
            });
        }
    }
    ,
    async createEndereco(req, res) {
        try {
            const {
                user_id,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                referencia
            } = req.body;

            if (!user_id) {
                return res.status(400).json({ statusRequest: false, error: "user_id é obrigatório" });
            }

            // 1️⃣ Buscar ano atual
            const config = await knex("areadoaluno.current_carteirinha")
                .where({ id: 1 })
                .first();

            const anoAtual = config?.ano || 2025;

            // 2️⃣ Encontrar a carteirinha atual do usuário
            const carteiraAnoAtual = await knex("areadoaluno.carteirinha_user")
                .where({ user_id, ano: anoAtual })
                .orderBy("id", "desc")
                .first();

            if (!carteiraAnoAtual) {
                return res.status(404).json({
                    statusRequest: false,
                    error: `Nenhuma carteirinha encontrada para o usuário no ano ${anoAtual}.`
                });
            }

            // 3️⃣ Verificar se essa carteirinha já tem endereço
            const existe = await knex("areadoaluno.carteirinha_endereco")
                .where({ carteirinha_id: carteiraAnoAtual.id })
                .first();

            if (existe) {
                return res.status(400).json({
                    error: "Esta carteirinha já possui endereço cadastrado.",
                    statusRequest: false,
                    endereco_id: existe.id
                });
            }

            // 4️⃣ Inserir o endereço
            const [id] = await knex("areadoaluno.carteirinha_endereco").insert({
                carteirinha_id: carteiraAnoAtual.id,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                referencia
            });

            return res.json({
                message: "Endereço cadastrado com sucesso.",
                statusRequest: true,
                endereco_id: id,
                carteirinha_id: carteiraAnoAtual.id
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ statusRequest: false, error: "Erro ao cadastrar endereço" });
        }
    }












};
