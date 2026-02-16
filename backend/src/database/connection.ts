import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

// Database connection pool
export let pool: Pool | null = null;

export const connectDatabase = async (): Promise<Pool> => {
    if (pool) {
        return pool;
    }

    try {
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'risk_assessment_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        logger.info('PostgreSQL connection pool created successfully');
        return pool;
    } catch (error) {
        logger.error('Failed to connect to PostgreSQL:', error);
        throw error;
    }
};

export const getPool = (): Pool => {
    if (!pool) {
        throw new Error('Database pool not initialized. Call connectDatabase() first.');
    }
    return pool;
};

export const query = async (text: string, params?: any[]): Promise<any> => {
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        return result;
    } catch (error) {
        logger.error('Database query error:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const getClient = async (): Promise<PoolClient> => {
    return await getPool().connect();
};

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        logger.info('Database connection pool closed');
        pool = null;
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabase();
    process.exit(0);
});
