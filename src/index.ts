import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/users";
import appointmentRoutes from "./routes/appointmentRoutes";
import medicalRecordRoutes from "./routes/medicalRecordRoutes";
import { authMiddleware } from "./middlewares/auth";
import connectDB from "./config/db";
import SocketService from "./socket";

dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// Initialize socket service
const socketService = new SocketService(server);

// Configure API routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/appointments", authMiddleware, appointmentRoutes);
app.use("/medical-records", authMiddleware, medicalRecordRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    activeConnections: socketService.getActiveConnectionsCount()
  });
});

const PORT = process.env.PORT || 4000;

// Connect to database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.IO server ready for connections`);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');

  socketService.closeAllConnections();

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);