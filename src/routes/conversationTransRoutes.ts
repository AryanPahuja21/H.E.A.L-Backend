import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  getChatSummaryByRoomId,
  getAllChatSummary,
} from "../controllers/getAllChatSummary";

const router = Router();

router.get("/chat-summary-all", getAllChatSummary);
router.get("/chat-summary/room/:roomId", getChatSummaryByRoomId);

export default router;
