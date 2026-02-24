
import { pool, connectDatabase } from '../database/connection';

const RISK_ID = 'fb48aa77-eb83-4a5c-8271-6e5bf200ee8e';
const USER_EMAIL_FRAGMENT = 'test'; // Assuming 'testuser' has 'test' in email

async function run() {
    try {
        console.log('--- Debugging Risk Access ---\n');

        // Ensure database is connected
        const dbPool = await connectDatabase();

        // 1. Get Risk Details
        console.log(`Querying Risk: ${RISK_ID}`);
        const riskResult = await dbPool.query('SELECT risk_id, risk_code, tenant_id, owner_user_id, status FROM risks WHERE risk_id = $1', [RISK_ID]);

        if (riskResult.rows.length === 0) {
            console.log('❌ Risk NOT FOUND in database.');
            return;
        }

        const risk = riskResult.rows[0];
        console.log('✅ Risk Found:', risk);

        // 2. Get User Details
        console.log(`\nQuerying User (like '${USER_EMAIL_FRAGMENT}')...`);
        const userResult = await dbPool.query('SELECT user_id, email, tenant_id, role, full_name FROM users WHERE email ILIKE $1 OR full_name ILIKE $1', [`%${USER_EMAIL_FRAGMENT}%`]);

        if (userResult.rows.length === 0) {
            console.log('❌ User NOT FOUND.');
            return;
        }

        console.log(`✅ Found ${userResult.rows.length} potential users:`);
        userResult.rows.forEach(u => console.log(u));

        // 3. Check Match
        const matchingUser = userResult.rows.find(u => u.tenant_id === risk.tenant_id);

        if (matchingUser) {
            console.log('\n✅ Tenant Match Found!');
            console.log(`User ${matchingUser.email} (Tenant ${matchingUser.tenant_id}) SHOULD see Risk (Tenant ${risk.tenant_id})`);

            // 4. Simulate the exact query from risk.routes.ts
            console.log('\nRunning actual route query simulation...');
            const routeQuery = `
                SELECT r.risk_id 
                FROM risks r
                WHERE r.risk_id = $1 AND r.tenant_id = $2
            `;
            const routeResult = await dbPool.query(routeQuery, [RISK_ID, matchingUser.tenant_id]);
            console.log(`Route Query returned ${routeResult.rows.length} rows.`);
        } else {
            console.log('\n❌ NO TENANT MATCH!');
            console.log(`Risk is in Tenant ${risk.tenant_id}`);
            console.log('Users are in:');
            userResult.rows.forEach(u => console.log(`- ${u.email}: ${u.tenant_id}`));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

run();
