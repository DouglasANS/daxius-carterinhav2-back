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
    },




    async listarProdutosFaltantes(req, res) {
        try {
            const { user_id } = req.body;

            // 0. Buscar ano atual da carteira
            const config = await knex("ueb_sistem.current_carteirinha")
                .where({ id: 1 })
                .first();

            const anoAtual = config?.ano || 2025;

            // 2. Buscar produtos ativos do ano ATUAL
            const produtos = await knex("ueb_sistem.produtos")
                .where({ tipo: "carteirinha", ativo: 1, ano: anoAtual })
                .select("*");

            // 3. Buscar todos os históricos do usuário para o ANO ATUAL
            const historicos = await knex("ueb_sistem.pagamentos_historico as h")
                .leftJoin("ueb_sistem.produtos as p", "h.produto_id", "p.id")
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
                                await knex("ueb_sistem.pagamentos_historico")
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
    }









};
