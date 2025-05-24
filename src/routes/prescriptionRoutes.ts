import express from "express";
import {
  createPrescription,
  getPrescriptionsByUserId,
} from "../controllers/prescriptionController";

const router = express.Router();

router.post("/", createPrescription);
router.get("/", getPrescriptionsByUserId);

export default router;
