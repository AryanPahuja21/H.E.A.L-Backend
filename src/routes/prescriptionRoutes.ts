import express from "express";
import {
  createPrescription,
  deletePrescription,
  getPrescriptionsByUserId,
  updatePrescription,
} from "../controllers/prescriptionController";

const router = express.Router();

router.post("/", createPrescription);
router.get("/", getPrescriptionsByUserId);
router.put("/:id", updatePrescription);
router.delete("/:id", deletePrescription);

export default router;
