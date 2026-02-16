import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import * as XLSX from 'xlsx';

const API_URL = 'http://localhost:9000/api/v1';

// Test Data
const TEST_EMAIL = `audit_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Password123!';
const TEST_RISK_CODE = `IMP-TEST-${Date.now()}`;

async function runVerification() {
    console.log('🔍 Starting Audit & Import Verification...');

    try {
        // 1. Register/Login Temp User
        console.log('\n1️⃣  Authenticating...');
        let token = '';
        try {
            const regMap = await axios.post(`${API_URL}/auth/register`, {
                full_name: 'Audit Tester',
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                tenant_name: 'Audit Corp'
            });
            token = regMap.data.token;
        } catch (e) {
            // Login if exists
            const login = await axios.post(`${API_URL}/auth/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            token = login.data.token;
        }
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        console.log('   ✅ Authenticated.');

        // 2. Create a "Base Risk" to test Updates
        console.log('\n2️⃣  Creating Base Risk for "Before/After" test...');
        const baseRiskRes = await axios.post(`${API_URL}/risks`, {
            risk_code: TEST_RISK_CODE,
            statement: 'Original Risk Statement',
            description: 'Original Description',
            category: 'SECURITY',
            likelihood_score: 1,
            impact_score: 1,
            status: 'ACTIVE'
        }, authHeaders);
        const baseRiskId = baseRiskRes.data.risk.risk_id;
        console.log(`   ✅ Created Risk ${TEST_RISK_CODE} (ID: ${baseRiskId})`);

        // 3. Prepare Excel File for Import
        console.log('\n3️⃣  Preparing Import File...');
        // Row 1: Update existing risk (changing likelihood 1->5)
        // Row 2: Create new risk
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['Risk Code', 'Statement', 'Description', 'Category', 'Likelihood', 'Impact'], // Headers
            [TEST_RISK_CODE, 'Updated Risk Statement', 'Updated Description', 'SECURITY', 5, 5], // Update
            ['NEW-RISK-001', 'Completely New Risk', 'New Desc', 'OPERATIONAL', 3, 3] // New
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Risks');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        fs.writeFileSync('temp_audit_import.xlsx', buffer);
        console.log('   ✅ Created temp_audit_import.xlsx');

        // 4. Upload & Execute Import
        console.log('\n4️⃣  Uploading Import File...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream('temp_audit_import.xlsx'));

        const uploadRes = await axios.post(`${API_URL}/import/upload`, formData, {
            headers: { ...authHeaders.headers, ...formData.getHeaders() }
        });
        const jobId = uploadRes.data.job_id;
        console.log(`   ✅ Job Started: ${jobId}`);

        // 5. Confirm Mappings (Trigger Execution)
        console.log('   Please wait for analysis...');
        await new Promise(r => setTimeout(r, 2000)); // Wait for analysis

        await axios.post(`${API_URL}/import/jobs/${jobId}/confirm-mapping`, {
            column_mappings: [
                { excel_column: 'A', map_to_field: 'risk_code' },
                { excel_column: 'B', map_to_field: 'statement' },
                { excel_column: 'C', map_to_field: 'description' },
                { excel_column: 'D', map_to_field: 'category' },
                { excel_column: 'E', map_to_field: 'likelihood_score' },
                { excel_column: 'F', map_to_field: 'impact_score' }
            ],
            merge_decisions: {}, // Default behavior
            import_options: { default_owner_id: baseRiskRes.data.risk.owner_user_id }
        }, authHeaders);
        console.log('   ✅ Import Execution Triggered.');

        // 6. Wait for Completion
        console.log('   Waiting for completion...');
        let status = 'processing';
        let jobResult;
        while (status !== 'completed' && status !== 'failed') {
            await new Promise(r => setTimeout(r, 1000));
            const check = await axios.get(`${API_URL}/import/jobs/${jobId}/results`, authHeaders);
            status = check.data.status;
            jobResult = check.data;
        }

        if (status === 'failed') throw new Error(`Import Failed: ${JSON.stringify(jobResult.errors)}`);
        console.log('   ✅ Import Completed Successfully.');

        // 7. ASSERT REQUIREMENT 1: No Data Loss (New Risk Created)
        console.log('\n7️⃣  Verifying Requirement: No Data Loss...');
        const allRisks = await axios.get(`${API_URL}/risks`, authHeaders);
        const newRisk = allRisks.data.risks.find((r: any) => r.statement === 'Completely New Risk');
        if (!newRisk) throw new Error('FAILED: New risk not found!');
        console.log('   ✅ PASS: New Risk Created.');

        // 8. ASSERT REQUIREMENT 2 & 3: Audit Logging & Before/After
        console.log('\n8️⃣  Verifying Requirement: Audit Granularity & Before/After...');
        const history = await axios.get(`${API_URL}/risks/${baseRiskId}`, authHeaders);
        const auditTrail = history.data.history;

        const updateLog = auditTrail.find((h: any) => h.change_reason.includes(jobId) && h.change_type === 'updated');

        if (!updateLog) throw new Error('FAILED: No audit log found for bulk update!');
        console.log('   ✅ PASS: Audit Log Found for Bulk Update.');

        const oldValue = JSON.parse(updateLog.old_value || '{}');
        const newValue = JSON.parse(updateLog.new_value || '{}');

        if (oldValue.likelihood_score != 1 || newValue.likelihood_score != 5) {
            console.log('Old:', oldValue.likelihood_score, 'New:', newValue.likelihood_score);
            throw new Error('FAILED: Before/After values do not match expected (1 -> 5)');
        }
        console.log(`   ✅ PASS: Before/After Comparison Verified (Likelihood: ${oldValue.likelihood_score} -> ${newValue.likelihood_score})`);

        // 9. ASSERT REQUIREMENT 4: Export Audit Trail
        console.log('\n9️⃣  Verifying Requirement: Export Audit Trail...');
        const exportRes = await axios.get(`${API_URL}/audit/export`, {
            ...authHeaders,
            responseType: 'arraybuffer'
        });

        if (exportRes.headers['content-type'] !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            throw new Error('FAILED: Incorrect Content-Type for export');
        }
        if (exportRes.data.length < 100) {
            throw new Error('FAILED: Export file is suspiciously small/empty');
        }
        console.log(`   ✅ PASS: Audit Trail Exported (${exportRes.data.length} bytes).`);

        console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');

        // Cleanup
        fs.unlinkSync('temp_audit_import.xlsx');

    } catch (error: any) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

runVerification();
