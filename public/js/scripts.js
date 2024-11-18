// scripts.js

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Carregar histórico de mensagens a partir de uma variável global, se disponível
    let messages = <%- JSON.stringify(messages) %> || [];

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        // Adicionar a mensagem do usuário ao chat
        addMessage('user', userMessage);
        messageInput.value = '';
        messageInput.focus();

        try {
            // Mostrar o indicador de carregamento
            loadingIndicator.style.display = 'block';

            // Enviar a mensagem para o servidor via AJAX
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage, messages }),
            });

            if (!response.ok) {
                throw new Error('Erro na solicitação');
            }

            const data = await response.json();

            // Atualizar o histórico de mensagens
            messages = data.messages;

            // Renderizar as mensagens atualizadas
            renderMessages();
        } catch (error) {
            console.error('Erro ao enviar a mensagem:', error);
            addMessage('bot', 'Desculpe, ocorreu um erro ao processar sua solicitação.');
        } finally {
            // Esconder o indicador de carregamento
            loadingIndicator.style.display = 'none';
        }
    });

    const addMessage = (sender, text) => {
        messages.push({ sender, text });
        renderMessages();
    };

    const renderMessages = () => {
        chatBox.innerHTML = '';
        messages.forEach(message => {
            const p = document.createElement('p');
            p.classList.add(message.sender === 'user' ? 'user-message' : 'bot-message');
            p.innerHTML = `<strong>${message.sender === 'user' ? 'Você' : 'Bot'}:</strong> ${message.text}`;
            chatBox.appendChild(p);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    };
});
