import { Request, Response } from "express";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const generateAIResponse = async (req: Request, res: Response): Promise<any> => {
    try {
        const { message, user_name, medical_records, previous_messages } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        let systemPrompt = `You are a medical AI assistant helping the user ${user_name || "Patient"}. `;

        if (medical_records && medical_records.length > 0) {
            systemPrompt += `\n\nRelevant medical history:\n`;
            medical_records.forEach((record: any, index: number) => {
                systemPrompt += `${index + 1}. ${record.title}: ${record.description}\n`;
            });
        }

        systemPrompt += `\n\nProvide helpful, accurate, and ethical medical information. Remember that your advice should be supportive but not replace professional medical consultation. All answers should be clear, concise, and easy to understand.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });

        const chatHistory = previous_messages ? previous_messages.map((msg: any) => ({
            role: msg.isAI ? "model" : "user",
            parts: [{ text: msg.content }]
        })) : [];

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 800,
            },
        });

        const result = await chat.sendMessage([
            { text: systemPrompt },
            { text: message }
        ]);
        const response = result.response;

        res.json({
            success: true,
            response: response.text(),
        });
    } catch (error: any) {
        console.error("AI Response Error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to generate AI response",
        });
    }
};