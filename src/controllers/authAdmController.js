const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-supersegura";

module.exports = {

    // ================================
    //   CRIAR FUNCIONÁRIO (tipo = 1)
    // ================================
    async createFuncionario(req, res) {
        const { nome, email, senha } = req.body;

        try {
            // Verificar se email existe
            const already = await knex("ueb_sistem.users")
                .where({ email })
                .first();

            if (already) {
                return res.status(400).json({
                    error: "Email já cadastrado",
                    statusRequest: false
                });
            }

            // Gerar hash da senha
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(senha, salt);

            // Criar usuário (tipo = 1 = FUNCIONÁRIO)
            const [id] = await knex("ueb_sistem.users").insert({
                nome,
                email,
                senha: hash,
                role: 1,  
                ativo: 1,
                criado_em: knex.fn.now(),
                data_atualizacao: knex.fn.now()
            });

            return res.json({
                message: "Funcionário criado com sucesso",
                user_id: id,
                statusRequest: true
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Erro ao criar funcionário",
                statusRequest: false
            });
        }
    },

    // ================================
    //            LOGIN
    // ================================
    async login(req, res) {
        const { email, senha } = req.body;

        console.log(email, senha)

        try {
            const user = await knex("ueb_sistem.users")
                .where({ email })
                .first();

            if (!user) {
                return res.status(404).json({ 
                    error: "Usuário não encontrado", 
                    statusRequest: false 
                });
            }

            if (!user.ativo) {
                return res.status(403).json({
                    error: "Usuário inativo",
                    statusRequest: false
                });
            }
            console.log(user)

            

            console.log('check')
            // Verifica senha
            const check = await bcrypt.compare(senha, user.password);
            console.log(check)

            if (!check) {
                return res.status(401).json({
                    error: "Senha incorreta",
                    statusRequest: false
                });
            }
            // Gera token JWT
            const token = jwt.sign(
                { id: user.id, email: user.email, tipo: user.tipo },
                JWT_SECRET,
                { expiresIn: "8h" }
            );

            // Salva o token no banco
            await knex("ueb_sistem.users")
                .where({ id: user.id })
                .update({
                   /*  jwt_token: token, */
                    ultimo_login: knex.fn.now(),
                    data_atualizacao: knex.fn.now()
                });

     

            return res.json({
                message: "Login realizado com sucesso",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    tipo: user.tipo
                },
                token,
                statusRequest: true
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Erro ao fazer login",
                statusRequest: false
            });
        }
    }

};
