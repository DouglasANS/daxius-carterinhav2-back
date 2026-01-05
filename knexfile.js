// Update with your config settings.
require('dotenv').config()

module.exports = {

  development: {
    client: 'mysql2',
      connection: {
        host: process.env.HOST, // External Host
        port: process.env.PORT,// External Port
        database: process.env.DATABASE, // Nome do banco de dados na URL
        user: process.env.USER, // Usuário extraído da URL
        password: process.env.PASSWORD  // Senha extraída da URL
      },
    migrations: {
      tableName: 'knex_migrations',
      directory: `${__dirname}/src/database/migrations`
    },
    seeds: {
      directory: `${__dirname}/src/database/seeds`
    }
  }
};