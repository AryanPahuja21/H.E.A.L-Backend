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

router.get("/:userId/history", async (req, res): Promise<any> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const payments = await Payment.find({
      $or: [{ patientId: userId }, { doctorId: userId }],
    })
      .populate("patientId", "name email profileImageUrl")
      .populate("doctorId", "name email specialization profileImageUrl")
      .sort({ date: -1 });

    res.json(payments);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

router.get("/totalPaidByPatient/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const payments = await Payment.find({
      $or: [{ patientId: userId }, { doctorId: userId }],
      status: "completed",
    });

    const totalPaid = payments.reduce(
      (sum, payment) => sum + (payment.amount ?? 0),
      0
    );

    res.json({
      success: true,
      totalPaid,
    });
  } catch (error) {
    console.error("Error fetching total payments by patient:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
