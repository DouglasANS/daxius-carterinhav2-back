const knex = require('../database');
require('dotenv').config();


module.exports = {
    async getUserByCodUso(req, res) {
        try {
            const { cod_uso } = req.body;

            if (!cod_uso) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "Envie o cod_uso."
                });
            }

            // 1️⃣ Buscar carteirinha pelo cod_uso (mais recente)
            const carteirinha = await knex("ueb_sistem.carteirinha_user")
                .select(
                    "id",
                    "user_id",
                    "instituicao",
                    "curso",
                    "nivel_ensino",
                    "validade",
                    "cod_identificador",
                    "cod_uso",
                    "ano",
                    "approved"
                )
                .where("cod_uso", cod_uso)
                .orderBy("ano", "desc")
                .first();

            if (!carteirinha) {
                return res.json({
                    statusRequest: false,
                    message: "Carteirinha não encontrada."
                });
            }

            // 2️⃣ Função de validação de ano
            function isCarteirinhaValida(carteirinha) {
                if (!carteirinha?.ano) return false;

                const ano = Number(carteirinha.ano);
                const hoje = new Date();

                // válida de 01/01/ano até 31/03/(ano + 1)
                const inicio = new Date(ano, 0, 1);
                const fim = new Date(ano + 1, 2, 31);

                return hoje >= inicio && hoje <= fim;
            }

            if (!isCarteirinhaValida(carteirinha)) {
                return res.json({
                    statusRequest: false,
                    message: "A carteirinha venceu! Faça sua renovação."
                });
            }

            // 3️⃣ Verificar aprovação
            if (carteirinha.approved === 0) {
                return res.json({
                    statusRequest: false,
                    message: "Verificação de carteirinha pendente!"
                });
            }

            // 4️⃣ Buscar usuário
            const usuario = await knex("ueb_sistem.users")
                .select("id", "name", "data_nascimento", "cpf", "rg", "email")
                .where("id", carteirinha.user_id)
                .first();

            if (!usuario) {
                return res.json({
                    statusRequest: false,
                    message: "Usuário não encontrado."
                });
            }

            // 5️⃣ Buscar imagem da carteirinha
            const imagem = await knex("ueb_sistem.carteirinha_image")
                .select("image")
                .where({
                    user_id: usuario.id,
                    carteirinha_id: carteirinha.id
                })
                .first();

            // 6️⃣ Retorno final
            return res.json({
                statusRequest: true,
                message: "Acesso liberado.",
                carteirinha: {
                    carteirinhaId: carteirinha.id,
                    codigoUso: carteirinha.cod_uso,
                    nome: usuario.name,
                    cpf: usuario.cpf,
                    rg: usuario.rg || null,
                    dataNascimento: usuario.data_nascimento,
                    email: usuario.email,
                    instituicao: carteirinha.instituicao,
                    curso: carteirinha.curso,
                    escolaridade: carteirinha.nivel_ensino || null,
                    validadeCarteirinha: carteirinha.validade,
                    ano: carteirinha.ano,
                    imagem: imagem?.image || null
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
    async getUserByCpf(req, res) {
        try {
            const { cpf } = req.body;

            if (!cpf) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "Envie o cpf."
                });
            }

            // 1️⃣ Buscar usuário pelo CPF
            const usuario = await knex("ueb_sistem.users")
                .select("id", "name", "data_nascimento", "cpf", "rg", "email")
                .where("cpf", cpf)
                .first();

            if (!usuario) {
                return res.json({
                    statusRequest: false,
                    message: "Usuário não encontrado."
                });
            }

            // 2️⃣ Buscar carteirinha mais recente do usuário
            const carteirinha = await knex("ueb_sistem.carteirinha_user")
                .select(
                    "id",
                    "user_id",
                    "instituicao",
                    "curso",
                    "nivel_ensino",
                    "validade",
                    "cod_identificador",
                    "cod_uso",
                    "ano",
                    "approved"
                )
                .where("user_id", usuario.id)
                .orderBy("ano", "desc")
                .first();

            if (!carteirinha) {
                return res.json({
                    statusRequest: false,
                    message: "Carteirinha não encontrada."
                });
            }

            // 3️⃣ Função de validação de ano
            function isCarteirinhaValida(carteirinha) {
                if (!carteirinha?.ano) return false;

                const ano = Number(carteirinha.ano);
                const hoje = new Date();

                // válida de 01/01/ano até 31/03/(ano + 1)
                const inicio = new Date(ano, 0, 1);
                const fim = new Date(ano + 1, 2, 31);

                return hoje >= inicio && hoje <= fim;
            }

            if (!isCarteirinhaValida(carteirinha)) {
                return res.json({
                    statusRequest: false,
                    message: "A carteirinha venceu! Faça sua renovação."
                });
            }

            // 4️⃣ Verificar aprovação
            if (carteirinha.approved === 0) {
                return res.json({
                    statusRequest: false,
                    message: "Verificação de carteirinha pendente!"
                });
            }

            // 5️⃣ Buscar imagem da carteirinha
            const imagem = await knex("ueb_sistem.carteirinha_image")
                .select("image")
                .where({
                    user_id: usuario.id,
                    carteirinha_id: carteirinha.id
                })
                .first();

            // 6️⃣ Retorno final
            return res.json({
                statusRequest: true,
                message: "Acesso liberado.",
                carteirinha: {
                    carteirinhaId: carteirinha.id,
                    codigoUso: carteirinha.cod_uso,
                    nome: usuario.name,
                    cpf: usuario.cpf,
                    rg: usuario.rg || null,
                    dataNascimento: usuario.data_nascimento,
                    email: usuario.email,
                    instituicao: carteirinha.instituicao,
                    curso: carteirinha.curso,
                    escolaridade: carteirinha.nivel_ensino || null,
                    validadeCarteirinha: carteirinha.validade,
                    ano: carteirinha.ano,
                    imagem: imagem?.image || null
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
    async editarUsuarioByCpfCodUso(req, res) {
        try {
            const {
                cpf,
                codigoUso,
                nome,
                rg,
                email,
                dataNascimento,
                instituicao,
                curso,
                escolaridade, 
                cod_identificador,
                imagemBase64
            } = req.body;

            const cod_uso = codigoUso

            if (!cpf || !cod_uso) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "CPF e código de uso são obrigatórios."
                });
            }

            // 1️⃣ Buscar usuário pelo CPF
            const usuario = await knex("ueb_sistem.users")
                .where("cpf", cpf)
                .first();

            if (!usuario) {
                return res.json({
                    statusRequest: false,
                    message: "Usuário não encontrado."
                });
            }

            // 2️⃣ Buscar carteirinha específica (CPF + cod_uso)
            const carteirinha = await knex("ueb_sistem.carteirinha_user")
                .where({
                    user_id: usuario.id,
                    cod_uso: cod_uso
                })
                .first();

            if (!carteirinha) {
                return res.json({
                    statusRequest: false,
                    message: "Carteirinha não encontrada para este CPF."
                });
            }

            // 3️⃣ Atualizar usuário
            await knex("ueb_sistem.users")
                .where("id", usuario.id)
                .update({
                    name: nome ?? usuario.name,
                    rg: rg ?? usuario.rg,
                    email: email ?? usuario.email,
                    data_nascimento: dataNascimento ?? usuario.data_nascimento
                });

            // 4️⃣ Atualizar carteirinha
            await knex("ueb_sistem.carteirinha_user")
                .where("id", carteirinha.id)
                .update({
                    instituicao: instituicao ?? carteirinha.instituicao,
                    curso: curso ?? carteirinha.curso,
                    nivel_ensino: escolaridade ?? carteirinha.nivel_ensino, 
                    cod_identificador: cod_identificador ?? carteirinha.cod_identificador
                });

            function base64ToSize(base64String) {
                const padding = (base64String.endsWith("==") ? 2 : base64String.endsWith("=") ? 1 : 0);
                return (base64String.length * 3) / 4 - padding;
            }

            // 5️⃣ Atualizar imagem BASE64 (se enviada)
            if (imagemBase64) {
                const imagemExistente = await knex("ueb_sistem.carteirinha_image")
                    .where({
                        user_id: usuario.id,
                        carteirinha_id: carteirinha.id
                    })
                    .first();

                if (imagemExistente) {
                    await knex("ueb_sistem.carteirinha_image")
                        .where("id", imagemExistente.id)
                        .update({ image: imagemBase64 });
                } else {
                    await knex("ueb_sistem.carteirinha_image")
                        .insert({
                            user_id: usuario.id,
                            carteirinha_id: carteirinha.id,
                            image: imagemBase64,
                            size: imagemBase64 ? base64ToSize(imagemBase64) : undefined,
                        });
                }
            }

            return res.json({
                statusRequest: true,
                message: "Dados atualizados com sucesso."
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao editar dados."
            });
        }
    },

    




};
