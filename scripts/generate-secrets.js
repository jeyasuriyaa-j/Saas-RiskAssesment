const crypto = require('crypto');

function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

console.log('--- Generated Secure Local Secrets ---');
console.log('');
console.log('JWT_SECRET=' + generateSecret(32));
console.log('JWT_REFRESH_SECRET=' + generateSecret(48));
console.log('');
console.log('--- VAPID Keys (for Push Notifications) ---');
// Using a mock generation for VAPID as it usually requires a specific library or format, 
// but for local dev, random strings are often enough to avoid crashes if not used.
// If web-push is installed, we could use it, but this script should be lightweight.
console.log('VAPID_PUBLIC_KEY=' + generateSecret(20));
console.log('VAPID_PRIVATE_KEY=' + generateSecret(20));
console.log('');
console.log('TIP: Copy these into your backend/.env file.');
