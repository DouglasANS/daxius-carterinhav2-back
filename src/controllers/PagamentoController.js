const knex = require('../database');

// Ou tente também:
// const Pagarme = require('pagarmeapisdklib');
const axios = require('axios');
require('dotenv').config();

module.exports = {

    //DESATIVADO - FICOU IMPLEMENTADO NO SISTEMA DE AUTH ASSIM QUE FAZ O CADASTRO
   /*  async createClient(req, res) {
        try {
            const { name, cpf, cpfType = 'CPF', isCompany = false, email, phones } = req.body;

            // Define o tipo de cliente
            const type = isCompany ? 'company' : 'individual';

            // Autenticação Basic com API Key
            const apiKey = process.env.PAGARME_API_KEY; // ak_test_... ou ak_live_...
            const token = Buffer.from(apiKey + ':').toString('base64');

            // Dados do cliente
            const customerData = {
                external_id: `cli_${Date.now()}`,
                name: name || 'Cliente Padrão',
                type,
                country: 'br',
                email: email || 'sememail@teste.com',
                document: cpf,
                document_type: cpfType, 
                phones: {
                    home_phone: { country_code: phones.home_phone.country_code, area_code: phones.home_phone.area_code, number: phones.home_phone.number }
                }
            };

            // Requisição POST usando Axios
            const response = await axios.post(
                'https://api.pagar.me/core/v5/customers',
                customerData,
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Basic ${token}`
                    }
                }
            );

            console.log('Cliente criado com sucesso:', response.data);
            return res.status(201).json({ success: true, client: response.data });

        } catch (error) {
            console.error('Erro ao criar cliente:', error.response ? error.response.data : error.message);
            return res.status(500).json({
                error: 'Erro ao criar cliente no Pagar.me',
                details: error.response ? error.response.data : error.message
            });
        }
    }, */
    async listarClient(req, res) {
        // Substitua pelo seu API Key real
        const apiKey = process.env.PAGARME_API_KEY;
        const token = Buffer.from(apiKey + ':').toString('base64');

        const axios = require('axios');

        const options = {
            method: 'GET',
            url: 'https://api.pagar.me/core/v5/customers',
            headers: {
                accept: 'application/json',
                authorization: `Basic ${token}`
            }
        };

        try {
            const response = await axios.request(options);
            console.log('Lista de clientes:', response.data);
            return res.status(200).json(response.data);
        } catch (error) {
            console.error('Erro ao listar clientes:', error.response ? error.response.data : error.message);
            return res.status(500).json({ error: 'Erro ao listar clientes' });
        }
    },
    async atualizarCliente(req, res) {
        try {
            const { customerId, document, cpfType = 'CPF', name, isCompany = false, email } = req.body;

            const type = isCompany ? 'company' : 'individual';

            if (!document) {
                return res.status(400).json({ error: 'CPF ou CNPJ é obrigatório para atualizar o cliente' });
            }

            const apiKey = process.env.PAGARME_API_KEY;
            const token = Buffer.from(apiKey + ':').toString('base64');

            const data = {
                phones: { home_phone: { country_code: '55', area_code: '81', number: '987654321' } },
                name,
                type,
                document_type: cpfType, // ou 'CNPJ'
                document: document,
                email
                /* :
                gender: 'male' or 'female' */
            };

            const response = await axios.put(
                `https://api.pagar.me/core/v5/customers/${customerId}`,
                data,
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Basic ${token}`
                    }
                }
            );

            return res.status(200).json({ success: true, client: response.data });
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error.response ? error.response.data : error.message);
            return res.status(500).json({ error: 'Erro ao atualizar cliente', details: error.response ? error.response.data : error.message });
        }
    },
    async listarClientById(req, res) {
        try {
            const { customerId } = req.body;

            const apiKey = process.env.PAGARME_API_KEY;
            const token = Buffer.from(apiKey + ':').toString('base64');


            const options = {
                method: 'GET',
                url: `https://api.pagar.me/core/v5/customers/${customerId}`,
                headers: {
                    accept: 'application/json',
                    authorization: `Basic ${token}`
                }
            };

            const response = await axios.request(options);

            return res.status(200).json(response.data);
        } catch (error) {
            console.error('Erro ao listar cliente:', error.response?.data || error.message);
            return res.status(500).json({ erro: 'Falha ao consultar cliente no Pagar.me' });
        }
    },
    async criarPedido(req, res) {
        try {
            const { customerId, items_produto_id = [] } = req.body;

            // Valida customerId
            if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID do cliente inválido ou não informado."
                });
            }

            // Verifica se o array de produtos está vazio
            if (!Array.isArray(items_produto_id) || items_produto_id.length === 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Nenhum produto informado."
                });
            }

            // Busca todos os produtos cujos IDs estão no array
            const produtos = await knex("ueb_sistem.produtos")
                .whereIn("id", items_produto_id);

            // Verifica se todos os produtos foram encontrados
            if (produtos.length !== items_produto_id.length) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Um ou mais produtos informados não existem ou estão com problemas."
                });
            }

            // Calcula o total e cria os itens do pedido
            let totalAmount = 0;
            const items = produtos.map(item => {
                if (!item.preco || isNaN(item.preco)) {
                    throw new Error(`Produto com ID ${item.id} possui preço inválido.`);
                }

                const currentAmount = Math.round(item.preco * 100);
                totalAmount += currentAmount;

                return {
                    amount: currentAmount,
                    description: item.descricao,
                    quantity: 1,
                    code: item.id
                };
            });

            // Verifica se o total foi calculado corretamente
            if (totalAmount <= 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Valor total do pedido inválido."
                });
            }

            // Autenticação com Pagar.me
            const apiKey = process.env.PAGARME_API_KEY;
            if (!apiKey) {
                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Chave de API não configurada."
                });
            }
            const token = Buffer.from(apiKey + ':').toString('base64');

            // Define os dados do pedido
            const data = {
                items,
                payments: [
                    {
                        payment_method: 'pix',
                        pix: { expires_in: 1800 },
                        amount: totalAmount
                    }
                ],
                customer_id: customerId
            };

            // Envia o pedido à API do Pagar.me
            const options = {
                method: 'POST',
                url: 'https://api.pagar.me/core/v5/orders',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: `Basic ${token}`
                },
                data
            };

            const response = await axios.request(options);

            return res.status(200).json(response.data);

        } catch (error) {
            console.error('Erro ao criar pedido:', error.response?.data || error.message);
            return res.status(500).json({
                erro: 'Falha ao criar pedido no Pagar.me',
                detalhes: error.response?.data || error.message
            });
        }
    }




};
