import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { permissionService } from '../services/permissionService';
import { contextBuilder } from '../services/contextBuilder.service';
import { aiProvider, ChatMessage } from '../services/aiProvider.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Handle AI Chat
 * POST /api/v1/chat
 */
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message, history = [] } = req.body;
    const user = req.user!;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Chat request from user ${user.userId} in tenant ${user.tenantId}`);

    // 1. SMART BEHAVIOR: Handle simple queries directly
    const lowerMessage = message.toLowerCase();
    if (lowerMessage === 'hi' || lowerMessage === 'hello') {
        return res.json({ reply: `Hello! I'm your Risk Assistant. How can I help you today?` });
    }

    try {
        // 2. FETCH DATA: Get filtered data based on permissions
        const [risks, controls, events, users] = await Promise.all([
            permissionService.getFilteredRisks(user),
            permissionService.getFilteredControls(user),
            permissionService.getFilteredEvents(user),
            permissionService.getFilteredUsers(user)
        ]);

        // 3. BUILD CONTEXT: Create a summarize prompt context
        const context = contextBuilder.buildContext({ risks, controls, events, users, user });

        // 4. PREPARE MESSAGES: Combine system context, history, and new message
        const messages: ChatMessage[] = [
            { role: 'system', content: context },
            ...history.slice(-10), // Limit history to last 10 messages for token efficiency
            { role: 'user', content: message }
        ];

        // 5. CALL AI: Get response from the configured AI provider
        const reply = await aiProvider.askAI(messages);

        res.json({ reply });
        return;
    } catch (error: any) {
        logger.error('Chat endpoint error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'An unexpected error occurred'
        });
        return;
    }
}));

export default router;
