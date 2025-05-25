import { Router } from "express";
import { generateAIResponse } from "../controllers/ai-controller";

const router = Router();

router.post("/", generateAIResponse);

export default router;