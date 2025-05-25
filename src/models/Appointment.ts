import mongoose, { Document, Schema } from "mongoose";

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  duration: number;
  type: "video" | "audio" | "inperson";
  isUrgent?: boolean;
  status: "scheduled" | "completed" | "cancelled";
}

const appointmentSchema = new Schema<IAppointment>({
  patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  type: { type: String, enum: ["video", "audio", "inperson"], required: true },
  isUrgent: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["scheduled", "completed", "cancelled"],
    default: "scheduled"
  }
});

export const Appointment = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema
);
