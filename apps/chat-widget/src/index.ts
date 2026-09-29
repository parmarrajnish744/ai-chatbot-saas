(function () {
  // 1. Detect current script configuration
  const currentScript = (document.currentScript as HTMLScriptElement) || {};
  const tenantId = currentScript.getAttribute?.('data-tenant') || 'demo-tenant';
  const apiBase = currentScript.getAttribute?.('data-api-url') || 'http://localhost:4000';
  const wsBase = apiBase.replace(/^http/, 'ws');

  // 2. Manage anonymous session
  let sessionId = localStorage.getItem('saas_chat_session_id');
  if (!sessionId) {
    sessionId = 'web_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('saas_chat_session_id', sessionId);
  }

  // 3. Inject CSS Styles
  const style = document.createElement('style');
  style.textContent = `
    .saas-chat-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      z-index: 999999;
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .saas-chat-launcher:hover { transform: scale(1.08); }
    .saas-chat-modal {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 580px;
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 1px solid rgba(0,0,0,0.08);
    }
    .saas-chat-header {
      background: #1e293b;
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
    .saas-chat-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8fafc;
    }
    .saas-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }
    .saas-msg-user {
      align-self: flex-end;
      background: #2563eb;
      color: white;
      border-bottom-right-radius: 2px;
    }
    .saas-msg-bot {
      align-self: flex-start;
      background: #ffffff;
      color: #1e293b;
      border-bottom-left-radius: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .saas-chat-input-row {
      display: flex;
      padding: 12px;
      background: white;
      border-top: 1px solid #e2e8f0;
    }
    .saas-chat-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 14px;
      outline: none;
    }
    .saas-chat-send {
      margin-left: 8px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);

  // 4. Create DOM elements
  const launcher = document.createElement('div');
  launcher.className = 'saas-chat-launcher';
  launcher.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

  const modal = document.createElement('div');
  modal.className = 'saas-chat-modal';
  modal.innerHTML = `
    <div class="saas-chat-header">
      <span>AI Assistant</span>
      <span style="cursor: pointer; font-size: 18px;" id="saas-close-chat">&times;</span>
    </div>
    <div class="saas-chat-messages" id="saas-chat-msg-container">
      <div class="saas-msg saas-msg-bot">Hello! How can I assist you today?</div>
    </div>
    <div class="saas-chat-input-row">
      <input type="text" class="saas-chat-input" id="saas-chat-text" placeholder="Type a message..." />
      <button class="saas-chat-send" id="saas-chat-send-btn">➤</button>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(modal);

  // 5. Setup Toggle and Messaging Logic
  let isOpen = false;
  let socket: WebSocket | null = null;

  launcher.addEventListener('click', () => {
    isOpen = !isOpen;
    modal.style.display = isOpen ? 'flex' : 'none';
    if (isOpen && !socket) {
      connectWebSocket();
    }
  });

  modal.querySelector('#saas-close-chat')?.addEventListener('click', () => {
    isOpen = false;
    modal.style.display = 'none';
  });

  const msgContainer = modal.querySelector('#saas-chat-msg-container') as HTMLDivElement;
  const inputEl = modal.querySelector('#saas-chat-text') as HTMLInputElement;
  const sendBtn = modal.querySelector('#saas-chat-send-btn') as HTMLButtonElement;

  function appendMessage(text: string, type: 'user' | 'bot') {
    const bubble = document.createElement('div');
    bubble.className = `saas-msg saas-msg-${type}`;
    bubble.textContent = text;
    msgContainer.appendChild(bubble);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    appendMessage(text, 'user');

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'inbound_message',
        tenantId,
        sessionId,
        text,
      }));
    } else {
      setTimeout(() => {
        appendMessage('I received your message! Connecting to live assistant...', 'bot');
      }, 500);
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  function connectWebSocket() {
    try {
      socket = new WebSocket(`${wsBase}/ws/webchat?tenantId=${tenantId}&sessionId=${sessionId}`);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'bot_message' && data.text) {
            appendMessage(data.text, 'bot');
          }
        } catch (e) {}
      };
      socket.onclose = () => {
        socket = null;
      };
    } catch (err) {
      console.warn('Chat widget WebSocket could not connect:', err);
    }
  }
})();
