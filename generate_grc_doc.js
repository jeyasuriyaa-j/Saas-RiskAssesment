const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    PageBreak,
    ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR =
    "C:\\Users\\JeyasuriyaaJeyakumar\\.gemini\\antigravity\\brain\\712189ba-94f1-4d63-8d75-6e50fb003de1";

// Helper to load image buffer safely
function loadImage(filename) {
    const fullPath = path.join(ARTIFACTS_DIR, filename);
    if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
    }
    console.warn(`  [WARNING] Image not found: ${fullPath}`);
    return null;
}

// Helper: figure paragraph
function figureImage(filename, caption, index) {
    const buf = loadImage(filename);
    const items = [];
    if (buf) {
        items.push(
            new Paragraph({
                children: [
                    new ImageRun({
                        data: buf,
                        transformation: { width: 580, height: 320 },
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 100 },
            })
        );
    }
    items.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Figure ${index}: ${caption}`,
                    italics: true,
                    size: 18,
                    color: "888888",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
        })
    );
    return items;
}

// Helper: section heading
function h1(text) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        thematicBreak: false,
    });
}

function h2(text) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
    });
}

function h3(text) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
    });
}

function body(text) {
    return new Paragraph({
        children: [new TextRun({ text, size: 22 })],
        spacing: { after: 150 },
    });
}

function bullet(text, bold = false) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    const runs = parts.map((part, i) =>
        i % 2 === 1
            ? new TextRun({ text: part, bold: true, size: 22 })
            : new TextRun({ text: part, size: 22 })
    );
    return new Paragraph({
        children: runs,
        bullet: { level: 0 },
        spacing: { after: 80 },
    });
}

function divider() {
    return new Paragraph({
        children: [new TextRun({ text: "", size: 12 })],
        thematicBreak: true,
        spacing: { before: 200, after: 200 },
    });
}

// SOC 2 Table
function buildSoc2Table() {
    const headerShade = { fill: "3B0DC9", type: ShadingType.CLEAR, color: "auto" };
    const altShade = { fill: "F0EFFE", type: ShadingType.CLEAR, color: "auto" };

    const makeHeaderCell = (text) =>
        new TableCell({
            children: [
                new Paragraph({
                    children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22 })],
                }),
            ],
            shading: headerShade,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
        });

    const makeCell = (text, shade = false) =>
        new TableCell({
            children: [
                new Paragraph({
                    children: [new TextRun({ text, size: 22 })],
                }),
            ],
            shading: shade ? altShade : undefined,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
        });

    const rows = [
        {
            principle: "Security",
            support:
                "Centralized risk identification and incident tracking to protect against unauthorized access.",
        },
        {
            principle: "Availability",
            support:
                "Monitoring of operational risks (e.g., system downtime) and remediation planning.",
        },
        {
            principle: "Confidentiality",
            support:
                "Role-Based Access Control (RBAC) ensuring sensitive data is visible only to authorized personnel.",
        },
        {
            principle: "Processing Integrity",
            support:
                "Standardized scoring models and AI-assisted analysis for consistency and accuracy in risk reporting.",
        },
    ];

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [makeHeaderCell("SOC 2 Principle"), makeHeaderCell("Platform Support")],
                tableHeader: true,
            }),
            ...rows.map(
                (r, i) =>
                    new TableRow({
                        children: [makeCell(r.principle, i % 2 === 0), makeCell(r.support, i % 2 === 0)],
                    })
            ),
        ],
        margins: { top: 200, bottom: 200 },
    });
}

async function main() {
    console.log("Building GRC Word Document...");

    const doc = new Document({
        title: "SWOT RISK - GRC Walkthrough",
        description: "Professional GRC Walkthrough aligned with SOC 2",
        styles: {
            paragraphStyles: [
                {
                    id: "Heading1",
                    name: "Heading 1",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 36, bold: true, color: "3B0DC9" },
                    paragraph: { spacing: { before: 400, after: 200 } },
                },
                {
                    id: "Heading2",
                    name: "Heading 2",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 28, bold: true, color: "5522DD" },
                    paragraph: { spacing: { before: 300, after: 150 } },
                },
                {
                    id: "Heading3",
                    name: "Heading 3",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { size: 24, bold: true, color: "333333" },
                    paragraph: { spacing: { before: 200, after: 100 } },
                },
            ],
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
                    },
                },
                children: [
                    // ─── COVER PAGE ───────────────────────────────────────────
                    new Paragraph({
                        children: [new TextRun({ text: "", break: 4 })],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "SWOT RISK",
                                bold: true,
                                size: 72,
                                color: "3B0DC9",
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Enterprise Edition",
                                size: 32,
                                color: "555555",
                                italics: true,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "GRC Platform Walkthrough",
                                bold: true,
                                size: 52,
                                color: "222222",
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Risk Management & SOC 2 Alignment",
                                size: 30,
                                color: "666666",
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Prepared: February 2026  |  Classification: Confidential`,
                                size: 20,
                                color: "888888",
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ children: [new PageBreak()] }),

                    // ─── SECTION 1: INTRODUCTION ──────────────────────────────
                    h1("1. Introduction"),
                    h2("Purpose of the Application"),
                    body(
                        "The SWOT Risk Management platform is a comprehensive Governance, Risk, and Compliance (GRC) solution designed to centralize and automate the lifecycle of risk management. It provides a single source of truth for identifying, assessing, mitigating, and monitoring organizational risks while ensuring transparency and accountability."
                    ),
                    h2("Target Users"),
                    bullet("**Security & Compliance Teams:** To manage SOC 2 controls, evidence, and risk registers."),
                    bullet("**Risk Managers:** To oversee the risk landscape and coordinate mitigation efforts."),
                    bullet("**IT & Operations:** To implement technical controls and respond to incidents."),
                    bullet("**Management & Executive Board:** To gain high-level visibility for strategic decision-making."),
                    h2("GRC Pillars Supported"),
                    bullet("**Risk Governance:** Standardized methodologies for risk identification and scoring."),
                    bullet("**Control Oversight:** Systematic tracking of Control Library effectiveness."),
                    bullet("**Continuous Monitoring:** Real-time dashboards and AI-powered drift detection."),
                    bullet("**Audit Readiness:** Detailed audit trail of all risk treatments for SOC 2 Type I/II."),
                    divider(),

                    // ─── SECTION 2: SOC 2 CONTEXT ─────────────────────────────
                    h1("2. SOC 2 Context Overview"),
                    body(
                        "The platform is engineered to align with the AICPA Trust Services Criteria (TSC), specifically supporting the following SOC 2 principles:"
                    ),
                    buildSoc2Table(),
                    divider(),

                    // ─── SECTION 3: USER ACCESS ───────────────────────────────
                    h1("3. User Access & Authentication"),
                    body(
                        "Effective logical access control is a cornerstone of SOC 2 (CC6.1). The platform implements strict Role-Based Access Control (RBAC) to ensure that users only access functionality necessary for their roles."
                    ),
                    h2("Role-Based Visibility"),
                    bullet("**Admin:** Full governance control, user management, and system configuration."),
                    bullet("**Risk Manager:** Oversight of all risks and controls; ability to assign tasks."),
                    bullet("**Auditor:** Specialized Read-Only access to all registers and evidence."),
                    bullet("**Standard User:** Focused view of assigned risks and remediation actions."),
                    ...figureImage("media__1771836178998.png", "Secure Login portal with Role-Based Access Control and Enterprise SSO integration.", 1),
                    divider(),

                    // ─── SECTION 4: DASHBOARD ─────────────────────────────────
                    h1("4. Dashboard — Risk Visibility"),
                    body(
                        "The Dashboard provides the Continuous Monitoring required for SOC 2 (CC4.1). It offers real-time visualization of the risk landscape, allowing leadership to perform rapid oversight."
                    ),
                    h2("Key Metrics"),
                    bullet("**Analytics Overview:** Real-time tracking of Total Risks, Critical items, Mitigated, and Closed risks."),
                    bullet("**Risk Distribution Matrix (Heatmap):** Visualizes risk density across Likelihood and Impact axes."),
                    bullet("**Portfolio Health:** Immediate visibility into critical exposures requiring urgent attention."),
                    ...figureImage("media__1771836197524.png", "Analytics Overview illustrating live risk distribution and portfolio monitoring.", 2),
                    divider(),

                    // ─── SECTION 5: RISK IDENTIFICATION ──────────────────────
                    h1("5. Risk Identification"),
                    body(
                        "A structured risk identification process (SOC 2 CC3.2) is critical for comprehensive coverage. The Risk Register allows systematic capture of potential threats across all departments."
                    ),
                    h2("Risk Attributes"),
                    bullet("**Unique Identifiers:** Automated ID generation (e.g., RISK-2026-157) for precise audit traceability."),
                    bullet("**Severity Categorization:** Visual indicators for severity (Critical, High, Medium, Low)."),
                    bullet("**Departmental Context:** Mapping risks to IT, Marketing, Operations, Finance, and HR."),
                    ...figureImage("media__1771836212183.png", "Centralized Risk Register displaying categorized threats and current status tracking.", 3),
                    divider(),

                    // ─── SECTION 6: ASSESSMENT & SCORING ─────────────────────
                    h1("6. Risk Assessment & Scoring"),
                    body(
                        "The platform utilizes a standardized scoring methodology to ensure objective risk prioritization. Risks are assessed based on Impact and Likelihood, resulting in an objective risk score."
                    ),
                    h2("AI-Powered Methodology"),
                    bullet("**AI Strategic Insights:** Deep-learning analysis provides context-aware assessments and mitigation suggestions."),
                    bullet("**AI Scoring Assistant:** Recommends objective scores based on risk statements and descriptions."),
                    ...figureImage("media__1771836268838.png", "Detailed Risk Assessment view with AI-powered scoring assistance and strategic insights.", 4),
                    divider(),

                    // ─── SECTION 7: RISK TREATMENT ────────────────────────────
                    h1("7. Risk Treatment & Mitigation"),
                    body(
                        "Once assessed, risks must be treated (SOC 2 CC3.3). The platform supports primary treatment strategies: Reduction, Acceptance, Transfer, and Avoidance."
                    ),
                    h2("Remediation Tracking"),
                    body(
                        "Remediation plans are linked to controls and tracked through lifecycle statuses (Identified → In Progress → Mitigated → Closed). The My Risks view provides individual owners with a tailored checklist of their responsibilities."
                    ),
                    ...figureImage("media__1771836399376.png", "Personal Risk Dashboard (My Risks) ensuring accountability for remediation tasks.", 5),
                    divider(),

                    // ─── SECTION 8: CONTROL MAPPING ───────────────────────────
                    h1("8. Control Mapping & Evidence (SOC 2 Critical)"),
                    body(
                        "Traceability is the 'Golden Thread' of an audit. The Control Library links specific security controls directly to identified risks and operational tasks."
                    ),
                    h2("Control Attributes"),
                    bullet("**Classification:** Preventive, Detective, or Corrective controls."),
                    bullet("**Implementation Tracking:** Real-time status updates (Designed, Implemented, Optimized)."),
                    bullet("**Effectiveness Scoring:** Standardized assessments to provide assurance to auditors."),
                    ...figureImage("media__1771836317805.png", "Control Library managing enterprise security controls and implementation status.", 6),
                    divider(),

                    // ─── SECTION 9: AI RISK ASSISTANT ─────────────────────────
                    h1("9. AI Risk Assistant"),
                    body(
                        "The platform features a built-in AI Risk Assistant (Chat Bot) that provides conversational access to the entire risk landscape. Available on every page, it enables instant querying without navigating menus."
                    ),
                    h2("Capabilities"),
                    bullet('**Natural Language Querying:** Ask questions like "What are my most critical IT risks?" or "Show overdue tasks."'),
                    bullet("**Contextual Intelligence:** Provides immediate insights based on the current view (Compliance, Risks, or Controls)."),
                    bullet("**Audit Support:** Quickly retrieves evidence or control status during auditor walkthroughs."),
                    ...figureImage("media__1771836500141.png", "AI Risk Assistant providing real-time, conversational insights into the GRC environment.", 7),
                    divider(),

                    // ─── SECTION 10: INCIDENT MANAGEMENT ──────────────────────
                    h1("10. Monitoring & Incident Management"),
                    body(
                        "SOC 2 requires the logging and resolution of security events (CC7.2). The Incidents page centralizes the monitoring of threats and their full lifecycle management."
                    ),
                    h2("Features"),
                    bullet("**Event Logging:** Capture security events with severity levels (Critical, High, Medium, Low)."),
                    bullet("**AI Root Cause Analysis:** AI-assisted deep-dive investigation into systemic failures."),
                    bullet("**Resolution Tracking:** Every incident has a documented resolution, vital for audit evidence."),
                    ...figureImage("media__1771836366427.png", "Centralized Incident & Event monitoring for SOC 2 security compliance.", 8),
                    divider(),

                    // ─── SECTION 11: EXECUTIVE REPORTING ──────────────────────
                    h1("11. Reporting & Executive Governance"),
                    body(
                        "The Executive Board Deck provides automated, AI-generated summaries tailored for stakeholders, the Board, and external auditors."
                    ),
                    h2("Deliverables"),
                    bullet("**AI Executive Summary:** Narrative summaries of current risk posture and compliance status."),
                    bullet("**Stakeholder Briefs:** Tailored report generation for CRO, Auditor, and Board of Directors."),
                    bullet("**Exportable Artifacts:** PDF export for Board meetings and SOC 2 audit submissions."),
                    ...figureImage("media__1771836417519.png", "Executive Board Deck featuring AI-generated stakeholder summaries.", 9),
                    divider(),

                    // ─── SECTION 12: GOVERNANCE & COMPLIANCE ─────────────────
                    h1("12. Governance & Compliance Frameworks"),
                    body(
                        "The AI Analysis module provides dedicated governance tooling, including compliance framework monitoring. The platform actively monitors SOC 2 Type II as its primary framework."
                    ),
                    h2("Framework Monitoring"),
                    bullet("**Compliance Exposure:** Real-time visibility into framework coverage and control gaps."),
                    bullet("**Compliance Impact Insight (AI):** AI-driven alerts on potential regulatory scrutiny based on current exposures."),
                    bullet("**Framework Library:** Centralized management of SOC 2, ISO 27001, and other industry standards."),
                    ...figureImage("media__1771836485858.png", "Governance & Compliance module monitoring SOC 2 framework alignment and exposure.", 10),
                    divider(),

                    // ─── SECTION 13: ADMINISTRATION ───────────────────────────
                    h1("13. Administration & Configuration"),
                    body(
                        "Admin Settings allow governance teams to configure the platform to specific risk appetite, scoring models, and AI capabilities."
                    ),
                    h2("Configuration Areas"),
                    bullet("**AI Controls:** Granular toggles for AI Risk Scoring, Outlier Detection, and Excel Import mapping."),
                    bullet("**User Management:** Centralized control over roles, departments, and user status (Active/Inactive)."),
                    bullet("**Audit History:** Comprehensive logs of all administrative and governance changes."),
                    ...figureImage("media__1771836446310.png", "Administrative settings for configuring AI parameters and organizational governance.", 11),
                    divider(),

                    // ─── CLOSING ──────────────────────────────────────────────
                    h1("14. Summary"),
                    body(
                        "The SWOT RISK platform provides a comprehensive, audit-ready GRC solution. By combining structured risk identification, AI-powered scoring, automated reporting, and a conversational AI assistant, the platform dramatically reduces the compliance burden while improving organizational risk posture."
                    ),
                    new Paragraph({ spacing: { after: 600 } }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "© 2026 SWOT Risk Platform  |  All Rights Reserved  |  Confidential",
                                size: 18,
                                color: "AAAAAA",
                                italics: true,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                    }),
                ],
            },
        ],
    });

    const outPath = path.join(
        "c:\\Users\\JeyasuriyaaJeyakumar\\Desktop\\Antigravity\\Saas-RiskAssesment-main\\Saas-RiskAssesment-main",
        "GRC_Walkthrough.docx"
    );
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    console.log(`\n✅  Document saved to: ${outPath}`);
}

main().catch((e) => {
    console.error("Error:", e);
    process.exit(1);
});
