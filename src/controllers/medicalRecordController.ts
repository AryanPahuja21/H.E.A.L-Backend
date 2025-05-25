import { Request, Response } from "express";
import multer from "multer";
import MedicalRecord from "../models/MedicalRecord";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "medical-records");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `record-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).single("file");

export const createMedicalRecord = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { title, description, type, doctorId, patientId, date, fileUrl } = req.body;

    if (!title || !description || !type || !doctorId || !patientId || !date) {
      return res.status(400).json({ error: "Missing required fields" }); // Ensure JSON response
    }

    const newRecord = new MedicalRecord({
      title,
      description,
      type,
      doctorId,
      patientId,
      date: new Date(date),
      fileUrl,
    });

    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
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

export const deleteMedicalRecord = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ message: "Invalid record ID format" });
    }

    const deletedRecord = await MedicalRecord.findByIdAndDelete(recordId);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    // Remove file from disk if exists
    if (deletedRecord.fileUrl) {
      const filePath = path.join(
        process.cwd(),
        "uploads",
        "medical-records",
        path.basename(deletedRecord.fileUrl)
      );
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => { });
      }
    }

    res.status(200).json({
      message: "Medical record deleted successfully",
      deletedRecord,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting medical record", error: err });
  }
};

export const updateMedicalRecord = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { recordId } = req.params;
    const { title, description, type, doctorId, patientId, date, fileUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ error: "Invalid record ID format" });
    }

    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      recordId,
      {
        title,
        description,
        type,
        doctorId,
        patientId,
        date: date ? new Date(date) : undefined,
        fileUrl,
      },
      { new: true, runValidators: true }
    ).populate("doctorId");

    if (!updatedRecord) {
      return res.status(404).json({ error: "Medical record not found" });
    }

    res.status(200).json(updatedRecord);
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Server error while updating medical record",
      details: error.message,
    });
  }
};

export const uploadFile = (req: Request, res: Response, next: any) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: "File upload error",
        details: err.message
      });
    } else if (err) {
      return res.status(500).json({
        error: "Unknown error during file upload",
        details: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Please provide a file to upload"
      });
    }

    const fileUrl = `/medical-records/files/${req.file.filename}`;

    res.status(200).json({
      message: "File uploaded successfully",
      fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
};