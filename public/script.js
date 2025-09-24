class WebSocketChatbot {
            constructor() {
                // Configuration
                this.WS_URL = 'wss://pbree1a3rh.execute-api.ap-southeast-2.amazonaws.com/dev/';
                this.MAX_RECONNECT_ATTEMPTS = 5;
                
                // State
                this.ws = null;
                this.connectionStatus = 'disconnected';
                this.reconnectAttempts = 0;
                this.reconnectTimeout = null;
                this.sessionId = this.getSessionId();
                this.messageCount = 0;
                this.currentStreamingMessage = null;
                
                // DOM elements
                this.elements = {
                    chatContainer: document.getElementById('chatContainer'),
                    textInput: document.getElementById('text'),
                    sendButton: document.getElementById('send'),
                    statusIndicator: document.getElementById('statusIndicator'),
                    statusText: document.getElementById('statusText'),
                    reconnectBtn: document.getElementById('reconnectBtn'),
                    connectionMessage: document.getElementById('connectionMessage')
                };
                
                this.init();
            }
            
            init() {
                this.attachEventListeners();
                this.connectWebSocket();
            }
            
            getSessionId() {
                let sessionId = sessionStorage.getItem('chatSessionId');
                if (!sessionId) {
                    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    sessionStorage.setItem('chatSessionId', sessionId);
                }
                return sessionId;
            }
            
            attachEventListeners() {
                // Send message on button click
                this.elements.sendButton.addEventListener('click', () => {
                    this.sendMessage();
                });
                
                // Send message on Enter key
                this.elements.textInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        this.sendMessage();
                    }
                });
                
                // Reconnect button
                this.elements.reconnectBtn.addEventListener('click', () => {
                    this.reconnectAttempts = 0;
                    this.connectWebSocket();
                });
            }
            
            connectWebSocket() {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
                
                this.updateConnectionStatus('connecting');
                
                try {
                    this.ws = new WebSocket(this.WS_URL);
                    
                    this.ws.onopen = () => {
                        console.log('WebSocket connected');
                        this.updateConnectionStatus('connected');
                        this.reconnectAttempts = 0;
                        
                        if (this.reconnectTimeout) {
                            clearTimeout(this.reconnectTimeout);
                            this.reconnectTimeout = null;
                        }
                        
                        // Hide welcome connection message
                        this.elements.connectionMessage.style.display = 'none';
                    };
                    
                    this.ws.onclose = (event) => {
                        console.log('WebSocket disconnected:', event.code, event.reason);
                        this.updateConnectionStatus('disconnected');
                        
                        // Clear any streaming message
                        this.clearStreamingMessage();
                        
                        // Attempt to reconnect if not a normal closure
                        if (event.code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                            this.scheduleReconnect();
                        }
                    };
                    
                    this.ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        this.updateConnectionStatus('error');
                    };
                    
                    this.ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            this.handleWebSocketMessage(data);
                        } catch (error) {
                            console.error('Error parsing WebSocket message:', error);
                        }
                    };
                    
                } catch (error) {
                    console.error('Error creating WebSocket connection:', error);
                    this.updateConnectionStatus('error');
                }
            }
            
            scheduleReconnect() {
                this.reconnectAttempts++;
                const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                console.log(`Reconnecting in ${timeout}ms... (attempt ${this.reconnectAttempts})`);
                
                this.reconnectTimeout = setTimeout(() => {
                    this.connectWebSocket();
                }, timeout);
            }
            
            updateConnectionStatus(status) {
                this.connectionStatus = status;
                const indicator = this.elements.statusIndicator;
                const text = this.elements.statusText;
                const reconnectBtn = this.elements.reconnectBtn;
                const textInput = this.elements.textInput;
                const sendButton = this.elements.sendButton;
                
                indicator.className = `status-indicator status-${status}`;
                
                switch (status) {
                    case 'connected':
                        text.textContent = 'Connected';
                        reconnectBtn.style.display = 'none';
                        textInput.disabled = false;
                        textInput.placeholder = 'Type your message...';
                        sendButton.disabled = false;
                        break;
                    case 'connecting':
                        text.textContent = 'Connecting...';
                        reconnectBtn.style.display = 'none';
                        textInput.disabled = true;
                        textInput.placeholder = 'Connecting...';
                        sendButton.disabled = true;
                        break;
                    case 'disconnected':
                    case 'error':
                        text.textContent = status === 'error' ? 'Connection Error' : 'Disconnected';
                        reconnectBtn.style.display = 'inline-block';
                        textInput.disabled = true;
                        textInput.placeholder = 'Disconnected...';
                        sendButton.disabled = true;
                        break;
                }
            }
            
            handleWebSocketMessage(data) {
                console.log('Received message:', data);
                
                switch (data.type) {
                    case 'system':
                        console.log('System message:', data.message);
                        break;
                        
                    case 'typing':
                        this.showTypingIndicator();
                        break;
                        
                    case 'chunk':
                        this.handleStreamingChunk(data);
                        break;
                        
                    case 'complete':
                        this.handleCompleteMessage(data);
                        break;
                        
                    case 'error':
                        this.handleErrorMessage(data);
                        break;
                        
                    default:
                        console.log('Unknown message type:', data.type);
                }
            }
            
            sendMessage(messageButton) {
                let message = ""
                if(messageButton){
                    this.appendMessage('user', message);
                    message = messageButton
                }
                else{
                    message = this.elements.textInput.value.trim();
                }
                
                if (!message || this.connectionStatus !== 'connected') return;
                
                // Add user message to chat
                this.appendMessage('user', message);
                
                // Send to WebSocket
                const messageData = {
                    action: 'sendMessage',
                    message: message,
                    sessionId: this.sessionId
                };
                
                this.ws.send(JSON.stringify(messageData));
                
                // Clear input
                this.elements.textInput.value = '';
            }
            
            showTypingIndicator() {
                this.clearStreamingMessage();
                
                const typingId = `typing-${this.messageCount++}`;
                const typingHtml = `
                    <div class="message model" id="${typingId}">
                        <div class="avatar"> </div>
                        <div class="message-content">
                            <div class="typing-indicator">
                                <div class="typing-dots">
                                    <div class="typing-dot"></div>
                                    <div class="typing-dot"></div>
                                    <div class="typing-dot"></div>
                                </div>
                                <span style="margin-left: 0.5rem;"> Thinking...</span>
                            </div>
                        </div>
                    </div>
                `;
                
                this.elements.chatContainer.insertAdjacentHTML('beforeend', typingHtml);
                this.currentStreamingMessage = typingId;
                // this.scrollToBottom();
            }
            
            handleStreamingChunk(data) {
                if (!this.currentStreamingMessage || !data.fullResponse) return;
                
                const messageElement = document.getElementById(this.currentStreamingMessage);
                if (messageElement) {
                    const contentDiv = messageElement.querySelector('.message-content');
                    if (contentDiv) {
                        messageElement.classList.add('streaming-message');
                        
                        try {
                            contentDiv.innerHTML = marked.parse(data.fullResponse);
                        } catch (error) {
                            contentDiv.textContent = data.fullResponse;
                        }
                        // this.scrollToBottom();
                    }
                }
            }
            
            handleCompleteMessage(data) {
                if (this.currentStreamingMessage) {
                    const messageElement = document.getElementById(this.currentStreamingMessage);
                    if (messageElement) {
                        // Remove streaming effect
                        messageElement.classList.remove('streaming-message');
                        
                        // Update with final content
                        const contentDiv = messageElement.querySelector('.message-content');
                        if (contentDiv) {
                            try {
                                contentDiv.innerHTML = marked.parse(data.message);
                            } catch (error) {
                                contentDiv.textContent = data.message;
                            }
                        }
                    }
                } else {
                    // Fallback: create new message if streaming message doesn't exist
                    this.appendMessage('model', data.message);
                }
                
                this.currentStreamingMessage = null;
                //this.scrollToBottom();
            }
            
            handleErrorMessage(data) {
                this.clearStreamingMessage();
                this.appendMessage('model', data.message || 'An error occurred', null, true);
            }
            
            clearStreamingMessage() {
                if (this.currentStreamingMessage) {
                    const element = document.getElementById(this.currentStreamingMessage);
                    if (element) {
                        element.remove();
                    }
                    this.currentStreamingMessage = null;
                }
            }
            
            appendMessage(sender, message, id = null, isError = false) {
                const messageId = id || `message-${this.messageCount++}`;
                const errorClass = isError ? ' error' : '';
                const avatar = sender === 'user' ? '👤' : '🤖';
                
                const messageHtml = `
                    <div class="message ${sender}${errorClass}" id="${messageId}">
                        <div class="avatar">${avatar}</div>
                        <div class="message-content">${this.processMessage(message)}</div>
                    </div>
                `;
                
                this.elements.chatContainer.insertAdjacentHTML('beforeend', messageHtml);
                //this.scrollToBottom();
                
                return messageId;
            }
            
            processMessage(message) {
                try {
                    return marked.parse(message);
                } catch (error) {
                    return message;
                }
            }
            
            scrollToBottom() {
                this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
            }
            
            // Cleanup method
            disconnect() {
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                }
                if (this.ws) {
                    this.ws.close(1000, 'User disconnecting');
                }
            }
        }
        
        // Initialize the chatbot when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            window.chatbot = new WebSocketChatbot();
            window.sendMessage = (msg) => window.chatbot.sendMessage(msg);
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (window.chatbot) {
                window.chatbot.disconnect();
            }
        });