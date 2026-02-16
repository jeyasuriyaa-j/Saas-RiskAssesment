import bcrypt from 'bcrypt';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function resetPassword() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'risk_assessment_db',
        user: process.env.DB_USER || 'jeyasuriyaajeyakumar',
        password: process.env.DB_PASSWORD
    });

    try {
        await client.connect();
        const newPassword = 'password123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const result = await client.query(
            "UPDATE users SET password_hash = $1 WHERE email = 'jd@gmail.com' RETURNING email",
            [hashedPassword]
        );

        if (result.rows.length > 0) {
            console.log(`Successfully reset password for ${result.rows[0].email} to: ${newPassword}`);
        } else {
            console.log("User jd@gmail.com not found.");
        }
    } catch (err) {
        console.error("Error resetting password:", err);
    } finally {
        await client.end();
    }
}

resetPassword();
