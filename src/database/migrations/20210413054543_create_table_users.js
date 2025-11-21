
exports.up = knex =>  knex.schema.createTable('users', table => {
      table.increments('id')
      table.text('nome').notNullable()
      table.text('cpf').unique().notNullable()
      table.text('telefone').notNullable()
      table.integer('idade').notNullable()
      table.enu('sexo', ['masculino', 'feminino', '---']).notNullable()
      table.text('nacionalidade').notNullable()
      table.text('email').unique().notNullable()

      table.text('created_at').defaultTo(knex.fn.now())
      table.text('updated_at').defaultTo(knex.fn.now())
  })
;

exports.down = knex => knex.schema.dropTable('users')