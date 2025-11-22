const express = require('express')
const routes = express.Router()  //poderia ser app no routes



const authController = require('./src/controllers/authController');
const MetricasController = require('./src/controllers/MetricasController');
const ModulosController = require('./src/controllers/ModulosController');
const ModulosUserController = require('./src/controllers/ModulosUSerController');
const PagamentoController = require('./src/controllers/PagamentoController');
const PagamentoCarteirinhaController = require('./src/controllers/PagamentoCarteirinhaController');
const HistoricoPagamentosController = require('./src/controllers/HistoricoPagamentosController');
const ProdutosController = require('./src/controllers/ProdutosController');
const WebhookPagarmeController = require('./src/controllers/WebhookPagarmeController');
const authMiddleware = require('./src/middlewares/authMiddleware');
const hasRole = require('./src/middlewares/hasRole');

/* AUTH */
routes.post('/register', authMiddleware, authController.registerByModerador);
routes.post('/registeruser', authController.registerUser);
routes.post('/login', authController.login);

/* MÉTRICAS */
routes.post('/metricaslogin', MetricasController.index);

/* ModulosController */
routes.get("/allmodulos", ModulosController.index);
/* routes.get("/modulos/:id", ModulosController.show); */
routes.post("/createmodulos", ModulosController.create);
routes.put("/updatemodulosid", ModulosController.update);
routes.delete("/modulos/:id", ModulosController.delete);

/*  ModulosUserController */
/* routes.get("/modulos_user", ModulosUserController.index); */
routes.post("/modulos_user_by_id", ModulosUserController.showModulesByUser);
routes.post("/modulos_user", ModulosUserController.create);
routes.put("/update_modulos_user", ModulosUserController.update);
routes.delete("/modulos_user/:id", ModulosUserController.delete);

/* ProdutosController */
routes.get("/produtos", ProdutosController.index);
routes.post("/verificarcarteirinha", ProdutosController.verificarCarteirinha);
routes.post("/cadastrarcarteirinha", ProdutosController.cadastrarCarteirinha);


/* Pagamentos */
/* routes.post("/verificarhistoricocarteirinha", HistoricoPagamentosController.verificarCarteirinha); */
routes.post("/registrarCarteirinha", HistoricoPagamentosController.registrarOuAtualizar);
routes.post("/listarTransacoes", HistoricoPagamentosController.listarTransacoes);




/* routes.post("/createClient", PagamentoController.createClient); */  //DESATIVADO - FICOU IMPLEMENTADO NO SISTEMA DE AUTH ASSIM QUE FAZ O CADASTRO
routes.get("/listarclient", PagamentoController.listarClient);
routes.put("/atualizarcliente", PagamentoController.atualizarCliente);
routes.post("/listarclientbyid", PagamentoController.listarClientById);
/* routes.post("/criarpedido", PagamentoController.criarPedido); */ //DESATIVADO - FICOU IMPLEMENTADO NO SISTEMA DE PagamentoCarteirinhaController


routes.post("/criarpedidocarteirinha", PagamentoCarteirinhaController.criarPedidoCarteirinha);


routes.post("/pagarmeWebhookStatusPix", WebhookPagarmeController.pagarmeWebhookStatusPix);




module.exports = routes