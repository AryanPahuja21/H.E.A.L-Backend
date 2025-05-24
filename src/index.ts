import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import authRoutes from "./routes/authRoutes";
import appointmentRoutes from "./routes/appointmentRoutes";
import medicalRecordRoutes from "./routes/medicalRecordRoutes";
import { authMiddleware } from "./middlewares/auth";
import connectDB from "./config/db";
import { Server } from "socket.io";
import { createClient, LiveTranscriptionEvents, LiveClient } from "@deepgram/sdk";
import Conversation from "./models/Conversation";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("DEEPGRAM_API_KEY environment variable is not set");
}
const deepgram = createClient(deepgramApiKey);


interface ActiveConnection {
  socket: any;
  deepgramLive: LiveClient | null;
  isTranscribing: boolean;
}

const activeConnections = new Map<string, ActiveConnection>();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let deepgramLive: LiveClient | null = null;
  let isTranscribing = false;
  let connectionTimeout: NodeJS.Timeout | null = null;

  activeConnections.set(socket.id, {
    socket,
    deepgramLive: null,
    isTranscribing: false
  });

  socket.on('audio_chunk', async (chunk) => {
    try {
      if (!deepgramLive && !isTranscribing) {
        console.log(`Starting transcription for client ${socket.id}`);
        isTranscribing = true;

        const deepgramLiveOptions = {
          model: "nova-2",
          language: "en-US",
          interim_results: true,
          smart_format: true,
          encoding: "linear16",
          sample_rate: 16000,
          channels: 1,
          punctuate: true,
          endpointing: 300,
        };

        try {
          deepgramLive = deepgram.listen.live(deepgramLiveOptions);
          
          const connection = activeConnections.get(socket.id);
          if (connection) {
            connection.deepgramLive = deepgramLive;
            connection.isTranscribing = true;
          }

          connectionTimeout = setTimeout(() => {
            console.error(`Deepgram connection timeout for client ${socket.id}`);
            socket.emit('transcription_error', 'Connection timeout');
            cleanupConnection();
          }, 10000); 

          
          deepgramLive.on(LiveTranscriptionEvents.Open, () => {
            console.log(`Deepgram connection opened for client ${socket.id}`);
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
          });

          deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
            try {
              const transcript = data?.channel?.alternatives?.[0]?.transcript;
              if (transcript && transcript.trim() !== '') {
                console.log(`Transcript for ${socket.id}:`, transcript);
socket.emit('transcript', { user: socket.id || 'Unknown', text: transcript });
              }
            } catch (err) {
              console.error('Error processing transcript:', err);
            }
          });

          deepgramLive.on(LiveTranscriptionEvents.Error, (error) => {
            console.error(`Deepgram error for client ${socket.id}:`, error);
            
            
            if (error.message) {
              console.error(`Deepgram error message: ${error.message}`);
            }
            if (error.code) {
              console.error(`Deepgram error code: ${error.code}`);
            }
            
            socket.emit('transcription_error', error.message || 'Transcription service error');
            cleanupConnection();
          });

          deepgramLive.on(LiveTranscriptionEvents.Close, (event) => {
            console.log(`Deepgram connection closed for client ${socket.id}`, event);
            cleanupConnection();
          });

          deepgramLive.on(LiveTranscriptionEvents.Metadata, (metadata) => {
            console.log(`Deepgram metadata for client ${socket.id}:`, metadata);
          });


        } catch (err) {
          console.error(`Failed to create Deepgram live transcription for client ${socket.id}:`, err);
          socket.emit('transcription_error', 'Failed to initialize transcription service');
          cleanupConnection();
          return;
        }
      }

      
      if (deepgramLive && isTranscribing) {
        try {
          
          if (chunk instanceof ArrayBuffer) {
            deepgramLive.send(chunk);
          } else if (chunk.buffer instanceof ArrayBuffer) {
            deepgramLive.send(chunk.buffer);
          } else if (Buffer.isBuffer(chunk)) {
            deepgramLive.send(chunk);
          } else {
            console.warn('Invalid audio chunk format received:', typeof chunk);
          }
        } catch (err) {
          console.error('Error sending audio to Deepgram:', err);
          socket.emit('transcription_error', 'Error processing audio');
        }
      }
    } catch (error) {
      console.error('Error in audio_chunk handler:', error);
      socket.emit('transcription_error', 'Error processing audio');
    }
  });

  const cleanupConnection = () => {
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    
    if (deepgramLive) {
      try {
        deepgramLive.finish();
      } catch (err) {
        console.error('Error finishing Deepgram connection:', err);
      }
      deepgramLive = null;
    }
    
    isTranscribing = false;

    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.deepgramLive = null;
      connection.isTranscribing = false;
    }
  };

  socket.on('stop_transcription', () => {
    console.log(`Stopping transcription for client ${socket.id}`);
    cleanupConnection();
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    cleanupConnection();
    activeConnections.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error(`Socket error for client ${socket.id}:`, error);
  });
  socket.on('save_conversation', async ({ roomId, conversation }) => {
    console.log(`Saving conversation for room ${roomId}`);
    console.log('Conversation data:', conversation);
    await Conversation.create({ roomId, transcript: conversation });
  });
});


app.use("/auth", authRoutes);
app.use("/appointments", authMiddleware, appointmentRoutes);
app.use("/medical-records", authMiddleware, medicalRecordRoutes);
app.get("/conversation", (req, res) => {
  Conversation.find({})
    .then((conversations) => {
      res.json(conversations);
    })
    .catch((err) => {
      console.error('Error fetching conversations:', err);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeConnections: activeConnections.size
  });
});

const PORT = process.env.PORT || 4000;





connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.IO server ready for connections`);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});


const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  
  
  activeConnections.forEach((connection, socketId) => {
    if (connection.deepgramLive) {
      try {
        connection.deepgramLive.finish();
      } catch (err) {
        console.error(`Error closing Deepgram connection for ${socketId}:`, err);
      }
    }
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);