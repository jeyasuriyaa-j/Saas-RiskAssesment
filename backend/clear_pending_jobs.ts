import { connectDatabase } from './src/database/connection';
import { query } from './src/database/connection';

(async () => {
    try {
        // Initialize database connection
        await connectDatabase();

        // Get pending jobs
        const result = await query(
            "SELECT job_id, status, tenant_id, created_at FROM import_jobs WHERE status IN ('analyzing', 'processing') ORDER BY created_at DESC LIMIT 10"
        );
        console.log('Pending jobs:', JSON.stringify(result.rows, null, 2));

        // Clear all pending jobs (for demo purposes)
        const deleteResult = await query(
            "DELETE FROM import_jobs WHERE status IN ('analyzing', 'processing') RETURNING job_id"
        );
        console.log('Cleared', deleteResult.rowCount, 'pending jobs');

        process.exit(0);
    } catch (e: any) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
