import { Request, Response } from "express";
import MedicalRecord from "../models/MedicalRecord";
import mongoose from "mongoose";

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
      "doctorId"
    );
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: "Error fetching records", error: err });
  }
};

export const deleteMedicalRecord = async (req: Request, res: Response): Promise<any> => {
  try {
    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ message: "Invalid record ID format" });
    }

    const deletedRecord = await MedicalRecord.findByIdAndDelete(recordId);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Medical record not found" });
    }
    res.status(200).json({
      message: "Medical record deleted successfully",
      deletedRecord
    });
  } catch (err) {
    res.status(500).json({ message: "Error deleting medical record", error: err });
  }
};