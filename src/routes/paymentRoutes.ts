import { Router } from "express";
import { makePayment } from "../controllers/paymentController";

const router = Router();

router.post("/makePayment", makePayment);

export default router;
