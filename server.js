const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors()); // libera CORS para todas as origens, ideal para testes

app.use(routes);

// middleware para 404
app.use((req, res, next) => {
  const error = new Error('Not found');
  error.status = 404;
  next(error);
});

// middleware para erros
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({ error: error.message });
});

const PORT = 3003;
const ip = '0.0.0.0';

app.listen(PORT, ip, () => console.log(`Servidor rodando na porta ${PORT}`));
