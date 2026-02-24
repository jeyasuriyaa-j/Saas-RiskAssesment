import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../../utils/logger';
import { AIConfig } from '../types';

export async function generateGeminiResponse(prompt: string, apiKey: string, modelName: string, config: AIConfig): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);

    if (modelName.includes('/')) {
        modelName = modelName.split('/')[1];
    }

    logger.info(`Using Native Google AI with model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const timeoutMs = config.timeout || 120000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
    );

    const generatePromise = model.generateContent(prompt);
    const result: any = await Promise.race([generatePromise, timeoutPromise]);

    try {
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        if (error.message?.includes('429') || error.message?.includes('Quota')) {
            logger.error('AI Quota Exceeded. returning Mock Response.');
            return JSON.stringify({
                mock: true,
                summary: "AI Service Unavailable (Rate Limit). Using Mock Data.",
                posture_summary: "Rate limit reached. Unable to generate real-time analysis.",
                top_focus_areas: ["Check API Quota", "Review System Logs", "Retry Later"],
                executive_narrative: "The AI service is currently experiencing high load. Please try again later.",
                confidence_score: 0
            });
        }
        throw error;
    }
}
