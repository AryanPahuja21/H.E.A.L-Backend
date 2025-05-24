import { Request, Response, Router } from "express";
import { login, register } from "../controllers/authController";


const router = Router();

router.post("/register", (req : Request, res: Response) => {
    const { name, email, password, role, specialization, profileImageUrl } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    
    register(req, res);
});
router.post("/login", (req: Request, res: Response) => {
    login(req, res);
});

export default router;
