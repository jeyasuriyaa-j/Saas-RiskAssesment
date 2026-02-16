import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';

// Import routes
import authRoutes from './routes/auth.routes';
import riskRoutes from './routes/risk.routes';
import importRoutes from './routes/import.routes';
import analyticsRoutes from './routes/analytics.routes';
import aiRoutes from './routes/ai.routes';
import documentRoutes from './routes/document.routes';
import governanceRoutes from './routes/governance.routes';
import adminRoutes from './routes/admin.routes';
import eventsRoutes from './routes/events.routes';
import controlsRoutes from './routes/controls.routes';
import complianceRoutes from './routes/compliance.routes';
import reportsRoutes from './routes/reports.routes';
import auditRoutes from './routes/audit.routes';
import userRoutes from './routes/users.routes';

import remediationRoutes from './routes/remediation.routes';
import vendorRoutes from './routes/vendor.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import myRisksRoutes from './routes/my-risks.routes';
import industryRoutes from './routes/industry.routes';
import evidenceRoutes from './routes/evidence.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 9000;
logger.info(`Attempting to start server on port ${PORT} (env: ${process.env.PORT})`);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || 'v1'
    });
});

// Swagger Documentation
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirect root API prefix to docs
app.get(API_PREFIX, (_req, res) => {
    res.redirect(`${API_PREFIX}/docs`);
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/remediation`, remediationRoutes);
app.use(`${API_PREFIX}/risks`, riskRoutes);
app.use(`${API_PREFIX}/import`, importRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/governance`, governanceRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/events`, eventsRoutes);
app.use(`${API_PREFIX}/controls`, controlsRoutes);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/audit`, auditRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/import-jobs`, importRoutes);
app.use(`${API_PREFIX}/vendors`, vendorRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/my-risks`, myRisksRoutes);
app.use(`${API_PREFIX}/industry`, industryRoutes);
app.use(`${API_PREFIX}/evidence`, evidenceRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Export app for testing
export { app };

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();
        logger.info('Database connected successfully');

        // Start listening
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 API Base URL: http://localhost:${PORT}${API_PREFIX}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Avoid starting the server when running tests
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;
