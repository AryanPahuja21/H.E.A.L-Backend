import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import appointmentRoutes from "./routes/appointmentRoutes";
import medicalRecordRoutes from "./routes/medicalRecordRoutes";
import { authMiddleware } from "./middlewares/auth";
import connectDB from "./config/db";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/appointments", authMiddleware, appointmentRoutes);
app.use("/medical-records", authMiddleware, medicalRecordRoutes);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
});
