import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Risk Assessment SaaS API',
            version: '1.0.0',
            description: 'AI-powered Risk Assessment SaaS - Backend API Documentation',
        },
        servers: [
            {
                url: '/api/v1',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/server.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
