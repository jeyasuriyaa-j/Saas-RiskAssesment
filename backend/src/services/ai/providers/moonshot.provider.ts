import OpenAI from 'openai';
import { logger } from '../../../utils/logger';
import { AIConfig } from '../types';

export async function generateMoonshotResponse(prompt: string, apiKey: string, modelName: string, config: AIConfig): Promise<string> {
    const isNvidia = apiKey.startsWith('nvapi-');
    const isOpenRouter = apiKey.startsWith('sk-or-');

    let baseUrl = 'https://api.moonshot.cn/v1';
    if (isNvidia) {
        baseUrl = 'https://integrate.api.nvidia.com/v1';
    } else if (isOpenRouter) {
        baseUrl = 'https://openrouter.ai/api/v1';
    }

    const defaultHeaders = isOpenRouter ? {
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Risk Assessment SaaS',
    } : undefined;

    logger.info(`Using ${isNvidia ? 'NVIDIA NIM' : (isOpenRouter ? 'Moonshot via OpenRouter' : 'Moonshot AI')} with model: ${modelName}`);

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
        defaultHeaders
    });

    const timeoutMs = config.timeout || 120000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
    );

    const completionPromise = client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8192,
        temperature: 0.3,
    });

    const completion: any = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content || '';
}
