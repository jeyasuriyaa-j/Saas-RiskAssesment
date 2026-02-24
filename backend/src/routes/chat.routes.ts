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

    logger.info(`Chat request from user ${user.userId} (Role: ${user.role}) in tenant ${user.tenantId}`);

    // 1. Handle trivial greetings directly (no AI cost)
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey') {
        return res.json({ reply: `Hello! I'm your Risk Assistant. How can I help you today?` });
    }

    try {
        // 2. FETCH DATA in parallel: role-filtered data + user profile
        const [risks, controls, events, users, remediationPlans, userProfile] = await Promise.all([
            permissionService.getFilteredRisks(user),
            permissionService.getFilteredControls(user),
            permissionService.getFilteredEvents(user),
            permissionService.getFilteredUsers(user),
            permissionService.getFilteredRemediationPlans(user),
            permissionService.getUserProfile(user.userId),
        ]);

        // 3. BUILD CONTEXT: Summarize all data into a structured text prompt
        const context = contextBuilder.buildContext({
            risks,
            controls,
            events,
            users,
            remediationPlans,
            user,
            userProfile
        });

        // 4. PREPARE MESSAGES: system context + limited history + new question
        const messages: ChatMessage[] = [
            { role: 'system', content: context },
            ...history.slice(-8).map((h: any) => ({ role: h.role, content: h.content })),
            { role: 'user', content: message }
        ];

        // 5. CALL AI
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
