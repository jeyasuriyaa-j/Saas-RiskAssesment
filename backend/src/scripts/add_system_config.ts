import { connectDatabase, query, closeDatabase } from '../database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        await connectDatabase();
        console.log('Connected to database');

        // Create system_config table
        await query(`
            CREATE TABLE IF NOT EXISTS system_config (
                key VARCHAR(100) PRIMARY KEY,
                value JSONB DEFAULT '{}',
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by UUID
            );
        `);
        console.log('Created system_config table');

        // Seed default values if they don't exist
        const defaults = {
            'scoring': {
                "likelihood_scale": [1, 5],
                "impact_scale": [1, 5],
                "risk_levels": {
                    "low": [1, 6],
                    "medium": [7, 12],
                    "high": [13, 19],
                    "critical": [20, 25]
                }
            },
            'ai_config': {
                "model": "gpt-4",
                "enabled": true
            },
            'risk_appetite': {
                "general_threshold": 10
            }
        };

        for (const [key, value] of Object.entries(defaults)) {
            await query(`
                INSERT INTO system_config (key, value)
                VALUES ($1, $2)
                ON CONFLICT (key) DO NOTHING;
            `, [key, JSON.stringify(value)]);
        }
        console.log('Seeded system_config table');

    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        await closeDatabase();
    }
};

run();
