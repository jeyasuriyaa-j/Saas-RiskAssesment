const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/JeyasuriyaaJeyakumar/Desktop/Antigravity/Saas-RiskAssesment-main/Saas-RiskAssesment-main/backend/.env' });

async function checkDb() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '9000'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'risk_assessment_db'
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'risk_assessment_db'");
    if (res.rowCount > 0) {
      console.log('DB_EXISTS');
    } else {
      console.log('DB_MISSING');
    }
    await client.end();
  } catch (err) {
    console.error('CONN_FAIL: ' + err.message);
  }
}

checkDb();
