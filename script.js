document.addEventListener('DOMContentLoaded', () => {
    // OpenRouter API key
    const OPENROUTER_API_KEY = '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';
    
    // DOM Elements
    const messagesContainer = document.getElementById('messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const modelSelect = document.getElementById('model-select');
    const currentModelSpan = document.getElementById('current-model');
    const newChatButton = document.getElementById('new-chat');
    const typingIndicator = document.querySelector('.typing-indicator');
    const themeToggleButton = document.querySelector('.feature-btn[title="Toggle Theme"]');
    const clearChatButton = document.querySelector('.feature-btn[title="Clear Chat"]');
    const historyContainer = document.querySelector('.history');
    
    // State
    let chatHistory = [];
    let currentChat = [];
    let chatCounter = 0;
    
    // Model mapping for OpenRouter - only Mistral 7B is supported
    const modelMapping = {
        'mistral': 'mistralai/mistral-7b-instruct'
    };
    
    // Initialize
    function init() {
        setupEventListeners();
        userInput.focus();
        
        // Check for saved chats
        loadChatsFromLocalStorage();
        
        // Check for saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Send message on button click
        sendButton.addEventListener('click', handleSendMessage);
        
        // Send message on Enter key (but allow Shift+Enter for new lines)
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        
        // Change model
        modelSelect.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            currentModelSpan.textContent = modelSelect.options[modelSelect.selectedIndex].text;
            addAnimationClass(currentModelSpan, 'highlight');
        });
        
        // New chat
        newChatButton.addEventListener('click', startNewChat);
        
        // Toggle theme
        themeToggleButton.addEventListener('click', toggleTheme);
        
        // Clear chat
        clearChatButton.addEventListener('click', clearChat);
        
        // Auto-resize textarea as user types
        userInput.addEventListener('input', autoResizeTextarea);
        
        // Animation for buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                button.classList.add('btn-press');
                setTimeout(() => button.classList.remove('btn-press'), 200);
            });
        });
    }
    
    // Handle sending a message
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input and adjust size
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Send to API and get response
            const response = await sendToAI(message);
            
            // Hide typing indicator
            hideTypingIndicator();
            
            // Add AI response to chat
            if (response) {
                addMessageToChat('ai', response);
            } else {
                throw new Error('No response from AI');
            }
        } catch (error) {
            console.error('Error getting response:', error);
            hideTypingIndicator();
            addMessageToChat('ai', 'Sorry, I encountered an error. Please try again. If this persists, it may be a CORS issue or API limit - check the console for details.');
        }
        
        // Save chat to localStorage
        saveChatsToLocalStorage();
    }
    
    // Add a message to the chat
    function addMessageToChat(sender, text) {
        // Create message elements
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        // Format code blocks in the text if any
        const formattedText = formatMessage(text);
        messageText.innerHTML = formattedText;
        
        // Assemble message
        messageContent.appendChild(avatar);
        messageContent.appendChild(messageText);
        messageDiv.appendChild(messageContent);
        
        // Add to messages container
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Update chat history
        currentChat.push({ role: sender === 'ai' ? 'assistant' : 'user', content: text });
        
        // Animate entrance
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // Format message with code highlighting
    function formatMessage(text) {
        // Basic markdown-like formatting
        const codeBlockRegex = /```([\s\S]*?)```/g;
        const inlineCodeRegex = /`([^`]+)`/g;
        
        // Handle code blocks
        text = text.replace(codeBlockRegex, (match, code) => {
            return '<pre><code>' + code + '</code></pre>';
        });
        
        // Handle inline code
        text = text.replace(inlineCodeRegex, (match, code) => {
            return '<code>' + code + '</code>';
        });
        
        // Handle line breaks
        text = text.replace(/\n/g, '<br>');
        
        // Wrap in paragraph if not already wrapped
        if (!text.startsWith('<pre>') && !text.startsWith('<p>')) {
            const paragraphs = text.split('<br><br>');
            text = paragraphs.map(p => '<p>' + p + '</p>').join('');
        }
        
        return text;
    }
    
    // Send message to AI using OpenRouter API
    async function sendToAI(message) {
        const model = modelMapping[modelSelect.value];
        
        // Prepare messages for API
        // We'll include conversation history for context
        const messages = currentChat.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        // Debug info
        console.log('Sending request to model:', model);
        console.log('Current URL:', window.location.href);
        
        // Get referrer - Using a fixed referrer for GitHub Pages deployments
        const referrer = 'https://sardheesh-9230.github.io/AI-chatbot/';
        
        // Make API request
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
                    'HTTP-Referer': referrer, // Using fixed referrer
                    'X-Title': 'MKCEGPT', // Optional title
                    'Origin': 'https://sardheesh-9230.github.io' // Add explicit origin
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    route: 'fallback' // Added to improve routing
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error('API Error: ' + response.status + ' - ' + errorText);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error calling OpenRouter API:', error);
            throw error;
        }
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        typingIndicator.classList.add('active');
    }
    
    // Hide typing indicator
    function hideTypingIndicator() {
        typingIndicator.classList.remove('active');
    }
    
    // Start a new chat
    function startNewChat() {
        // Save current chat if it has messages
        if (currentChat.length > 0) {
            const chatTitle = currentChat[0].content.substring(0, 30) + '...';
            chatHistory.push({
                id: 'chat-' + Date.now(),
                title: chatTitle,
                messages: [...currentChat]
            });
            updateChatHistory();
        }
        
        // Clear current chat
        clearChat();
        
        // Add animation to new chat button
        addAnimationClass(newChatButton, 'highlight');
    }
    
    // Clear the current chat
    function clearChat() {
        // Remove all messages except the welcome message
        while (messagesContainer.children.length > 1) {
            messagesContainer.removeChild(messagesContainer.lastChild);
        }
        
        // Reset current chat
        currentChat = [];
        
        // Add welcome message to current chat
        const welcomeText = messagesContainer.querySelector('.welcome-message .message-text p').textContent;
        currentChat.push({ role: 'assistant', content: welcomeText });
        
        // Save to localStorage
        saveChatsToLocalStorage();
    }
    
    // Toggle between light and dark theme
    function toggleTheme() {
        const body = document.body;
        const isDarkTheme = body.getAttribute('data-theme') === 'dark';
        
        if (isDarkTheme) {
            body.removeAttribute('data-theme');
            themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
        
        // Add highlight animation to the button
        addAnimationClass(themeToggleButton, 'highlight');
    }
    
    // Update chat history in sidebar
    function updateChatHistory() {
        historyContainer.innerHTML = '';
        
        if (chatHistory.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-history';
            emptyMessage.textContent = 'No saved chats yet';
            historyContainer.appendChild(emptyMessage);
            return;
        }
        
        chatHistory.forEach((chat, index) => {
            const chatItem = document.createElement('div');
            chatItem.className = 'history-item';
            chatItem.innerHTML = 
                '<i class="fas fa-comment"></i>' +
                '<span>' + chat.title + '</span>';
            
            chatItem.addEventListener('click', () => {
                loadChat(index);
            });
            
            historyContainer.appendChild(chatItem);
            
            // Staggered animation
            setTimeout(() => {
                chatItem.style.opacity = '1';
                chatItem.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }
    
    // Load a saved chat
    function loadChat(index) {
        if (index >= chatHistory.length) return;
        
        // Save current chat if needed
        if (currentChat.length > 1) {
            const confirmLoad = confirm('Loading a saved chat will replace your current conversation. Continue?');
            if (!confirmLoad) return;
        }
        
        const chat = chatHistory[index];
        
        // Clear current messages
        messagesContainer.innerHTML = '';
        
        // Reset current chat
        currentChat = [];
        
        // Add all messages from saved chat
        chat.messages.forEach(msg => {
            addMessageToChat(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
        });
        
        // Remove from history
        chatHistory.splice(index, 1);
        
        // Update history display
        updateChatHistory();
        
        // Save to localStorage
        saveChatsToLocalStorage();
    }
    
    // Save chats to localStorage
    function saveChatsToLocalStorage() {
        const dataToSave = {
            currentChat: currentChat,
            chatHistory: chatHistory
        };
        
        try {
            localStorage.setItem('aiChatData', JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }
    
    // Load chats from localStorage
    function loadChatsFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('aiChatData');
            
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                if (parsedData.currentChat && Array.isArray(parsedData.currentChat)) {
                    currentChat = parsedData.currentChat;
                    
                    // Clear default welcome message
                    messagesContainer.innerHTML = '';
                    
                    // Re-add messages from saved current chat
                    currentChat.forEach(msg => {
                        addMessageToChat(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
                    });
                }
                
                if (parsedData.chatHistory && Array.isArray(parsedData.chatHistory)) {
                    chatHistory = parsedData.chatHistory;
                    updateChatHistory();
                }
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
    }
    
    // Auto-resize textarea as user types
    function autoResizeTextarea() {
        // Reset height to ensure proper calculation
        userInput.style.height = 'auto';
        
        // Set new height based on scroll height (content)
        const newHeight = Math.min(userInput.scrollHeight, 150); 
        userInput.style.height = newHeight + 'px';
    }
    
    // Add and remove animation class
    function addAnimationClass(element, className) {
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, 1500);
    }
    
    // For accessibility - allows Tab to work in textarea
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            
            // Insert tab character
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            
            // Move cursor position after inserted tab
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
    
    // Initialize the app
    init();
});
