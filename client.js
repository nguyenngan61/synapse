const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    // Lấy tất cả các phần tử HTML
    const form = document.getElementById('input-form');
    const input = document.getElementById('message-input');
    const messages = document.getElementById('message-area');
    const typingIndicator = document.getElementById('typing-indicator');
    const userList = document.getElementById('user-list');
    const showUsersBtn = document.getElementById('show-users-btn');
    const usersModalOverlay = document.getElementById('users-modal-overlay');
    const closeUsersModalBtn = document.getElementById('close-users-modal-btn');
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username-input');
    const emojiBtn = document.getElementById('emoji-btn');
    const replyingBanner = document.getElementById('replying-to-banner');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;
    const logoImg = document.getElementById('logo-img');
    const showChannelsBtn = document.getElementById('show-channels-btn');
    const channelsModalOverlay = document.getElementById('channels-modal-overlay');
    const closeChannelsModalBtn = document.getElementById('close-channels-modal-btn');
    const channelList = document.getElementById('channel-list');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const chatTitle = document.querySelector('.app-header h1');
    const pmNotificationDot = document.getElementById('pm-notification-dot');

    // Các biến trạng thái
    let user = null;
    let currentChat = { type: 'channel', name: '#synapse' };
    let unreadMessages = {};
    let lastMessageInfo = { user: null, timestamp: null };
    let currentUsers = [];
    let emojiPicker = null;
    let replyingToMessage = null;
    const originalTitle = document.title;
    let notificationCount = 0;
    const notificationSound = new Audio('/sounds/notification.mp3');
    const CONSECUTIVE_MESSAGE_TIMEOUT = 5 * 60 * 1000;

    // --- LOGIC DARK MODE ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
            if (logoImg) logoImg.src = 'images/logo-dark.png';
        } else {
            body.classList.remove('dark-mode');
            themeToggleBtn.textContent = '🌙';
            if (logoImg) logoImg.src = 'images/logo-light.png';
        }
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- LOGIC ĐĂNG NHẬP & MODALS ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (username) {
            user = username;
            socket.emit('user joined', { username, channel: currentChat.name });
            loginOverlay.classList.add('hidden');
            chatTitle.textContent = currentChat.name.replace('#', '').toUpperCase();
        }
    });
    showUsersBtn.addEventListener('click', () => {
        usersModalOverlay.classList.remove('hidden');
        pmNotificationDot.classList.add('hidden');
    });
    closeUsersModalBtn.addEventListener('click', () => { usersModalOverlay.classList.add('hidden'); });
    usersModalOverlay.addEventListener('click', (e) => { if (e.target === usersModalOverlay) { usersModalOverlay.classList.add('hidden'); } });
    showChannelsBtn.addEventListener('click', () => { channelsModalOverlay.classList.remove('hidden'); });
    closeChannelsModalBtn.addEventListener('click', () => { channelsModalOverlay.classList.add('hidden'); });
    channelsModalOverlay.addEventListener('click', (e) => { if (e.target === channelsModalOverlay) { channelsModalOverlay.classList.add('hidden'); } });

    // --- LOGIC KÊNH CHAT ---
    function updateChannelList(channels, activeChannelName) {
        if (!channelList) return;
        channelList.innerHTML = '';
        channels.forEach(channel => {
            const channelItem = document.createElement('li');
            channelItem.textContent = channel;
            if (channel === activeChannelName) { channelItem.classList.add('active'); }
            channelItem.addEventListener('click', () => {
                if (currentChat.type !== 'channel' || currentChat.name !== channel) {
                    socket.emit('join channel', { previousChannel: currentChat.name, newChannel: channel });
                    currentChat = { type: 'channel', name: channel };
                    chatTitle.textContent = currentChat.name.replace('#', '').toUpperCase();
                    updateChannelList(channels, currentChat.name);
                }
                channelsModalOverlay.classList.add('hidden');
            });
            channelList.appendChild(channelItem);
        });
    }

    // --- LOGIC DANH SÁCH USER ---
    function updateUserList() {
        if (!userList) return;
        userList.innerHTML = '';
        currentUsers
            .sort((a, b) => {
                if (a.username === user) return -1;
                if (b.username === user) return 1;
                if (a.status === 'online' && b.status !== 'online') return -1;
                if (b.status === 'online' && a.status !== 'online') return 1;
                return 0;
            })
            .forEach(u => {
                if (!u || !u.username) return;
                const userItem = document.createElement('li');
                userItem.className = u.status;
                if (u.username === user) {
                    userItem.classList.add('self');
                }
                if (u.username !== user && u.status === 'online') {
                    userItem.addEventListener('click', () => {
                        currentChat = { type: 'private', name: u.username };
                        chatTitle.textContent = `Chat with ${u.username}`;
                        socket.emit('fetch private history', { user1: user, user2: u.username });
                        if (unreadMessages[u.username]) {
                            unreadMessages[u.username] = 0;
                            updateUserList();
                        }
                        usersModalOverlay.classList.add('hidden');
                    });
                }
                const statusDot = document.createElement('span');
                statusDot.className = 'status-dot';
                const username = document.createElement('span');
                username.className = 'username';
                username.textContent = u.username;
                userItem.appendChild(statusDot);
                userItem.appendChild(username);
                if (unreadMessages[u.username] > 0) {
                    const unreadCount = document.createElement('span');
                    unreadCount.className = 'unread-count';
                    unreadCount.textContent = unreadMessages[u.username];
                    userItem.appendChild(unreadCount);
                }
                if (u.status === 'offline') {
                    const lastSeen = document.createElement('span');
                    lastSeen.className = 'last-seen';
                    lastSeen.textContent = formatTimeAgo(u.lastSeen);
                    userItem.appendChild(lastSeen);
                }
                userList.appendChild(userItem);
            });
    }

    // --- LOGIC TÌM KIẾM ---
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            socket.emit('join channel', { newChannel: currentChat.name });
            return;
        }
        try {
            const response = await fetch(`/search?term=${encodeURIComponent(searchTerm)}&room=${encodeURIComponent(currentChat.name)}`);
            const results = await response.json();
            messages.innerHTML = '';
            const resultsBanner = document.createElement('div');
            resultsBanner.id = 'search-results-banner';
            resultsBanner.innerHTML = `<span>Kết quả tìm kiếm cho: "<strong>${searchTerm}</strong>"</span><button id="clear-search-btn">Xóa tìm kiếm</button>`;
            messages.prepend(resultsBanner);
            results.forEach(msg => addMessage(msg, false));
            document.getElementById('clear-search-btn').addEventListener('click', () => {
                searchInput.value = '';
                socket.emit('join channel', { newChannel: currentChat.name });
            });
        } catch (error) { console.error('Lỗi khi tìm kiếm:', error); }
    });

    // --- LOGIC GỬI FILE & EMOJI ---
    emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); if (!emojiPicker) { emojiPicker = document.createElement('emoji-picker'); form.appendChild(emojiPicker); emojiPicker.addEventListener('emoji-click', event => { input.value += event.detail.unicode; }); } emojiPicker.classList.toggle('visible'); });
    document.addEventListener('click', () => { if (emojiPicker && emojiPicker.classList.contains('visible')) { emojiPicker.classList.remove('visible'); } });
    attachBtn.addEventListener('click', () => { fileInput.click(); });
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return; const formData = new FormData(); formData.append('image', file);
        try {
            const response = await fetch('/upload-image', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Lỗi tải ảnh lên.');
            const data = await response.json();
            let messageData;
            if (currentChat.type === 'channel') {
                messageData = { user, content: data.imageUrl, type: 'image', room: currentChat.name };
                socket.emit('chat message', messageData);
            } else {
                messageData = { fromUser: user, toUser: currentChat.name, content: data.imageUrl, type: 'image' };
                socket.emit('private message', messageData);
            }
        } catch (error) { alert('Không thể gửi ảnh, vui lòng thử lại.'); }
        e.target.value = null;
    });

    // --- LOGIC TIN NHẮN ---
    const addMessage = (message, isPrivate = false) => {
        const item = document.createElement('li');
        item.id = message._id;
        const messageTime = new Date(message.timestamp);
        const lastMessageTime = lastMessageInfo.timestamp ? new Date(lastMessageInfo.timestamp) : null;
        const senderName = isPrivate ? message.fromUser : message.user;
        const isConsecutive = senderName === lastMessageInfo.user && !message.parentMessage && lastMessageTime && (messageTime - lastMessageTime) < CONSECUTIVE_MESSAGE_TIMEOUT;
        item.classList.add(isConsecutive ? 'consecutive-message' : 'first-message');

        if (!isPrivate && message.parentMessage && message.parentMessage.user) {
            const quote = document.createElement('div'); quote.className = 'parent-message-quote';
            const quoteUser = document.createElement('strong'); quoteUser.textContent = message.parentMessage.user;
            const quoteContent = document.createElement('span');
            const contentPreview = message.parentMessage.content.startsWith('http') ? '[Hình ảnh]' : (message.parentMessage.content.length > 50 ? message.parentMessage.content.substring(0, 50) + '...' : message.parentMessage.content);
            quoteContent.textContent = `: ${contentPreview}`;
            quote.appendChild(quoteUser); quote.appendChild(quoteContent); item.appendChild(quote);
        }
        const sender = document.createElement('strong'); sender.textContent = senderName;
        item.appendChild(sender);
        if (message.type === 'image') {
            const img = document.createElement('img'); img.src = message.content; img.className = 'chat-image';
            item.appendChild(img);
        } else {
            const content = document.createElement('span');
            content.className = 'message-content';
            content.textContent = message.content;
            item.appendChild(content);
        }
        if (senderName === user) { item.classList.add('my-message'); } else { item.classList.add('other-message'); }
        
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'message-buttons';
        if (!isPrivate) {
            const replyBtn = document.createElement('button'); replyBtn.className = 'reply-btn'; replyBtn.textContent = 'Reply';
            replyBtn.onclick = () => {
                replyingToMessage = message;
                replyingBanner.innerHTML = `<div id="replying-to-banner-content"><strong>Replying to ${message.user}:</strong> ${message.type === 'image' ? '[Hình ảnh]' : message.content}</div><button id="cancel-reply-btn">&times;</button>`;
                replyingBanner.classList.remove('hidden');
                document.getElementById('cancel-reply-btn').addEventListener('click', () => {
                    replyingToMessage = null;
                    replyingBanner.classList.add('hidden');
                });
                input.focus();
            };
            buttonsWrapper.appendChild(replyBtn);
        }
        if (senderName === user && !isPrivate) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => { if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) { socket.emit('delete message', message._id); } };
            buttonsWrapper.appendChild(deleteBtn);
            if (message.type === 'text') {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.textContent = 'Edit';
                editBtn.onclick = () => {
                    const messageContentElement = item.querySelector('.message-content');
                    if (!messageContentElement) return;
                    const currentContent = messageContentElement.textContent;
                    const editInput = document.createElement('input'); editInput.type = 'text'; editInput.className = 'message-content-input'; editInput.value = currentContent;
                    messageContentElement.replaceWith(editInput);
                    editInput.focus();
                    editInput.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const newContent = editInput.value.trim();
                            if (newContent && newContent !== currentContent) {
                                socket.emit('edit message', { messageId: message._id, newContent });
                            }
                            editInput.replaceWith(messageContentElement);
                            messageContentElement.textContent = newContent || currentContent;
                        } else if (e.key === 'Escape') {
                            editInput.replaceWith(messageContentElement);
                        }
                    };
                };
                buttonsWrapper.appendChild(editBtn);
            }
        }
        item.appendChild(buttonsWrapper);
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
        lastMessageInfo = { user: senderName, timestamp: message.timestamp };
    };

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!input.value) return;
        if (currentChat.type === 'channel') {
            const messageData = { user, content: input.value, type: 'text', room: currentChat.name, parentMessage: replyingToMessage ? { _id: replyingToMessage._id, user: replyingToMessage.user, content: replyingToMessage.content } : null };
            socket.emit('chat message', messageData);
        } else {
            const messageData = { fromUser: user, toUser: currentChat.name, content: input.value, type: 'text' };
            socket.emit('private message', messageData);
        }
        input.value = '';
        replyingToMessage = null;
        replyingBanner.classList.add('hidden');
        socket.emit('stop typing', { room: currentChat.name });
    });
    
    // --- LẮNG NGHE CÁC SỰ KIỆN TỪ SERVER ---
    socket.on('channels', (channels) => { updateChannelList(channels, currentChat.name); });
    socket.on('load old messages', (oldMessages) => { messages.innerHTML = ''; lastMessageInfo = { user: null, timestamp: null }; oldMessages.forEach(msg => addMessage(msg, false)); });
    socket.on('private history loaded', (history) => { messages.innerHTML = ''; lastMessageInfo = { user: null, timestamp: null }; history.forEach(msg => addMessage(msg, true)); });
    socket.on('chat message', (msg) => {
        if (currentChat.type === 'channel' && currentChat.name === msg.room) {
            typingIndicator.textContent = ''; addMessage(msg, false);
            if (document.hidden && msg.user !== user) { notificationCount++; document.title = `(${notificationCount}) ${originalTitle}`; notificationSound.currentTime = 0; notificationSound.play().catch(e => {}); }
        }
    });
    socket.on('receive private message', (msg) => {
        if (msg.fromUser === user) {
            if (currentChat.type === 'private' && currentChat.name === msg.toUser) {
                addMessage(msg, true);
            }
            return;
        }
        const chatPartner = msg.fromUser;
        const isInPrivateChatWithSender = (currentChat.type === 'private' && currentChat.name === chatPartner);
        if (isInPrivateChatWithSender) {
            addMessage(msg, true);
        } else {
            unreadMessages[chatPartner] = (unreadMessages[chatPartner] || 0) + 1;
            pmNotificationDot.classList.remove('hidden');
            updateUserList();
            if (document.hidden) {
                notificationCount++;
                document.title = `(${notificationCount}) New PM from ${chatPartner}!`;
                notificationSound.currentTime = 0;
                notificationSound.play().catch(e => {});
            }
        }
    });
    socket.on('message deleted', (messageId) => { const messageElement = document.getElementById(messageId); if (messageElement) { messageElement.remove(); } });
    socket.on('message edited', (updatedMessage) => { const messageElement = document.getElementById(updatedMessage._id); if (messageElement) { const contentElement = messageElement.querySelector('.message-content'); if (contentElement) { contentElement.textContent = updatedMessage.content; } } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { notificationCount = 0; document.title = originalTitle; } });
    
    let typingTimer; const TYPING_TIMER_LENGTH = 2000;
    input.addEventListener('input', () => { socket.emit('typing', { user, room: currentChat.name }); clearTimeout(typingTimer); typingTimer = setTimeout(() => { socket.emit('stop typing', { room: currentChat.name }); }, TYPING_TIMER_LENGTH); });
    socket.on('typing', (typingUser) => { if (currentChat.type === 'channel') typingIndicator.textContent = `${typingUser} is typing...`; });
    socket.on('stop typing', () => { typingIndicator.textContent = ''; });

    function formatTimeAgo(dateString) { const date = new Date(dateString); const now = new Date(); const seconds = Math.round((now - date) / 1000); const minutes = Math.round(seconds / 60); const hours = Math.round(minutes / 60); const days = Math.round(hours / 24); if (seconds < 60) return 'offline just now'; if (minutes < 60) return `offline ${minutes} minutes ago`; if (hours < 24) return `offline ${hours} hours ago`; return `offline ${days} days ago`; }
    socket.on('update user list', (users) => { currentUsers = users.filter(u => u != null); updateUserList(); });
});