import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { LiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { createLiveTranscription } from "../config/deepgram";
import Conversation from "../models/Conversation";
import ConversationFromTrans from "../models/ConversationFromTrans";

export interface ActiveConnection {
    socket: Socket;
    deepgramLive: LiveClient | null;
    isTranscribing: boolean;
}

class SocketService {
    static closeAllConnections() {
      throw new Error("Method not implemented.");
    }
    static getActiveConnectionsCount() {
      throw new Error("Method not implemented.");
    }
    private io: Server;
    private activeConnections = new Map<string, ActiveConnection>();

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupSocketEvents();
    }

    private setupSocketEvents(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);

            let deepgramLive: LiveClient | null = null;
            let isTranscribing = false;
            let connectionTimeout: NodeJS.Timeout | null = null;

            this.activeConnections.set(socket.id, {
                socket,
                deepgramLive: null,
                isTranscribing: false
            });

            socket.on('audio_chunk', async (chunk) => {
                try {
                    if (!deepgramLive && !isTranscribing) {
                        console.log(`Starting transcription for client ${socket.id}`);
                        isTranscribing = true;

                        try {
                            deepgramLive = createLiveTranscription();

                            const connection = this.activeConnections.get(socket.id);
                            if (connection) {
                                connection.deepgramLive = deepgramLive;
                                connection.isTranscribing = true;
                            }

                            connectionTimeout = setTimeout(() => {
                                console.error(`Deepgram connection timeout for client ${socket.id}`);
                                socket.emit('transcription_error', 'Connection timeout');
                                this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                                deepgramLive = null;
                                isTranscribing = false;
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
                                        // When you emit the transcript, do this:
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
                                this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                                deepgramLive = null;
                                isTranscribing = false;
                            });

                            deepgramLive.on(LiveTranscriptionEvents.Close, (event) => {
                                console.log(`Deepgram connection closed for client ${socket.id}`, event);
                                this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                                deepgramLive = null;
                                isTranscribing = false;
                            });

                            deepgramLive.on(LiveTranscriptionEvents.Metadata, (metadata) => {
                                console.log(`Deepgram metadata for client ${socket.id}:`, metadata);
                            });

                        } catch (err) {
                            console.error(`Failed to create Deepgram live transcription for client ${socket.id}:`, err);
                            socket.emit('transcription_error', 'Failed to initialize transcription service');
                            this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                            deepgramLive = null;
                            isTranscribing = false;
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

            socket.on('stop_transcription', () => {
                console.log(`Stopping transcription for client ${socket.id}`);
                this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                deepgramLive = null;
                isTranscribing = false;
            });

            socket.on('disconnect', (reason) => {
                console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
                this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                this.activeConnections.delete(socket.id);
                deepgramLive = null;
                isTranscribing = false;
            });

            socket.on('error', (error) => {
                console.error(`Socket error for client ${socket.id}:`, error);
            });
            socket.on('save_conversation', async ({ roomId, conversation }) => {
    console.log(`Saving conversation for room ${roomId}`);
    console.log('Conversation data:', conversation);
    await ConversationFromTrans.create({ roomId, transcript: conversation });
  });
        });
    }

    private cleanupConnection(
        socketId: string,
        deepgramLive: LiveClient | null,
        connectionTimeout: NodeJS.Timeout | null
    ): void {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }

        if (deepgramLive) {
            try {
                deepgramLive.finish();
            } catch (err) {
                console.error('Error finishing Deepgram connection:', err);
            }
        }

        const connection = this.activeConnections.get(socketId);
        if (connection) {
            connection.deepgramLive = null;
            connection.isTranscribing = false;
        }
    }

    public getActiveConnectionsCount(): number {
        return this.activeConnections.size;
    }

    public closeAllConnections(): void {
        this.activeConnections.forEach((connection, socketId) => {
            if (connection.deepgramLive) {
                try {
                    connection.deepgramLive.finish();
                } catch (err) {
                    console.error(`Error closing Deepgram connection for ${socketId}:`, err);
                }
            }
        });
    }
}

export default SocketService;