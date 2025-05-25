import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";

export const getAppointmentsByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const scheduledAppointments = await Appointment.find({
      status: "scheduled",
      $or: [{ patientId: userId }, { doctorId: userId }]
    });

    for (const appointment of scheduledAppointments) {
      const appointmentDate = new Date(appointment.date);
      const endTime = new Date(appointmentDate.getTime() + appointment.duration * 60000);

      if (now > endTime) {
        appointment.status = "completed";
        await appointment.save();
      }
    }

    const appointments = await Appointment.find({
      $or: [{ patientId: userId }, { doctorId: userId }],
    })
      .populate("patientId", "name email profileImageUrl")
      .populate("doctorId", "name email specialization profileImageUrl")
      .sort({ date: -1 });

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching appointments:", err);
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


export const updateAppointmentStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!["scheduled", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be 'scheduled', 'completed', or 'cancelled'"
      });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    )
      .populate("patientId", "name email")
      .populate("doctorId", "name email specialization");

    if (!updatedAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.status(200).json(updatedAppointment);
  } catch (err) {
    res.status(500).json({ error: "Error updating appointment status", details: err });
  }
};