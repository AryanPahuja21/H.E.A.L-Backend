import { Router } from "express";
import { register, login, verifyToken } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-token", verifyToken);

export default router;
