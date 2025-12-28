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

};
