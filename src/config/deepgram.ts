import { createClient, LiveClient } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
    throw new Error("DEEPGRAM_API_KEY environment variable is not set");
}

const deepgram = createClient(deepgramApiKey);

export interface DeepgramOptions {
    model?: string;
    language?: string;
    interim_results?: boolean;
    smart_format?: boolean;
    encoding?: string;
    sample_rate?: number;
    channels?: number;
    punctuate?: boolean;
    endpointing?: number;
    [key: string]: any;
}

export const getDefaultDeepgramOptions = (): DeepgramOptions => ({
    model: "nova-2",
    language: "en-US",
    interim_results: true,
    smart_format: true,
    encoding: "linear16",
    sample_rate: 16000,
    channels: 1,
    punctuate: true,
    endpointing: 300,
});

// Create a Deepgram live transcription client
export const createLiveTranscription = (options?: DeepgramOptions): LiveClient => {
    const deepgramOptions = options || getDefaultDeepgramOptions();
    return deepgram.listen.live(deepgramOptions);
};

export default deepgram;