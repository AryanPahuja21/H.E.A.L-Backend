import { Router } from "express";
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getRecordsByPatient,
} from "../controllers/medicalRecordController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, createMedicalRecord);
router.get("/:patientId", authMiddleware, getRecordsByPatient);
router.delete("/:recordId", authMiddleware, deleteMedicalRecord);

export default router;
