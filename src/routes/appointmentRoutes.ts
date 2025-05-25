import { Router } from "express";
import {
  createAppointment,
  getAppointmentsByUserId,
  updateAppointmentStatus,
} from "../controllers/appointmentController";

const router = Router();

router.get("/:userId", getAppointmentsByUserId);
router.post("/", createAppointment);
router.put("/:appointmentId",updateAppointmentStatus);

export default router;
