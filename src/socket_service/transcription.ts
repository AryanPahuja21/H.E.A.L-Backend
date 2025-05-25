import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { LiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { createLiveTranscription } from "../config/deepgram";
import ConversationFromTrans from "../models/ConversationFromTrans";

export interface ActiveConnection {
    socket: Socket;
    deepgramLive: LiveClient | null;
    isTranscribing: boolean;
    userName?: string; // Add userName to track user identity
    roomId?: string;   // Add roomId to track room
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
    private roomConversations = new Map<string, string>(); // <--- buffer for each room

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

            // Initialize connection without user data first
            this.activeConnections.set(socket.id, {
                socket,
                deepgramLive: null,
                isTranscribing: false
            });

            socket.on('join_room', ({ roomId, user }) => {
                console.log(`User ${user} joining room ${roomId}`);
                
                // Store user data in socket.data AND in activeConnections
                socket.data.userName = user;
                socket.data.roomId = roomId;
                socket.join(roomId);

                // Update the active connection with user info
                const connection = this.activeConnections.get(socket.id);
                if (connection) {
                    connection.userName = user;
                    connection.roomId = roomId;
                }

                console.log(`Successfully joined: ${user} in room ${roomId}`);
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
                                        // Get user info from both sources for reliability
                                        const connection = this.activeConnections.get(socket.id);
                                        const userName = connection?.userName || socket.data.userName;
                                        const roomId = connection?.roomId || socket.data.roomId;
                                        
                                        console.log(`Transcript received - User: ${userName}, Room: ${roomId}, Text: ${transcript}`);
                                        
                                        if (userName && roomId) {
                                            const line = `${userName}: ${transcript}`;
                                            // Append to room buffer
                                            const prev = this.roomConversations.get(roomId) || '';
                                            this.roomConversations.set(roomId, prev ? `${prev}\n${line}` : line);
                                            // Emit to all in room with user and text separately
                                            this.io.to(roomId).emit('transcript', { 
                                                user: userName, 
                                                text: transcript,
                                                socketId: socket.id // Optional: for debugging
                                            });
                                            console.log(`Emitted transcript to room ${roomId}: ${userName}: ${transcript}`);
                                        } else {
                                            console.warn(`Missing user info - userName: ${userName}, roomId: ${roomId}`);
                                        }
                                    }
                                } catch (err) {
                                    console.error('Error processing transcript:', err);
                                }
                            });

                            deepgramLive.on(LiveTranscriptionEvents.Error, (error) => {
                                console.error(`Deepgram error for client ${socket.id}:`, error);
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

            // Add handler for manual conversation saving
            socket.on('save_conversation', async ({ roomId, conversation }) => {
                try {
                    if (roomId && conversation) {
                        await ConversationFromTrans.create({ roomId, transcript: conversation });
                        console.log(`Manually saved conversation for room ${roomId}`);
                        socket.emit('conversation_saved', { success: true });
                    }
                } catch (error) {
                    console.error('Error saving conversation:', error);
                    socket.emit('conversation_saved', { success: false, error: (error as Error).message });
                }
            });

            socket.on('disconnect', async (reason) => {
                console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
                this.cleanupConnection(socket.id, deepgramLive, connectionTimeout);
                
                const connection = this.activeConnections.get(socket.id);
                const roomId = connection?.roomId || socket.data.roomId;
                
                this.activeConnections.delete(socket.id);
                deepgramLive = null;
                isTranscribing = false;

                // Save conversation if room is empty
                if (roomId) {
                    const room = this.io.sockets.adapter.rooms.get(roomId);
                    if (!room || room.size === 0) {
                        const conversation = this.roomConversations.get(roomId);
                        if (conversation && conversation.trim()) {
                            try {
                                const existingConversation = await ConversationFromTrans.find({ roomId });
                                if (existingConversation.length > 0) {
                                    console.log(`Conversation already exists for room ${roomId}, skipping save.`);
                                    // added new conversation if exist 
                                    await ConversationFromTrans.updateOne(
                                        { roomId },
                                        { $push: { transcript: conversation } }
                                    );
                                    
                                }
                                else{
                                await ConversationFromTrans.create({ roomId, transcript: conversation });
                                }
                                this.roomConversations.delete(roomId);
                                console.log(`Saved combined conversation for room ${roomId}`);
                            } catch (error) {
                                console.error(`Error saving conversation for room ${roomId}:`, error);
                            }
                        }
                    }
                }
            });

            socket.on('error', (error) => {
                console.error(`Socket error for client ${socket.id}:`, error);
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