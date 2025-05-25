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

// Get prescriptions by patient ID or doctor ID
export const getPrescriptionsByUserId = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { userId, userRole } = req.query;

  if (!userId || !userRole) {
    return res.status(400).json({ error: "userId and userRole are required" });
  }

  try {
    let query;
    if (userRole === "patient") {
      query = { patientId: userId };
    } else if (userRole === "doctor") {
      query = { doctorId: userId };
    } else {
      return res.status(400).json({ error: "Invalid userRole. Must be 'patient' or 'doctor'" });
    }

    const prescriptions = await Prescription.find(query)
      .populate({
        path: "patientId",
        select: "name email profileImageUrl",
        model: "User"
      })
      .populate({
        path: "doctorId",
        select: "name email specialization profileImageUrl",
        model: "User"
      });

    res.status(200).json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch prescriptions", details: err });
  }
};


export const deletePrescription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const deletedPrescription = await Prescription.findByIdAndDelete(id);

    if (!deletedPrescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    res.status(200).json({ message: "Prescription deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete prescription", details: err });
  }
};


export const updatePrescription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedPrescription = await Prescription.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    ).populate({
      path: "patientId",
      select: "name email profileImageUrl",
      model: "User"
    }).populate({
      path: "doctorId",
      select: "name email specialization profileImageUrl",
      model: "User"
    });

    if (!updatedPrescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    res.status(200).json(updatedPrescription);
  } catch (err) {
    res.status(500).json({ error: "Failed to update prescription", details: err });
  }
};