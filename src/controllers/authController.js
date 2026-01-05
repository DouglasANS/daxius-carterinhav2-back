const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../database')
const axios = require('axios');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-supersegura";

module.exports = {
    async registerByModerador(req, res) {
        const criadoPor_id = req.user.id;
        const ip = req.user.ip;
        const userAgent = req.user.userAgent;

        const {
            name,
            email,
            password,
            cpf,
            rg,
            phone,
            data_nascimento,
            role = "user",
            instituicao,
            curso,
            nivel_ensino,
            tipo_carteira,
            cod_identificador = '7A137F5',
            image_base64,
            produto_id,
            permissonCarteirinha
        } = req.body;

        const trx = await knex.transaction();

        const config = await knex("areadoaluno.current_carteirinha")
            .where({ id: 1 })
            .first();

        const anoAtual = config?.ano || 2025;

        // ⬇️ NOVO: gera validade automática
        const validadeGerada = `${anoAtual + 1}-03-31`; // formato ISO recomendado


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

        try {
            // 1️⃣ Verifica duplicidade de CPF e e-mail
            const existingCpf = await trx("areadoaluno.users").where({ cpf }).first();
            if (existingCpf) {
                await trx.rollback();
                return res.status(409).json({ error: "CPF já cadastrado.", statusRequest: false });
            }

            const existingEmail = await trx("areadoaluno.users").where({ email }).first();
            if (existingEmail) {
                await trx.rollback();
                return res.status(409).json({ error: "E-mail já cadastrado.", statusRequest: false });
            }

            // 2️⃣ Cria hash da senha
            const hash = await bcrypt.hash(password, 8);

            // 3️⃣ Cria usuário e captura ID
            const telefone = phone
                ? `${phone.country_code}${phone.area_code}${phone.number}`
                : null;

            const [userId] = await trx("areadoaluno.users").insert({
                name,
                email,
                password: hash,
                cpf,
                rg,
                telefone,
                data_nascimento,
                role,
                ativo: true,
                criado_por: criadoPor_id,
                data_cadastro: knex.fn.now(),
            });

            // 4️⃣ Cria cliente no Pagar.me
            try {
                const apiKey = process.env.PAGARME_API_KEY;
                const token = Buffer.from(apiKey + ':').toString('base64');

                const customerData = {
                    external_id: `cli_${userId}_${Date.now()}`,
                    name: name || 'Cliente Padrão',
                    type: 'individual',
                    country: 'br',
                    email: email || 'sememail@teste.com',
                    document: cpf,
                    document_type: 'CPF',
                    phones: phone
                        ? {
                            home_phone: {
                                country_code: phone.country_code,
                                area_code: phone.area_code,
                                number: phone.number
                            }
                        }
                        : undefined
                };

                const response = await axios.post(
                    'https://api.pagar.me/core/v5/customers',
                    customerData,
                    {
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            Authorization: `Basic ${token}`
                        }
                    }
                );

                // Atualiza usuário com o ID do cliente Pagar.me
                await trx("areadoaluno.users")
                    .where({ id: userId })
                    .update({ pagarme_customer_id: response.data.id });

                console.log("Cliente criado no Pagar.me:", response.data.id);

            } catch (pagarmeError) {
                console.error("Erro ao criar cliente no Pagar.me:", pagarmeError.response?.data || pagarmeError.message);
                // Continua execução mesmo que falhe no Pagar.me
            }

            // Busca produto
            /* const produto = await trx("areadoaluno.produtos")
                .where({ id: produto_id, ativo: true })
                .first(); */

            var codUso = await gerarCodUsoUnico()

            console.log(codUso)

            // 5️⃣ Cria carteirinha vinculada
            const [carteirinhaId] = await trx("areadoaluno.carteirinha_user").insert({
                user_id: userId,
                instituicao,
                curso,
                nivel_ensino,
                validade: validadeGerada,
                tipo_carteira,
                cod_uso: codUso,
                cod_identificador: cod_identificador || null,
                criadoPor_id,
                data_criacao: knex.fn.now(),
                ano: anoAtual,
                status: 'paid',

                fisica: permissonCarteirinha?.fisica == true ? 1 : 0,
                digital: permissonCarteirinha?.digital == true ? 1 : 0,
                frete: permissonCarteirinha?.frete == true ? 1 : 0,
                approved: 1,
            });

            function base64ToSize(base64String) {
                const padding = (base64String.endsWith("==") ? 2 : base64String.endsWith("=") ? 1 : 0);
                return (base64String.length * 3) / 4 - padding;
            }


            // 6️⃣ Salva imagem Base64 (caso enviada)
            if (image_base64) {
                await trx("areadoaluno.carteira").insert({
                    user_id: userId,
                    imagem: image_base64,
                    data_criacao: knex.fn.now(),
                    carteirinha_id: carteirinhaId,
                    size: image_base64 ? base64ToSize(image_base64) : undefined,
                });
            }

            function formatToDecimal(value) {
                if (value === null || value === undefined) return 0;

                const numeric = String(value).replace(/\D/g, '');

                if (numeric.length < 3) {
                    return Number((numeric.padStart(3, '0').slice(0, -2) + '.' + numeric.slice(-2)));
                }

                return Number(
                    numeric.slice(0, -2) + '.' + numeric.slice(-2)
                );
            }
            const price = formatToDecimal(permissonCarteirinha.valorTotal);

            await trx("areadoaluno.pagamentos_historico").insert({
                user_id: userId,
                carteirinha_id: carteirinhaId,
                produto_id,
                price: price,
                forma_pagamento: "dinheiro",
                status: "paid",
                data_criacao: knex.fn.now(),
                data_confirmacao: knex.fn.now(),
            });

            // 8️⃣ Cria métrica de criação
            const now = new Date();
            const ano = now.getFullYear();

            await trx("areadoaluno.metricas_registro_carteirinha").insert({
                data_cadastro: now,
                id_funcionario: criadoPor_id,
                ano,
                estudante_id: userId,
            });

            // 9️⃣ Finaliza transação
            await trx.commit();


            return res.status(201).json({
                message: "Usuário, carteirinha, imagem, pagamento, métricas criados com sucesso.",
                statusRequest: true,
                cpf
            });

        } catch (error) {
            await trx.rollback();
            console.error(error);
            return res.status(500).json({ error: "Erro ao registrar usuário", statusRequest: false });
        }
    },


    async registerUser(req, res) {
        const { name, email, password, cpf, phone, data_nascimento, rg } = req.body;

        const trx = await knex.transaction();

        try {
            // 🔒 Validação obrigatória
            if (!name || !email || !password || !cpf) {
                await trx.rollback();
                return res.status(400).json({
                    error: "Nome, e-mail, senha e CPF são obrigatórios.",
                    statusRequest: false
                });
            }

            // 🔍 Verifica se já existe um usuário com mesmo CPF ou E-mail
            const existingUser = await trx("areadoaluno.users")
                .where("cpf", cpf)
                .orWhere("email", email)
                .first();

            if (existingUser) {
                await trx.rollback();

                const conflictField = existingUser.cpf === cpf ? "CPF" : "E-mail";
                return res.status(409).json({
                    error: `Já existe uma conta cadastrada com este ${conflictField}. Tente recuperar o acesso.`,
                    code: `${conflictField.toUpperCase()}_EXISTS`,
                    statusRequest: false
                });
            }

            // 🔐 Criptografa senha
            const hash = await bcrypt.hash(password, 8);

            // 📞 Concatena telefone
            const telefone = phone
                ? `${phone.country_code}${phone.area_code}${phone.number}`
                : null;

            // 🧾 Cria usuário local
            const [userId] = await trx("areadoaluno.users").insert({
                name,
                email,
                password: hash,
                cpf,
                rg,
                data_nascimento,
                telefone,
                role: "user",
                criado_por: "self",
                verified: false,
                ativo: true,
                data_cadastro: knex.fn.now()
            });


            // 🪙 Cria cliente no Pagar.me
            try {
                const apiKey = process.env.PAGARME_API_KEY; // ak_test_... ou ak_live_...
                const token = Buffer.from(apiKey + ':').toString('base64');

                const customerData = {
                    external_id: `cli_${userId}_${Date.now()}`,
                    name: name || 'Cliente Padrão',
                    type: 'individual',
                    country: 'br',
                    email: email || 'sememail@teste.com',
                    document: cpf,
                    document_type: 'CPF',
                    phones: phone
                        ? {
                            home_phone: {
                                country_code: phone.country_code,
                                area_code: phone.area_code,
                                number: phone.number
                            }
                        }
                        : undefined
                };

                const response = await axios.post(
                    'https://api.pagar.me/core/v5/customers',
                    customerData,
                    {
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            Authorization: `Basic ${token}`
                        }
                    }
                );

                console.log(response)

                // 💾 Atualiza usuário com o ID do cliente no Pagar.me
                await trx("areadoaluno.users")
                    .where({ id: userId })
                    .update({ pagarme_customer_id: response.data.id });

                console.log("Cliente criado no Pagar.me:", response.data.id);
            } catch (pagarmeError) {
                console.error("Erro ao criar cliente no Pagar.me:", pagarmeError.response?.data || pagarmeError.message);
                // Continua mesmo que falhe no Pagar.me, mas pode fazer rollback se quiser
            }

            // ✅ Confirma transação
            await trx.commit();

            // 🔑 Gera token JWT
            const token = jwt.sign(
                { id: userId, email, role: "user" },
                JWT_SECRET,
                { expiresIn: "8h" }
            );

            return res.status(201).json({
                message: "Conta criada com sucesso!",
                user: { id: userId, name, email, telefone },
                token,
                statusRequest: true
            });

        } catch (error) {
            await trx.rollback();
            console.error(error);
            return res.status(500).json({
                error: "Erro ao registrar usuário.",
                statusRequest: false
            });
        }
    },














    // Login de usuário
    async login(req, res) {
        const { email, password } = req.body;

        try {
            const user = await knex("areadoaluno.users").where({ email }).first();

            if (!user) {
                return res.status(404).json({ error: "Usuário não encontrado", statusRequest: false });
            }

            if (!user.ativo) {
                return res.status(403).json({ error: "Usuário inativo", statusRequest: false });
            }

            // Verifica se está bloqueado
            const agora = new Date();
            if (user.bloqueado_ate && new Date(user.bloqueado_ate) > agora) {
                const minutosRestantes = Math.ceil((new Date(user.bloqueado_ate) - agora) / 60000);
                return res.status(403).json({
                    error: `Conta bloqueada. Tente novamente em ${minutosRestantes} minutos.`,
                    statusRequest: false
                });
            }

            // Verifica senha
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                const novasTentativas = (user.tentativas_login || 0) + 1;
                let bloqueado_ate = null;
                let mensagemExtra = "";

                // Define bloqueio progressivo a cada 5 tentativas
                if (novasTentativas % 5 === 0) {
                    const etapas = Math.floor(novasTentativas / 5);
                    const tempos = [1, 10, 60, 1440]; // minutos: 1min, 10min, 1h, 24h
                    const duracaoMin = tempos[Math.min(etapas - 1, tempos.length - 1)];
                    bloqueado_ate = new Date(Date.now() + duracaoMin * 60 * 1000);
                    mensagemExtra = `Usuário bloqueado por ${duracaoMin >= 60 ? duracaoMin / 60 + "h" : duracaoMin + "min"}.`;
                }

                await knex("areadoaluno.users")
                    .where({ id: user.id })
                    .update({
                        tentativas_login: novasTentativas,
                        bloqueado_ate,
                    });

                return res.status(401).json({
                    error: "Senha incorreta.",
                    tentativas: novasTentativas,
                    bloqueado_ate,
                    mensagemExtra,
                    statusRequest: false
                });
            }

            // Reset tentativas e bloqueios após sucesso
            await knex("areadoaluno.users")
                .where({ id: user.id })
                .update({
                    tentativas_login: 0,
                    bloqueado_ate: null,
                    ultimo_login: knex.fn.now(),
                });

            // 🔹 Incrementa métrica de login diário
            await knex.raw(`
                INSERT INTO areadoaluno.metricas_login_diario (data, total_logins)
                VALUES (CURRENT_DATE, 1)
                ON DUPLICATE KEY UPDATE total_logins = total_logins + 1
            `);

            // Gera token JWT
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: "8h" }
            );

            return res.json({
                message: "Login realizado com sucesso",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
                statusRequest: true
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Erro ao fazer login", statusRequest: false });
        }
    }
    ,

    async pagarMeUserID(req, res) {
        try {
            const { id } = req.body;

            const result = await knex('areadoaluno.users')
                .select('pagarme_customer_id')
                .where('id', id)
                .first();
            return res.json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: 'Erro ao buscar pagarme_customer_id do usuário'
            });
        }
    }


};
