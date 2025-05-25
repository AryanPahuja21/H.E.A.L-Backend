import { Router } from "express";
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getRecordsByPatient,
  uploadFile,
} from "../controllers/medicalRecordController";

const router = Router();

router.post("/", createMedicalRecord);
router.get("/:patientId", getRecordsByPatient);
router.delete("/:recordId", deleteMedicalRecord);
router.post("/upload", uploadFile);

export default router;
