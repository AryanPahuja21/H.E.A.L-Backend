import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: "User" },
  doctorId: { type: Schema.Types.ObjectId, ref: "User" },
  amount: {
    type: Number,
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
  },
  method: {
    type: String,
    enum: ["card", "bank", "cash"],
  },
});

export const Payment = mongoose.model("Payment", paymentSchema);
