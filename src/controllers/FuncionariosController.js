const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../database');
require('dotenv').config();

module.exports = {
    async criarFuncionario(req, res) {
        try {
            const {
                nome,
                cpf,
                email,
                senha,
                criado_por
            } = req.body;

            // 1️⃣ Validações básicas
            if (!nome || !cpf || !email || !senha || !criado_por) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "Dados obrigatórios não informados."
                });
            }

            // 2️⃣ Verificar CPF duplicado
            const cpfExiste = await knex("ueb_sistem.users")
                .where({ cpf })
                .first();

            if (cpfExiste) {
                return res.status(409).json({
                    statusRequest: false,
                    message: "CPF já cadastrado."
                });
            }

            // 3️⃣ Hash de senha (obrigatório) 
            const senhaHash = await bcrypt.hash(senha, 10);

            // 4️⃣ Inserção
            const [id] = await knex("ueb_sistem.users").insert({
                name: nome,
                cpf,
                email,
                password: senhaHash,
                role: "funcionario", // padrão
                ativo: 1,
                criado_por,
                data_cadastro: knex.fn.now()
            });

            return res.json({
                statusRequest: true,
                message: "Funcionário criado com sucesso.",
                funcionarioId: id
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao criar funcionário."
            });
        }
    },
    async listarFuncionarios(req, res) {
        try {
            const funcionarios = await knex("ueb_sistem.users")
                .select(
                    "id",
                    "name",
                    "cpf",
                    "email",
                    "role",
                    "ativo",
                    "data_cadastro",
                    "criado_por"
                )
                .where({ role: "funcionario" });

            return res.json({
                statusRequest: true,
                data: funcionarios
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao buscar funcionários."
            });
        }
    },
    async atualizarFuncionario(req, res) {
        try { 
            const { name, cpf, email, senha, id } = req.body;

            if (!id) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "ID do funcionário não informado."
                });
            }

            const funcionario = await knex("ueb_sistem.users")
                .where({ id, role: "funcionario" })
                .first();

            if (!funcionario) {
                return res.status(404).json({
                    statusRequest: false,
                    message: "Funcionário não encontrado."
                });
            }

            // Verificar CPF duplicado (exceto o próprio)
            if (cpf) {
                const cpfExiste = await knex("ueb_sistem.users")
                    .where({ cpf })
                    .andWhereNot({ id })
                    .first();

                if (cpfExiste) {
                    return res.status(409).json({
                        statusRequest: false,
                        message: "CPF já está em uso."
                    });
                }
            }

            const dadosAtualizacao = {};

            if (name) dadosAtualizacao.name = name;
            if (cpf) dadosAtualizacao.cpf = cpf;
            if (email) dadosAtualizacao.email = email;

            if (senha) {
                dadosAtualizacao.password = await bcrypt.hash(senha, 10);
            }

            await knex("ueb_sistem.users")
                .where({ id })
                .update(dadosAtualizacao);

            return res.json({
                statusRequest: true,
                message: "Funcionário atualizado com sucesso."
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao atualizar funcionário."
            });
        }
    },
    async desativarFuncionario(req, res) {
        try {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    statusRequest: false,
                    message: "ID do funcionário não informado."
                });
            }

            const funcionario = await knex("ueb_sistem.users")
                .where({ id, role: "funcionario" })
                .first();

            if (!funcionario) {
                return res.status(404).json({
                    statusRequest: false,
                    message: "Funcionário não encontrado."
                });
            }

            await knex("ueb_sistem.users")
                .where({ id })
                .update({ ativo: 0 });

            return res.json({
                statusRequest: true,
                message: "Funcionário desativado com sucesso."
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                statusRequest: false,
                message: "Erro ao desativar funcionário."
            });
        }
    }







};
