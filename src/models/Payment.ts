import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  type: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ["card", "bank", "cash"],
    required: true,
  },
});

export const Payment = mongoose.model("Payment", paymentSchema);
