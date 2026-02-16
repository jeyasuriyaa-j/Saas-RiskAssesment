import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_secret_key_12345';
const payload = {
    userId: 'd572fcb6-57cb-4001-8398-01ecabe6d313',
    role: 'admin',
    tenantId: '264e7d65-0851-4e6f-be77-691c21b65d4a',
    email: 'jd@gmail.com'
};

const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
console.log(token);
