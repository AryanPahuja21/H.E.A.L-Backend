import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

const activeUsers = new Map<string, string>();

class ChatSocketService {
    private io: Server;

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            path: "/chat",
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.setupAuthentication();
        this.setupEventHandlers();
    }

    private setupAuthentication() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;

                if (!token) {
                    return next(new Error('Authentication error'));
                }

                const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

                if (!decoded || !decoded.id) {
                    return next(new Error('Invalid token'));
                }

                const user = await User.findById(decoded.id);
                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.data.user = {
                    id: decoded.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                next();
            } catch (error) {
                console.error('Socket auth error:', error);
                next(new Error('Authentication error'));
            }
        });
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const userId = socket.data.user.id;

            console.log(`User connected to chat: ${userId}`);
            activeUsers.set(userId, socket.id);

            socket.on('join_conversation', async ({ conversationId }) => {
                try {
                    const conversation = await Conversation.findById(conversationId);

                    if (!conversation || !conversation.participants.some(p =>
                        p.toString() === userId
                    )) {
                        socket.emit('error', { message: 'Access denied to this conversation' });
                        return;
                    }

                    socket.join(`conversation:${conversationId}`);
                    console.log(`User ${userId} joined conversation: ${conversationId}`);
                } catch (error) {
                    console.error('Error joining conversation:', error);
                    socket.emit('error', { message: 'Failed to join conversation' });
                }
            });

            socket.on('send_message', async ({ conversationId, receiverId, content }) => {
                try {
                    let conversation;

                    if (conversationId) {
                        conversation = await Conversation.findById(conversationId);
                        if (!conversation || !conversation.participants.some(p =>
                            p.toString() === userId
                        )) {
                            socket.emit('error', { message: 'Invalid conversation' });
                            return;
                        }
                    } else if (receiverId) {
                        conversation = await Conversation.findOne({
                            participants: { $all: [userId, receiverId] }
                        });

                        if (!conversation) {
                            conversation = await Conversation.create({
                                participants: [userId, receiverId]
                            });
                        }
                    } else {
                        socket.emit('error', { message: 'Missing conversation or receiver ID' });
                        return;
                    }

                    const finalReceiverId = receiverId || conversation.participants.find(p =>
                        p.toString() !== userId
                    )?.toString();

                    if (!finalReceiverId) {
                        socket.emit('error', { message: 'Could not determine receiver' });
                        return;
                    }

                    const message = await Message.create({
                        conversationId: conversation._id,
                        senderId: userId,
                        receiverId: finalReceiverId,
                        content,
                        read: false
                    });

                    const populatedMessage = await Message.findById(message._id)
                        .populate('senderId', 'name email role profileImageUrl')
                        .populate('receiverId', 'name email role profileImageUrl');

                    await Conversation.findByIdAndUpdate(conversation._id, {
                        lastMessage: {
                            content,
                            timestamp: new Date(),
                            senderId: userId
                        }
                    });

                    socket.to(`conversation:${conversation._id}`).emit('new_message', populatedMessage);

                    const receiverSocketId = activeUsers.get(finalReceiverId);
                    if (receiverSocketId) {
                        socket.to(receiverSocketId).emit('new_message_notification', {
                            message: populatedMessage,
                            conversation: conversation._id
                        });
                    }

                    socket.emit('message_sent', {
                        success: true,
                        messageId: message._id,
                        conversationId: conversation._id
                    });
                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            socket.on('mark_read', async ({ conversationId }) => {
                try {
                    await Message.updateMany(
                        {
                            conversationId,
                            receiverId: userId,
                            read: false
                        },
                        { read: true }
                    );

                    socket.to(`conversation:${conversationId}`).emit('messages_read', {
                        conversationId,
                        readBy: userId
                    });
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                }
            });

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${userId}`);
                activeUsers.delete(userId);
            });
        });
    }

    public getActiveUsersCount() {
        return activeUsers.size;
    }

    public closeAllConnections() {
        this.io.disconnectSockets();
    }
}

export default ChatSocketService;