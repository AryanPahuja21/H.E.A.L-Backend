import { Request, Response } from "express";
import MedicalRecord from "../models/MedicalRecord";

export const createMedicalRecord = async (req: Request, res: Response) => {
  try {
    const newRecord = new MedicalRecord(req.body);
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating medical record", error: err });
  }
};

export const getRecordsByPatient = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const records = await MedicalRecord.find({ patientId }).populate(
      "doctorId appointmentId"
    );
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: "Error fetching records", error: err });
  }
};
