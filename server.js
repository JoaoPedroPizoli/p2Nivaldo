// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Configurar EJS como motor de templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Usar express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout'); // Define 'layout.ejs' como layout padrão

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para analisar o corpo das requisições
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Função para tentar a solicitação com retries
const generateContentWithRetry = async (model, prompt, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            if (error.status === 503 && attempt < retries) {
                console.warn(`Tentativa ${attempt} falhou. Retentando em ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponencial backoff
            } else {
                throw error;
            }
        }
    }
};

// Rota principal
app.get('/', (req, res) => {
    res.render('index', { messages: [] });
});

// Rota para processar as mensagens do usuário
app.post('/chat', async (req, res) => {
    const { message: userMessage, messages: incomingMessages } = req.body;
    let messages = [];

    if (incomingMessages) {
        try {
            messages = Array.isArray(incomingMessages) ? incomingMessages : JSON.parse(incomingMessages);
        } catch (e) {
            messages = [];
        }
    }

    // Adicionar a mensagem do usuário à lista de mensagens
    messages.push({ sender: 'user', text: userMessage });

    try {
        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Tentar gerar conteúdo com retry
        const botResponse = await generateContentWithRetry(model, userMessage);

        // Adicionar a resposta do bot à lista de mensagens
        messages.push({ sender: 'bot', text: botResponse });

        res.json({ messages });
    } catch (error) {
        console.error('Erro ao se comunicar com a API Gemini:', error);

        if (error.status === 503) {
            messages.push({
                sender: 'bot',
                text: 'Desculpe, o serviço está temporariamente indisponível. Por favor, tente novamente mais tarde.'
            });
        } else {
            messages.push({
                sender: 'bot',
                text: 'Desculpe, ocorreu um erro ao processar sua solicitação.'
            });
        }

        res.json({ messages });
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
