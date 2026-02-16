import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface Issue {
    issue: string;
    severity: 'BLOCKING' | 'WARNING';
    affected_rows: any[];
    remediation: string;
}

interface AnalysisReport {
    data_quality_score: number;
    assessment_summary: string;
    blocking_issues: Issue[];
    warnings: Issue[];
    field_completeness: { [key: string]: string };
    safe_to_proceed: boolean;
    remediation_steps: string[];
    confidence_score: number;
    rationale: string;
}

const ALLOWED_STATUSES = ['identified', 'assessed', 'mitigated', 'accepted', 'closed'];
const ALLOWED_PRIORITIES = ['critical', 'high', 'medium', 'low'];

function analyzeDataset(filePath: string): AnalysisReport {
    const report: AnalysisReport = {
        data_quality_score: 0,
        assessment_summary: "",
        blocking_issues: [],
        warnings: [],
        field_completeness: {},
        safe_to_proceed: false,
        remediation_steps: [],
        confidence_score: 0.95,
        rationale: "Analysis based on database schema constraints and standard data quality heuristics."
    };

    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as any[];

        if (data.length === 0) {
            report.blocking_issues.push({
                issue: "Dataset is empty",
                severity: "BLOCKING",
                affected_rows: ["All"],
                remediation: "Provide a dataset with at least one record."
            });
            return report;
        }

        const headers = Object.keys(data[0]);

        // 1. Detect structural issues (Headers)
        const requiredColMap: { [key: string]: string[] } = {
            "Risk Title": ["Risk Title", "title", "Risk Statement", "Risk Statement or title"],
            "Likelihood": ["Likelihood", "Likelihood Score", "likelihood_score", "likelihood"],
            "Impact": ["Impact", "Impact Score", "impact_score", "impact"]
        };

        const foundCols: { [key: string]: string } = {};
        for (const [stdName, aliases] of Object.entries(requiredColMap)) {
            for (const alias of aliases) {
                if (headers.includes(alias)) {
                    foundCols[stdName] = alias;
                    break;
                }
            }
        }

        if (!foundCols["Risk Title"]) {
            report.blocking_issues.push({
                issue: "Missing 'Risk Title' or equivalent column",
                severity: "BLOCKING",
                affected_rows: ["All"],
                remediation: "Add a column for Risk Title/Statement (e.g., 'Risk Title', 'title')."
            });
        }

        // 2. Check completeness
        headers.forEach(header => {
            const nonNullCount = data.filter(row => row[header] !== null && row[header] !== "").length;
            report.field_completeness[header] = `${((nonNullCount / data.length) * 100).toFixed(1)}%`;
        });

        // 3. Row-level validation
        data.forEach((row, idx) => {
            const rowNum = idx + 2; // +1 for 0-index, +1 for header

            // Required Title check
            if (foundCols["Risk Title"]) {
                const titleVal = row[foundCols["Risk Title"]];
                if (!titleVal || String(titleVal).trim() === "") {
                    report.blocking_issues.push({
                        issue: "Required field 'Risk Title' is blank",
                        severity: "BLOCKING",
                        affected_rows: [rowNum],
                        remediation: "Provide a title for this risk entry."
                    });
                }
            }

            // Likelihood range check
            if (foundCols["Likelihood"]) {
                const lVal = parseFloat(row[foundCols["Likelihood"]]);
                if (isNaN(lVal)) {
                    if (row[foundCols["Likelihood"]] !== null) {
                        report.blocking_issues.push({
                            issue: `Invalid Likelihood: ${row[foundCols["Likelihood"]]}`,
                            severity: "BLOCKING",
                            affected_rows: [rowNum],
                            remediation: "Likelihood must be a numeric value."
                        });
                    }
                } else if (lVal < 1 || lVal > 5) {
                    report.warnings.push({
                        issue: `Likelihood ${lVal} is out of typical range (1-5)`,
                        severity: "WARNING",
                        affected_rows: [rowNum],
                        remediation: "Ensure the score is within the standard 1-5 range."
                    });
                }
            }

            // Impact range check
            if (foundCols["Impact"]) {
                const iVal = parseFloat(row[foundCols["Impact"]]);
                if (isNaN(iVal)) {
                    if (row[foundCols["Impact"]] !== null) {
                        report.blocking_issues.push({
                            issue: `Invalid Impact: ${row[foundCols["Impact"]]}`,
                            severity: "BLOCKING",
                            affected_rows: [rowNum],
                            remediation: "Impact must be a numeric value."
                        });
                    }
                } else if (iVal < 1 || iVal > 5) {
                    report.warnings.push({
                        issue: `Impact ${iVal} is out of typical range (1-5)`,
                        severity: "WARNING",
                        affected_rows: [rowNum],
                        remediation: "Ensure the score is within the standard 1-5 range."
                    });
                }
            }

            // Status validation
            const statusHeader = headers.find(h => h.toLowerCase() === 'status');
            if (statusHeader) {
                const statusVal = String(row[statusHeader]).toLowerCase();
                if (row[statusHeader] && !ALLOWED_STATUSES.includes(statusVal)) {
                    report.warnings.push({
                        issue: `Invalid Status: ${row[statusHeader]}`,
                        severity: "WARNING",
                        affected_rows: [rowNum],
                        remediation: `Use one of: ${ALLOWED_STATUSES.join(', ')}`
                    });
                }
            }

            // Priority validation
            const priorityHeader = headers.find(h => h.toLowerCase() === 'priority');
            if (priorityHeader) {
                const priorityVal = String(row[priorityHeader]).toLowerCase();
                if (row[priorityHeader] && !ALLOWED_PRIORITIES.includes(priorityVal)) {
                    report.warnings.push({
                        issue: `Invalid Priority: ${row[priorityHeader]}`,
                        severity: "WARNING",
                        affected_rows: [rowNum],
                        remediation: `Use one of: ${ALLOWED_PRIORITIES.join(', ')}`
                    });
                }
            }

            // Date validation
            const dateHeader = headers.find(h => h.toLowerCase().includes('date'));
            if (dateHeader && row[dateHeader]) {
                const d = new Date(row[dateHeader]);
                if (isNaN(d.getTime())) {
                    report.blocking_issues.push({
                        issue: `Malformed date: ${row[dateHeader]}`,
                        severity: "BLOCKING",
                        affected_rows: [rowNum],
                        remediation: "Use standard YYYY-MM-DD format."
                    });
                }
            }
        });

        // Summary and Scoring
        const blockingCount = report.blocking_issues.length;
        const warningCount = report.warnings.length;

        if (blockingCount === 0) {
            report.safe_to_proceed = true;
            report.data_quality_score = Math.max(0, 100 - (warningCount * 5));
            report.assessment_summary = "Dataset structure and data types are valid. Ready for import.";
        } else {
            report.safe_to_proceed = false;
            report.data_quality_score = Math.max(0, 50 - (blockingCount * 10));
            report.assessment_summary = `Dataset has ${blockingCount} blocking issues and ${warningCount} warnings that should be addressed.`;
        }

        if (blockingCount > 0) {
            report.remediation_steps.push("Fix all BLOCKING issues before attempting import.");
        }
        if (warningCount > 0) {
            report.remediation_steps.push("Review and address WARNINGS to ensure data cleanliness.");
        }

    } catch (error: any) {
        report.blocking_issues.push({
            issue: `Failed to process file: ${error.message}`,
            severity: "BLOCKING",
            affected_rows: ["All"],
            remediation: "Check if the file is a valid Excel or CSV file."
        });
        report.safe_to_proceed = false;
        report.assessment_summary = "File processing failed.";
    }

    return report;
}

const csvPath = path.resolve(__dirname, '../../../../sample_risk_register.csv');
const report = analyzeDataset(csvPath);
console.log(JSON.stringify(report, null, 2));
