import { Router } from "express";
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getRecordsByPatient,
} from "../controllers/medicalRecordController";

const router = Router();

router.post("/", createMedicalRecord);
router.get("/:patientId", getRecordsByPatient);
router.delete("/:recordId", deleteMedicalRecord);

export default router;
