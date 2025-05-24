import { Router } from "express";
import { getUsers, getUserById } from "../controllers/userController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/", authMiddleware, getUsers);
router.get("/:id", authMiddleware, getUserById);

export default router;