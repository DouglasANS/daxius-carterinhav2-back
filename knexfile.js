// Update with your config settings.

module.exports = {

  development: {
    client: 'mysql2',
    connection: {
      database: "ccicontrole",
      user: "root",
      password: "123456",
      typeCast: function (field, next) {
        if (field.type === 'DATE') {
          return field.string(); // ← retorna como string "2025-07-07"
        }
        return next();
      }
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