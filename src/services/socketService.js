const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Store connected users: userId -> socketId
const connectedUsers = new Map();

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication middleware
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userRole = decoded.role;

            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`✅ User ${socket.userId} connected via WebSocket`);

        // Store user connection
        connectedUsers.set(socket.userId, socket.id);

        // Join user-specific room
        socket.join(`user:${socket.userId}`);

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`❌ User ${socket.userId} disconnected`);
            connectedUsers.delete(socket.userId);
        });

        // Handle notification read acknowledgment
        socket.on('notification:read', (data) => {
            console.log(`User ${socket.userId} marked notification ${data.notificationId} as read`);
        });
    });

    console.log('✅ WebSocket server initialized');
    return io;
};

// Send notification to specific user
const sendNotificationToUser = (userId, notification) => {
    if (!io) {
        console.error('Socket.io not initialized');
        return;
    }

    io.to(`user:${userId}`).emit('notification:new', {
        notificationId: notification.notification_id,
        message: notification.message,
        type: notification.notification_type,
        sentAt: notification.sent_at,
        isRead: notification.is_read,
        bookingId: notification.booking_id
    });

    console.log(`📨 Sent notification to user ${userId}`);
};

// Send notification to multiple users
const sendNotificationToUsers = (userIds, notification) => {
    if (!io) {
        console.error('Socket.io not initialized');
        return;
    }

    userIds.forEach(userId => {
        sendNotificationToUser(userId, notification);
    });
};

// Broadcast to all connected users
const broadcastNotification = (notification) => {
    if (!io) {
        console.error('Socket.io not initialized');
        return;
    }

    io.emit('notification:broadcast', {
        notificationId: notification.notification_id,
        message: notification.message,
        type: notification.notification_type,
        sentAt: notification.sent_at,
        isRead: notification.is_read
    });

    console.log('📢 Broadcast notification to all users');
};

// Get connected users count
const getConnectedUsersCount = () => {
    return connectedUsers.size;
};

// Check if user is connected
const isUserConnected = (userId) => {
    return connectedUsers.has(userId);
};

module.exports = {
    initializeSocket,
    sendNotificationToUser,
    sendNotificationToUsers,
    broadcastNotification,
    getConnectedUsersCount,
    isUserConnected
};
