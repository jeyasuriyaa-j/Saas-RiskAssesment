import OpenAI from 'openai';
import { logger } from '../../../utils/logger';
import { AIConfig } from '../types';

export async function generateGroqResponse(prompt: string, apiKey: string, modelName: string, config: AIConfig): Promise<string> {
    logger.info(`Using Groq API with model: ${modelName}`);

    const groq = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
    });

    const timeoutMs = config.timeout || 120000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
    );

    const completionPromise = groq.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8192,
        temperature: 0.1,
    });

    const completion: any = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content || '';
}
