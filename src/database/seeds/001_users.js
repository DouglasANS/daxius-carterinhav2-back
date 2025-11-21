
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('users').del()
    .then(function () {
      // Inserts seed entries
      return knex('users').insert([
        {nome: 'Douglas', 
        cpf: '123456789', 
        telefone:'12345678', 
        idade:25, 
        sexo:'masculino', 
        nacionalidade: 'Brasileira', 
        email:'douglasans@hotmail.com'},

        {nome: 'Adelson', 
        cpf: '98754321', 
        telefone:'12345678', 
        idade:27, 
        sexo:'masculino', 
        nacionalidade: 'Brasileira', 
        email:'adelson@hotmail.com'},

        {nome: 'Camila', 
        cpf: 'swsswdasd', 
        telefone:'1565858', 
        idade:20, 
        sexo:'feminino', 
        nacionalidade: 'Brasileira', 
        email:'camila@hotmail.com'},

        {nome: 'Laura', 
        cpf: 'rojuyikuyj1', 
        telefone:'12555558', 
        idade:21, 
        sexo:'feminino', 
        nacionalidade: 'Brasileira', 
        email:'lauramelo@hotmail.com'},

      ]);
    });
};
