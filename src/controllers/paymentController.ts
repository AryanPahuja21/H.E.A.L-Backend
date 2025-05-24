const { SquareClient } = require("square");
require("dotenv").config();

const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENVIRONMENT === "production"
      ? "production"
      : "sandbox",
});

const locationId = process.env.SQUARE_LOCATION_ID;

export const makePayment = async (req: any, res: any) => {
  const { amount, doctorId, patientId, date, appointmentType, isUrgent } =
    req.body;

  try {
    const { result } = await client.checkoutApi.createCheckout(locationId, {
      idempotencyKey: require("crypto").randomUUID(),
      order: {
        locationId,
        lineItems: [
          {
            name: `Appointment with Doctor ${doctorId}`,
            quantity: "1",
            basePriceMoney: {
              amount: amount * 100, // Square uses cents
              currency: "USD",
            },
          },
        ],
      },
      redirectUrl: `http://localhost:5173/patient/appointments?success=true`,
    });

    res.status(200).json({
      paymentLink: result.checkout.checkoutPageUrl,
    });
  } catch (err: any) {
    console.error("Payment Error:", err);
    res.status(500).json({ message: "Payment failed", error: err.message });
  }
};
