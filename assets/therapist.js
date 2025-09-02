document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatHistory = document.getElementById('chat-history');

  chatForm.addEventListener('submit', async (e) => { // Make async
    e.preventDefault();
    const userMessageText = userInput.value.trim();

    if (userMessageText === '') {
      return;
    }

    // 1. Display user message
    appendMessage(userMessageText, 'user');
    userInput.value = '';
    userInput.focus();

    // 2. Send message to backend and get AI response
    try {
      // Show a thinking indicator
      appendMessage('考え中...', 'ai', 'thinking');

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessageText }),
      });

      if (!response.ok) {
        throw new Error('サーバーからの応答がありません。');
      }

      const data = await response.json();
      const aiMessageText = data.message;

      // Update the "thinking" message with the actual response
      updateLastMessage(aiMessageText);

    } catch (error) {
      console.error('Error:', error);
      updateLastMessage('申し訳ありません、エラーが発生しました。', 'error');
    }
  });

  function appendMessage(text, type, id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${type}-message`);
    if (id) {
      messageDiv.id = id;
    }
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function updateLastMessage(text, type = null) {
    const thinkingMessage = document.getElementById('thinking');
    if (thinkingMessage) {
      thinkingMessage.querySelector('p').textContent = text;
      if (type === 'error') {
          thinkingMessage.classList.add('error-message');
      }
      thinkingMessage.id = ''; // Remove id to prevent it from being updated again
    }
  }
});