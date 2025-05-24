import {Request, Response} from 'express';
import ConversationFromTs from '../models/ConversationFromTrans';

export const getAllChatSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversations = await ConversationFromTs.find().sort({ createdAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat summaries', error });
  }
};

export const getChatSummaryByRoomId = async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params;
  try {
    const conversation = await ConversationFromTs.findOne({ roomId });
    if (!conversation) {
      res.status(404).json({ message: 'Chat summary not found' });
      return;
    }
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat summary', error });
  }
};