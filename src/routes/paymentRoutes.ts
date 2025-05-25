import express from "express";
import { randomUUID } from "crypto";
import { Client, Environment } from "square/legacy";
import { Payment } from "../models/Payment";

const router = express.Router();
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Sandbox,
});

router.get("/square-config", (req, res) => {
  res.json({
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID,
  });
});

router.post("/makePayment", async (req, res) => {
  try {
    const { sourceId, amount, currency, doctorId, type, method } = req.body;

    const paymentResponse = await squareClient.paymentsApi.createPayment({
      idempotencyKey: randomUUID(),
      sourceId: sourceId,
      amountMoney: {
        amount: BigInt(amount),
        currency: currency || "USD",
      },
      locationId: process.env.SQUARE_LOCATION_ID,
    });

    const serializablePayment = JSON.parse(
      JSON.stringify(paymentResponse.result.payment, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    // Save to MongoDB
    const newPayment = new Payment({
      doctorId,
      amount,
      date: new Date(),
      status: "completed",
      type,
      method,
    });

    await newPayment.save();

    res.json({
      success: true,
      payment: serializablePayment,
      savedPayment: newPayment,
    });
  } catch (error: any) {
    console.error("Payment processing error:", error);
    res.status(500).json({
      success: false,
      error:
        error.errors?.map((e: any) => e.detail).join(", ") || "Payment failed",
    });
  }
});
export default router;
