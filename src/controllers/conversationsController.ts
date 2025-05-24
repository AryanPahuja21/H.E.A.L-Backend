import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import mongoose from "mongoose";

interface AuthRequest extends Request {
    user?: {
        id: string;
        [key: string]: any;
    };
}

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'name email role specialization profileImageUrl')
            .sort({ 'updatedAt': -1, 'lastMessage.timestamp': -1 });

        const conversationsWithUnread = await Promise.all(
            conversations.map(async (conversation) => {
                const unreadCount = await Message.countDocuments({
                    conversationId: conversation._id,
                    receiverId: userId,
                    read: false
                });

                return {
                    ...conversation.toObject(),
                    unreadCount
                };
            })
        );

        res.status(200).json(conversationsWithUnread);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const conversationId = req.params.id;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            res.status(400).json({ message: "Invalid conversation ID" });
            return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.map(p => p.toString()).includes(userId)) {
            res.status(403).json({ message: 'Access denied to this conversation' });
            return;
        }

        const messages = await Message.find({ conversationId })
            .populate('senderId', 'name email profileImageUrl')
            .populate('receiverId', 'name email profileImageUrl')
            .sort({ timestamp: 1 })
            .limit(100);

        await Message.updateMany(
            {
                conversationId,
                receiverId: userId,
                read: false
            },
            { read: true }
        );

        res.status(200).json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const startConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { receiverId } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        if (!receiverId) {
            res.status(400).json({ message: 'Receiver ID is required' });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            res.status(400).json({ message: "Invalid receiver ID" });
            return;
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, receiverId] }
        });

        if (conversation) {
            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'name email role specialization profileImageUrl');
            res.status(200).json(conversation);
            return;
        }

        const newConversation = new Conversation({
            participants: [userId, receiverId]
        });

        await newConversation.save();

        const populatedConversation = await Conversation.findById(newConversation._id)
            .populate('participants', 'name email role specialization profileImageUrl');

        res.status(201).json(populatedConversation);
    } catch (err) {
        console.error('Error creating conversation:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }

        const unreadCount = await Message.countDocuments({
            receiverId: userId,
            read: false
        });

        res.status(200).json({ unreadCount });
    } catch (err) {
        console.error('Error getting unread count:', err);
        res.status(500).json({ message: 'Server error' });
    }
};