import { Router } from "express";
import { 
  getConversations, 
  getMessages, 
  startConversation, 
  getUnreadCount 
} from "../controllers/conversationsController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", getConversations);
router.get("/unread", getUnreadCount);
router.get("/:id/messages", getMessages);
router.post("/", startConversation);

export default router;