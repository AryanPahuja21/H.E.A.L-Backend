import mongoose, { Schema, Document } from "mongoose";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface PrescriptionDocument extends Document {
  patientId: string;
  doctorId: string;
  medications: Medication[];
  instructions: string;
  date: Date;
  refillable: boolean;
  refills: number;
}

const MedicationSchema = new Schema<Medication>({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  notes: String,
});

const PrescriptionSchema = new Schema<PrescriptionDocument>({
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  medications: { type: [MedicationSchema], required: true },
  instructions: { type: String, required: true },
  date: { type: Date, default: Date.now },
  refillable: { type: Boolean, default: false },
  refills: { type: Number, default: 0 },
});

export default mongoose.model<PrescriptionDocument>(
  "Prescription",
  PrescriptionSchema
);
