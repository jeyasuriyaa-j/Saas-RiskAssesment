const axios = require('axios');
const API_URL = 'http://localhost:9000/api/v1';

async function debugToken() {
    try {
        const tenantName = `TokenDebug-${Date.now()}`;
        console.log('Registering...');
        const res = await axios.post(`${API_URL}/auth/register`, {
            org_name: tenantName,
            subdomain: `token-debug-${Date.now()}`,
            admin_name: 'Debug User',
            admin_email: `debug_${Date.now()}@example.com`,
            password: 'Password123!'
        });

        const token = res.data.access_token; // Changed from .token check
        console.log('\nReceived Token:', token);

        if (!token) {
            console.error('No token in response!', res.data);
            return;
        }

        // Try to use it immediately
        console.log('\nVerifying Token via Health/Profile (if exists)...');
        try {
            // Try an authenticated endpoint, e.g., /auth/me or verify against something?
            // Auth routes don't usually have a /me, but let's try a protected route like /risks
            const riskRes = await axios.get(`${API_URL}/risks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Access Token Valid! Got risks:', riskRes.data?.risks?.length || 0);
        } catch (e) {
            console.error('❌ Token rejected:', e.response?.data || e.message);
        }

    } catch (e) {
        console.error('Registration failed:', e.response?.data || e.message);
    }
}

debugToken();
