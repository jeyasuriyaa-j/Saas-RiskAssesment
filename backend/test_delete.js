require('dotenv').config({ path: './.env' });
const { connectDatabase, query } = require('./dist/database/connection');

async function testDelete() {
    try {
        await connectDatabase();
        // Get a tenant ID from the database
        const tenants = await query('SELECT tenant_id FROM tenants LIMIT 1');
        if (tenants.rows.length === 0) {
            console.log('No tenants found');
            process.exit(0);
        }
        const tenantId = tenants.rows[0].tenant_id;
        console.log('Testing DELETE for tenant:', tenantId);

        const result = await query(
            `DELETE FROM import_jobs 
             WHERE tenant_id = $1 AND status IN ('analyzing', 'processing', 'mapping')
             RETURNING job_id`,
            [tenantId]
        );

        console.log('RESULT:', result.rowCount, 'rows deleted');
        process.exit(0);
    } catch (error) {
        console.error('DELETE_FAILED:', error);
        process.exit(1);
    }
}

testDelete();
