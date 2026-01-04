const knex = require('../database');
require('dotenv').config();


module.exports = {
    async verifyCpfExist(req, res, next) {
        try {
            const { cpf } = req.body;

            const [user] = await knex('ueb_sistem.users').where('cpf', cpf);

            if (!user) {
                return res.send({ auth: false, message: 'CPF não encontrado', find: false });
            }

            return res.send({ auth: false, message: 'CPF já cadastrado', find: true });

        } catch (error) {
            console.error('Erro ao verificar CPF:', error);
            next(error);
        }
    },
    async verifyEmailExist(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).send({
                    auth: false,
                    message: 'E-mail não informado',
                    find: false,
                });
            }

            const [user] = await knex('ueb_sistem.users')
                .select('cpf') // 🔹 retorna apenas o necessário
                .whereRaw('LOWER(email) = LOWER(?)', [email.trim()]);

            if (!user) {
                return res.send({
                    auth: false,
                    message: 'E-mail não encontrado',
                    find: false,
                    cpf: null,
                });
            }

            return res.send({
                auth: false,
                message: 'E-mail já cadastrado',
                find: true,
                cpf: user.cpf, // ✅ CPF atrelado ao e-mail
            });

        } catch (error) {
            console.error('Erro ao verificar e-mail:', error);
            next(error);
        }
    }



};
