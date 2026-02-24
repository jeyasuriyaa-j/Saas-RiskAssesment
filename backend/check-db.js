const { Pool } = require('pg');
const pool = new Pool({
    host: '127.0.0.1',
    port: 9000,
    database: 'risk_assessment_db',
    user: 'postgres',
    password: 'password'
});

pool.query("SELECT COUNT(*) FROM import_risk_analysis WHERE job_id = 'd89430c3-32f4-4bbb-8efa-ec9a91e5985f';").then(res => {
    console.log('Total rows in analysis:', res.rows[0]);
    pool.end();
}).catch(console.error);
