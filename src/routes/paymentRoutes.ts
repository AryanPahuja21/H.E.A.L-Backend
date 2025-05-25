import { Router } from "express";
import { makePayment } from "../controllers/paymentController";

const router = Router();

router.get("/square-config", (req, res) => {
  try {
    if (!process.env.SQUARE_APPLICATION_ID || !process.env.SQUARE_LOCATION_ID) {
      throw new Error("Square configuration not set");
    }

    res.json({
      success: true,
      applicationId: process.env.SQUARE_APPLICATION_ID,
      locationId: process.env.SQUARE_LOCATION_ID,
    });
  } catch (error: any) {
    console.error("Square config error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/makePayment", makePayment);

export default router;
