import { Router } from "express";
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getRecordsByPatient,
  updateMedicalRecord,
  uploadFile,
} from "../controllers/medicalRecordController";

const router = Router();

router.post("/", createMedicalRecord);
router.get("/:patientId", getRecordsByPatient);
router.delete("/:recordId", deleteMedicalRecord);
router.put("/:recordId", updateMedicalRecord);
router.post("/upload", uploadFile);

export default router;
