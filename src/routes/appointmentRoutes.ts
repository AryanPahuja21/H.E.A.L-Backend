import { Router } from "express";
import {
  createAppointment,
  getAppointmentsByUserId,
} from "../controllers/appointmentController";

const router = Router();

router.get("/:userId", getAppointmentsByUserId);
router.post("/", createAppointment);

export default router;
