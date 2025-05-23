import mongoose, { Schema, Document } from "mongoose";

export interface IMedicalRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId: mongoose.Types.ObjectId;
  diagnosis: string;
  symptoms: string[];
  treatment: string;
  medications: string[];
  notes?: string;
  createdAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    diagnosis: { type: String, required: true },
    symptoms: [{ type: String }],
    treatment: { type: String, required: true },
    medications: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IMedicalRecord>(
  "MedicalRecord",
  medicalRecordSchema
);
