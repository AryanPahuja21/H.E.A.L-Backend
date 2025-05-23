import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";

export const getAppointmentsByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.find({
      $or: [{ patientId: userId }, { doctorId: userId }],
    })
      .populate("patientId", "name email")
      .populate("doctorId", "name email specialization")
      .sort({ date: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    res.status(400).json({ error: "Error creating appointment", details: err });
  }
};
