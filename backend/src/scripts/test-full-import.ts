
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
// Node 18+ has global fetch and FormData

const API_URL = 'http://localhost:9000/api/v1';

async function runTest() {
    console.log('🚀 Starting End-to-End Import Test (using fetch)...');

    // 1. Create a dummy Excel file
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Risk Title', 'Description', 'Category', 'Likelihood', 'Impact'],
        ['Server Crash', 'Production server crashes due to memory leak', 'Operational', 3, 5],
        ['Data Leak', 'Customer emails exposed via API', 'Cybersecurity', 2, 9],
        ['Vendor Bankruptcy', 'Key supplier goes out of business', 'Strategic', 1, 8]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Risks');

    const filePath = path.join(__dirname, 'test-import.xlsx');
    XLSX.writeFile(wb, filePath);
    console.log(`✅ Created test file: ${filePath}`);

    try {
        // 2. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'jd@gmail.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        const loginData: any = await loginRes.json();
        console.log('🔍 Login Response:', JSON.stringify(loginData, null, 2));

        const token = loginData.access_token || loginData.token;
        if (!token) throw new Error('Token missing from login response');

        console.log('✅ Logged in successfully. Token length:', token.length);

        const headers = { 'Authorization': `Bearer ${token}` };

        // 3. Upload File
        const fileContent = fs.readFileSync(filePath);
        const form = new FormData();
        // Native FormData in Node 18+ expects Blob or File. Buffer alone might fail in some versions if not wrapped.
        // Let's us a Blob which is standard.
        const blob = new Blob([fileContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        form.append('file', blob, 'test-import.xlsx');

        console.log('📤 Uploading file...');
        const uploadRes = await fetch(`${API_URL}/import/upload`, {
            method: 'POST',
            headers: { ...headers }, // Don't set Content-Type manually for FormData
            body: form
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
        const uploadData: any = await uploadRes.json();
        const jobId = uploadData.job_id;
        console.log(`✅ Upload success! Job ID: ${jobId}`);

        // 4. Poll for Analysis
        console.log('⏳ Waiting for analysis to complete...');

        // Wait for sheet processing (server bg job)
        await new Promise(r => setTimeout(r, 2000));

        // Confirm Mapping
        console.log('🗺️ Confirming mapping...');
        const mapRes = await fetch(`${API_URL}/import/jobs/${jobId}/confirm-mapping`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                column_mappings: [
                    { excel_column: 'A', mapped_to_field: 'risk_statement' },
                    { excel_column: 'B', mapped_to_field: 'description' },
                    { excel_column: 'C', mapped_to_field: 'category' },
                    { excel_column: 'D', mapped_to_field: 'likelihood' },
                    { excel_column: 'E', mapped_to_field: 'impact' }
                ]
            })
        });
        if (!mapRes.ok) console.warn('Mapping confirm warning:', await mapRes.text());

        // Trigger Analysis
        console.log('🤖 Triggering AI Analysis...');
        const analyzeRes = await fetch(`${API_URL}/import/jobs/${jobId}/analyze-risks`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (!analyzeRes.ok) throw new Error(`Analysis trigger failed: ${analyzeRes.status}`);

        // Poll
        let status = 'processing';
        let limits = 0;

        while (status !== 'analyzed' && status !== 'completed' && status !== 'failed' && limits < 30) {
            await new Promise(r => setTimeout(r, 2000));
            const jobRes = await fetch(`${API_URL}/import/jobs/${jobId}`, { headers });
            const jobData: any = await jobRes.json();
            status = jobData.status;
            process.stdout.write(`.`);
            limits++;
        }
        console.log(`\nStatus: ${status}`);

        if (status === 'analyzed' || status === 'completed') {
            console.log('✅ Analysis Job Completed!');

            // Check results
            const resultsRes = await fetch(`${API_URL}/import/jobs/${jobId}/risks?limit=5`, { headers });
            const resultsData: any = await resultsRes.json();
            const risk = resultsData.risks[0];

            console.log('--- SAMPLE RESULT ---');
            console.log('Original Title:', risk.original_data.statement);
            console.log('Improved Title:', risk.ai_analysis?.improved_statement);
            console.log('Financial:', risk.ai_analysis?.score_analysis?.financial_impact_estimate);
            console.log('Remediation:', risk.ai_analysis?.score_analysis?.strategic_remediation);

            if (risk.ai_analysis?.score_analysis?.financial_impact_estimate) {
                console.log('🎉 SUCCESS: Financial impact found!');
            } else {
                console.log('❌ FAILURE: Financial impact missing.');
            }
        } else {
            console.log('❌ Analysis Timed Out or Failed');
        }

    } catch (error: any) {
        console.error('❌ Test Failed:', error);
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

runTest();
