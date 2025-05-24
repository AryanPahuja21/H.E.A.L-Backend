import { Request, Response } from "express";
import Prescription from "../models/Prescription";

// Create a new prescription
export const createPrescription = async (req: Request, res: Response) => {
  try {
    const newPrescription = new Prescription(req.body);
    const saved = await newPrescription.save();
    res.status(201).json(saved);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create prescription", details: err });
  }
};

// Get prescriptions by patient ID
export const getPrescriptionsByUserId = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const prescriptions = await Prescription.find({ patientId: userId });
    res.status(200).json(prescriptions);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch prescriptions", details: err });
  }
};
