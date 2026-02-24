import OpenAI from 'openai';
import { logger } from '../../../utils/logger';
import { AIConfig } from '../types';

export async function generateOpenAIResponse(prompt: string, apiKey: string, modelName: string, config: AIConfig): Promise<string> {
    const isOpenRouter = apiKey.startsWith('sk-or-') || modelName.includes('/');
    const isZhipu = apiKey.includes('.') && !isOpenRouter;

    logger.info(`Using ${isOpenRouter ? 'OpenRouter' : (isZhipu ? 'ZhipuAI' : 'OpenAI')} with model: ${modelName}`);

    let baseURL = isOpenRouter
        ? 'https://openrouter.ai/api/v1'
        : (isZhipu ? 'https://open.bigmodel.cn/api/paas/v4' : 'https://api.openai.com/v1');

    const defaultHeaders = isOpenRouter ? {
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Risk Assessment SaaS',
    } : undefined;

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        defaultHeaders: defaultHeaders
    });

    const timeoutMs = config.timeout || 120000;
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Generation Timed Out')), timeoutMs)
    );

    const completionPromise = client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8192,
        temperature: 0.1,
    });

    const completion: any = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content || '';
}
