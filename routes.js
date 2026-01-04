const express = require('express')
const routes = express.Router()  //poderia ser app no routes



const authController = require('./src/controllers/authController');
const authAdmController = require('./src/controllers/authAdmController');
const UtilsAdmController = require('./src/controllers/UtilsAdmController');
const MetricasController = require('./src/controllers/MetricasController');
const ModulosController = require('./src/controllers/ModulosController');
const ModulosUserController = require('./src/controllers/ModulosUSerController');
const PagamentoController = require('./src/controllers/PagamentoController');
const PagamentoCarteirinhaController = require('./src/controllers/PagamentoCarteirinhaController');
const HistoricoPagamentosController = require('./src/controllers/HistoricoPagamentosController');
const userController = require('./src/controllers/userController');
const CarteirinhasController = require('./src/controllers/carteirinhasController');
const FuncionariosController = require('./src/controllers/FuncionariosController');
const ProdutosController = require('./src/controllers/ProdutosController');
const WebhookPagarmeController = require('./src/controllers/WebhookPagarmeController');
const ImageController = require('./src/controllers/ImageController');
const authMiddleware = require('./src/middlewares/authMiddleware');
const hasRole = require('./src/middlewares/hasRole');

/* ADM AUTH */

routes.post('/loginsistem', authAdmController.login);
routes.post('/verifycpfexist', UtilsAdmController.verifyCpfExist);
routes.post('/verifyemailexist', UtilsAdmController.verifyEmailExist);


routes.post('/registeradm', authMiddleware, authController.registerByModerador);


/* AUTH */
routes.post('/registeruser', authController.registerUser);
routes.post('/login', authController.login);
routes.post('/pagarmeuserid', authController.pagarMeUserID);


routes.post('/listarcarteirinhasbatch', CarteirinhasController.listarCarteirinhasBatch);



routes.post('/criarfuncionario', FuncionariosController.criarFuncionario);
routes.post('/listarfuncionarios', FuncionariosController.listarFuncionarios);
routes.post('/atualizarfuncionario', FuncionariosController.atualizarFuncionario);
routes.post('/desativarfuncionario', FuncionariosController.desativarFuncionario);

/* MÉTRICAS */
routes.post('/registrospormes', MetricasController.registrosPorMes);
routes.post('/registrosporfuncionario', MetricasController.registrosPorFuncionario);
routes.post('/registrosporano', MetricasController.registrosPorAno);
routes.post('/registrospordiafuncionario', MetricasController.registrosPorDiaFuncionario);




routes.post('/getuserbycoduso', userController.getUserByCodUso);
routes.post('/getuserbycpf', userController.getUserByCpf);
routes.post('/getallcarteirinhasbycpf', userController.getAllCarteirinhasByCpf);
routes.post('/editarusuariobycpfcodUso', userController.editarUsuarioByCpfCodUso);

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
routes.get("/produtos", ProdutosController.index); // não uso ainda
routes.post("/verificarcarteirinha", ProdutosController.verificarCarteirinha);
routes.post("/cadastrarcarteirinha", ProdutosController.cadastrarCarteirinha);
routes.post("/listarprodutosfaltantes", ProdutosController.listarProdutosFaltantes);
routes.post("/aprovarcarteirinha", ProdutosController.aprovarCarteirinha);
routes.post("/createendereco", ProdutosController.createEndereco);


/* Pagamentos */
/* routes.post("/verificarhistoricocarteirinha", HistoricoPagamentosController.verificarCarteirinha); */
routes.post("/registrarCarteirinha", HistoricoPagamentosController.registrarOuAtualizar);
routes.post("/listarTransacoes", HistoricoPagamentosController.listarTransacoes); // não uso ainda
routes.post("/atualizartransacaoexpirada", HistoricoPagamentosController.atualizarTransacaoExpirada);
routes.post("/verificarpermissaocarteirinha", HistoricoPagamentosController.verificarPermissaoCarteirinha);
routes.post("/listarhistoricopagamentos", HistoricoPagamentosController.listarHistoricoPagamentos);


routes.post("/getcarteirinhaimagem", ImageController.getCarteirinhaImagem);





/* routes.post("/createClient", PagamentoController.createClient); */  //DESATIVADO - FICOU IMPLEMENTADO NO SISTEMA DE AUTH ASSIM QUE FAZ O CADASTRO
routes.get("/listarclient", PagamentoController.listarClient);
routes.put("/atualizarcliente", PagamentoController.atualizarCliente);
routes.post("/listarclientbyid", PagamentoController.listarClientById);
/* routes.post("/criarpedido", PagamentoController.criarPedido); */ //DESATIVADO - FICOU IMPLEMENTADO NO SISTEMA DE PagamentoCarteirinhaController


routes.post("/criarpedidocarteirinha", PagamentoCarteirinhaController.criarPedidoCarteirinha);
routes.post("/listarcarteirinhaspendentes", PagamentoCarteirinhaController.listarCarteirinhasPendentes);


routes.post("/pagarmeWebhookStatusPix", WebhookPagarmeController.pagarmeWebhookStatusPix);




module.exports = routes