import * as XLSX from 'xlsx';
import * as path from 'path';

const data = [
    [], // Row 1: Empty
    ['ORGANIZATION RISK REGISTER - 2026'], // Row 2: Title
    ['Risk Code', 'Statement', 'Category', 'Likelihood', 'Impact', 'Status'], // Row 3: Headers
    ['R-001', 'Data breach via phishing', 'Cyber', '4', '5', 'Open'],
    ['R-002', 'Warehouse flood risk', 'Physical', '2', '4', 'Mitigated']
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Risks');

const filePath = path.join(__dirname, 'tricky_test_file.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Created tricky test file at: ${filePath}`);
