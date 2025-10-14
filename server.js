require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: 'uploads/' });
const onlineUsers = {};
const channels = ["#synapse", "#projects", "#q-and-a"];

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
mongoose.connect(process.env.MONGO_URI).then(() => console.log('[SERVER] Kết nối MongoDB thành công!')).catch(err => console.error('[SERVER] Lỗi kết nối MongoDB:', err));

const MessageSchema = new mongoose.Schema({
    user: String, content: String, type: { type: String, default: 'text' },
    room: { type: String, required: true },
    parentMessage: { _id: String, user: String, content: String },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

const PrivateMessageSchema = new mongoose.Schema({
    fromUser: String,
    toUser: String,
    content: String,
    type: { type: String, default: 'text' },
    parentMessage: { _id: String, user: String, content: String }, // THÊM DÒNG NÀY
    timestamp: { type: Date, default: Date.now }
});
const PrivateMessage = mongoose.model('PrivateMessage', PrivateMessageSchema);

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, '')));
app.use(express.json());

app.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ error: 'Không có file ảnh nào được gửi.' }); }
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'synapse_chat_images' });
        fs.unlinkSync(req.file.path);
        res.status(200).json({ imageUrl: result.secure_url });
    } catch (error) {
        console.error('[SERVER] Lỗi tải ảnh lên Cloudinary:', error);
        res.status(500).json({ error: 'Lỗi tải ảnh lên.' });
    }
});

app.get('/search', async (req, res) => {
    const { term, room } = req.query;
    if (!term || !room) { return res.status(400).json({ error: 'Thiếu từ khóa hoặc phòng chat.' }); }
    try {
        const results = await Message.find({
            room: room,
            type: 'text',
            content: { $regex: term, $options: 'i' }
        }).sort({ timestamp: -1 });
        res.json(results);
    } catch (error) { console.error('[SERVER] Lỗi tìm kiếm tin nhắn:', error); res.status(500).json({ error: 'Lỗi server khi tìm kiếm.' }); }
});

io.on('connection', (socket) => {
    socket.on('user joined', async ({ username, channel }) => {
        onlineUsers[socket.id] = { username, status: 'online', lastSeen: null };
        socket.join(channel);
        socket.emit('channels', channels);
        io.emit('update user list', Object.values(onlineUsers));
        try {
            const messages = await Message.find({ room: channel }).sort({ timestamp: 1 });
            socket.emit('load old messages', messages);
        } catch (error) { console.error('[SERVER] Lỗi tải tin nhắn cũ:', error); }
    });

    socket.on('join channel', async ({ previousChannel, newChannel }) => {
        if (previousChannel) socket.leave(previousChannel);
        socket.join(newChannel);
        try {
            const messages = await Message.find({ room: newChannel }).sort({ timestamp: 1 });
            socket.emit('load old messages', messages);
        } catch (error) { console.error('[SERVER] Lỗi tải tin nhắn cho kênh mới:', error); }
    });

    socket.on('disconnect', () => {
        const user = onlineUsers[socket.id];
        if (user) {
            user.status = 'offline';
            user.lastSeen = new Date();
            io.emit('update user list', Object.values(onlineUsers));
            console.log(`[SERVER] User ${user.username} đã chuyển sang offline.`);
        }
    });

    socket.on('chat message', async (data) => {
        const newMessage = new Message({ user: data.user, content: data.content, type: data.type || 'text', room: data.room, parentMessage: data.parentMessage || null });
        try {
            await newMessage.save();
            io.to(data.room).emit('chat message', newMessage);
        } catch (error) { console.error('[SERVER] Lỗi lưu tin nhắn:', error); }
    });

    socket.on('private message', async (data) => {
        try {
            const newPm = new PrivateMessage({
                fromUser: data.fromUser,
                toUser: data.toUser,
                content: data.content,
                type: data.type || 'text',
                parentMessage: data.parentMessage || null // THÊM DÒNG NÀY
            });
            await newPm.save();
            const recipientSocketId = Object.keys(onlineUsers).find(id => onlineUsers[id].username === data.toUser);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive private message', newPm);
            }
            socket.emit('receive private message', newPm);
        } catch (error) { console.error('[SERVER] Lỗi lưu tin nhắn riêng:', error); }
    });

    socket.on('delete private message', async (messageId) => {
        try {
            const deletedMessage = await PrivateMessage.findByIdAndDelete(messageId);
            if (deletedMessage) {
                // Tìm socket ID của người nhận và gửi sự kiện xóa
                const recipientSocketId = Object.keys(onlineUsers).find(id => onlineUsers[id].username === deletedMessage.toUser);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('private message deleted', messageId);
                }
                // Gửi sự kiện xóa cho chính người gửi
                socket.emit('private message deleted', messageId);
            }
        } catch (error) {
            console.error('[SERVER] Lỗi xóa tin nhắn riêng:', error);
        }
    });

    socket.on('edit private message', async ({ messageId, newContent }) => {
        try {
            const updatedMessage = await PrivateMessage.findByIdAndUpdate(
                messageId,
                { content: newContent },
                { new: true }
            );
            if (updatedMessage) {
                // Tìm socket ID của người nhận và gửi tin nhắn đã cập nhật
                const recipientSocketId = Object.keys(onlineUsers).find(id => onlineUsers[id].username === updatedMessage.toUser);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('private message edited', updatedMessage);
                }
                // Gửi lại cho chính người gửi
                socket.emit('private message edited', updatedMessage);
            }
        } catch (error) {
            console.error('[SERVER] Lỗi sửa tin nhắn riêng:', error);
        }
    });

    socket.on('fetch private history', async ({ user1, user2 }) => {
        try {
            const history = await PrivateMessage.find({ $or: [{ fromUser: user1, toUser: user2 }, { fromUser: user2, toUser: user1 }] }).sort({ timestamp: 1 });
            socket.emit('private history loaded', history);
        } catch (error) { console.error('[SERVER] Lỗi tải lịch sử chat riêng:', error); }
    });

    socket.on('delete message', async (messageId) => {
        try {
            const deletedMessage = await Message.findByIdAndDelete(messageId);
            if (deletedMessage) { io.to(deletedMessage.room).emit('message deleted', messageId); }
        } catch (error) { console.error('[SERVER] Lỗi xóa tin nhắn:', error); }
    });

    socket.on('edit message', async ({ messageId, newContent }) => {
        try {
            const updatedMessage = await Message.findByIdAndUpdate(messageId, { content: newContent }, { new: true });
            if (updatedMessage) { io.to(updatedMessage.room).emit('message edited', updatedMessage); }
        } catch (error) { console.error('[SERVER] Lỗi sửa tin nhắn:', error); }
    });

    socket.on('typing', (data) => { socket.to(data.room).emit('typing', data.user); });
    socket.on('stop typing', (data) => { socket.to(data.room).emit('stop typing'); });
});

server.listen(PORT, () => {
    console.log(`[SERVER] Server đang chạy tại cổng ${PORT}`);
});