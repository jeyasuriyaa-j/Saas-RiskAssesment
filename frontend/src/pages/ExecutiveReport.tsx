import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
    CircularProgress,
    Divider,
    Stack,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    alpha
} from '@mui/material';
import {
    Print as PrintIcon,
    TrendingUp as TrendingUpIcon,
    Shield as ShieldIcon,
    Assessment as AssessmentIcon,
    Psychology as PsychologyIcon
} from '@mui/icons-material';
import { analyticsAPI } from '../services/api';

export default function ExecutiveReport() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Brief Generation State
    const [briefAudience, setBriefAudience] = useState<string>('BOARD');
    const [briefData, setBriefData] = useState<any>(null);
    const [briefLoading, setBriefLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await analyticsAPI.getBoardSummary();
                setData(res.data.data);
            } catch (err) {
                console.error('Failed to fetch board summary:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleGenerateBrief = async () => {
        setBriefLoading(true);
        try {
            const res = await analyticsAPI.generateStakeholderBrief(briefAudience);
            setBriefData(res.data);
        } catch (err) {
            console.error('Failed to generate brief:', err);
        } finally {
            setBriefLoading(false);
        }
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
        </Box>
    );

    if (!data) return <Typography color="error">Failed to load board summary.</Typography>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
            {/* Header Section */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6} className="no-print ExecutiveReport-header">
                <Typography variant="h4" fontWeight="bold">SWOT Executive Briefings</Typography>
                <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{ borderRadius: 2 }}
                >
                    Export to PDF
                </Button>
            </Box>

            {/* Print Header (Visible only when printing) */}
            <Box sx={{ display: 'none', textAlign: 'center', mb: 4, displayPrint: 'block' }}>
                <Typography variant="h3" fontWeight="bold">Executive Risk Report</Typography>
                <Typography color="text.secondary">Generated on {new Date(data.generated_at).toLocaleDateString()}</Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Executive Summary Card */}
                <Grid item xs={12}>
                    <Paper sx={{
                        p: 4,
                        borderRadius: 4,
                        background: (theme) => theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)'
                            : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        color: 'white',
                        boxShadow: (theme) => theme.palette.mode === 'dark'
                            ? '0 8px 32px rgba(0,0,0,0.4)'
                            : '0 8px 32px rgba(0,0,0,0.1)'
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                            <PsychologyIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h5" fontWeight="bold">AI Executive Summary</Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ opacity: 0.9, lineHeight: 1.6, color: 'white' }}>
                            {data.executive_summary}
                        </Typography>
                        <Box mt={3} display="flex" gap={2}>
                            <Chip
                                label={`Status: ${data.overall_status}`}
                                color={data.metrics.risks_by_priority.critical > 0 ? 'error' : (data.overall_status === 'Elevated' ? 'warning' : 'success')}
                                sx={{
                                    bgcolor: 'white',
                                    color: (theme) => data.metrics.risks_by_priority.critical > 0
                                        ? theme.palette.error.main
                                        : (data.overall_status === 'Elevated'
                                            ? theme.palette.warning.main
                                            : theme.palette.success.main),
                                    fontWeight: 'bold'
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>

                {/* Persona Brief Generator (Sprint 15 Feature) */}
                <Grid item xs={12} className="no-print">
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Generate Stakeholder Brief</Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>
                            Create a tailored risk update for specific audiences.
                        </Typography>

                        <Stack direction="row" spacing={2} mb={4}>
                            {['BOARD', 'CRO', 'AUDITOR', 'TECHNICAL_TEAM'].map(role => (
                                <Chip
                                    key={role}
                                    label={role}
                                    onClick={() => setBriefAudience(role)}
                                    color={briefAudience === role ? 'primary' : 'default'}
                                    variant={briefAudience === role ? 'filled' : 'outlined'}
                                    clickable
                                />
                            ))}
                            <Button
                                variant="contained"
                                onClick={handleGenerateBrief}
                                disabled={briefLoading}
                                startIcon={briefLoading && <CircularProgress size={16} color="inherit" />}
                            >
                                {briefLoading ? 'Generating...' : 'Generate Brief'}
                            </Button>
                        </Stack>

                        {briefData && (
                            <Paper sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">SUBJECT</Typography>
                                        <Typography variant="subtitle1" fontWeight="bold">{briefData.subject}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">EXECUTIVE SUMMARY</Typography>
                                        <Typography variant="body1">{briefData.summary}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>KEY ACTIONS</Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 1 } }}>
                                            {briefData.key_actions.map((action: string, i: number) => (
                                                <Typography component="li" key={i} variant="body2" sx={{ color: 'text.primary' }}>
                                                    {action}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>

                                    <Box display="flex" justifyContent="flex-end">
                                        <Chip label={`Tone: ${briefData.tone}`} variant="outlined" size="small" />
                                    </Box>
                                </Stack>
                            </Paper>
                        )}
                    </Paper>
                </Grid>

                {/* Key Metrics Grid */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%' }}>
                        <AssessmentIcon sx={{ fontSize: 40, mb: 1, color: parseFloat(data.metrics.average_inherent_risk_score) > 18 ? 'error.main' : (parseFloat(data.metrics.average_inherent_risk_score) > 10 ? 'warning.main' : 'primary.main') }} />
                        <Typography color="text.secondary" gutterBottom>Portfolio Risk Level</Typography>
                        <Typography variant="h3" fontWeight="bold" sx={{ color: parseFloat(data.metrics.average_inherent_risk_score) > 18 ? 'error.main' : (parseFloat(data.metrics.average_inherent_risk_score) > 10 ? 'warning.main' : 'primary.main') }}>
                            {data.metrics.average_inherent_risk_score}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Avg Inherent Score</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%' }}>
                        <ShieldIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography color="text.secondary" gutterBottom>Compliance Status</Typography>
                        <Typography variant="h3" fontWeight="bold" color="success">
                            {data.compliance_overview.active}/{data.compliance_overview.total}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Active Frameworks</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%' }}>
                        <TrendingUpIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography color="text.secondary" gutterBottom>Concentration</Typography>
                        <Typography variant="h3" fontWeight="bold" color="warning.main">
                            {data.metrics.portfolio_concentration.concentration_score}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Top: {data.metrics.portfolio_concentration.top_concentrated_category}
                        </Typography>
                    </Paper>
                </Grid>

                {/* Top 5 Risks Table */}
                <Grid item xs={12} md={8} className="page-break">
                    <Typography variant="h6" fontWeight="bold" mb={2}>Top 5 Strategic Risks</Typography>
                    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Risk Statement</TableCell>
                                    <TableCell align="right">Score</TableCell>
                                    <TableCell>Category</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.top_risks.map((risk: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell sx={{ fontWeight: 500 }}>{risk.statement}</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={risk.score}
                                                size="small"
                                                color={risk.score > 15 ? 'error' : 'warning'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">{risk.category}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                {/* Risk Distribution Chart Placeholder */}
                <Grid item xs={12} md={4}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Inherent Risk Distribution</Typography>
                    <Paper sx={{
                        p: 3,
                        borderRadius: 3,
                        height: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.4) : 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Box textAlign="center">
                            <Box display="flex" gap={1} alignItems="flex-end" height={150} mb={2}>
                                {['low', 'medium', 'high', 'critical'].map((label, i) => {
                                    const count = data.metrics.risks_by_priority[label] || 0;
                                    const total = data.metrics.total_risks || 1;
                                    const displayHeight = count > 0 ? (count / total) * 120 : 0;

                                    return (
                                        <Box key={label} textAlign="center" sx={{ width: 45 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                                {count}
                                            </Typography>
                                            <Box sx={{
                                                width: 40,
                                                height: displayHeight,
                                                bgcolor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336'][i],
                                                borderRadius: '4px 4px 0 0',
                                                mx: 'auto',
                                                transition: 'height 0.3s ease'
                                            }} />
                                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{label === 'low' ? 'Low' : label === 'medium' ? 'Med' : label === 'high' ? 'High' : 'Crit'}</Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                            <Typography variant="body2" color="text.secondary">Risk Density Breakdown</Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Action Items Footer */}
                <Grid item xs={12}>
                    <Box mt={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>CONFIDENTIAL - FOR BOARD USE ONLY</Typography>
                        <Divider />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Platform v2.0 | Security Intelligence Engine | Generated at {new Date(data.generated_at).toLocaleString()}
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            {/* Print Specific styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    
                    /* Aggressively hide ALL non-report elements */
                    .no-print,
                    .MuiDrawer-root,
                    .MuiAppBar-root,
                    .sidebar,
                    header,
                    nav,
                    aside,
                    footer,
                    [role="complementary"],
                    button:not([type="button"]),
                    .MuiFab-root,
                    [aria-label="Chat"],
                    .intercom-launcher,
                    [class*="ChatWidget"],
                    /* Hide EVERYTHING sticky/fixed (Floating Top Pill, Chat bubble, etc) */
                    [style*="position: sticky"],
                    [style*="position: fixed"],
                    .MuiPaper-root[style*="sticky"] {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                    
                    /* Reset global layout */
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    #root, main {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        background: white !important;
                    }

                    /* Remove sidebar offset */
                    main {
                        margin-left: 0 !important;
                        padding-left: 0 !important;
                    }

                    /* Content specific resets */
                    main > div, 
                    main > div > div,
                    .MuiContainer-root {
                        max-width: 100% !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Card Styling for Print */
                    .MuiPaper-root {
                        background: #fff !important;
                        border: 1px solid #ddd !important;
                        box-shadow: none !important;
                        margin-bottom: 20px !important;
                        page-break-inside: avoid !important;
                        color: black !important;
                    }
                    
                    /* AI Summary Card - Specialized but clean */
                    .MuiPaper-root[style*="gradient"] {
                        background: #fdfdfd !important;
                        border: 2px solid #1a237e !important;
                        color: #1a237e !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Typography Contrast */
                    h3, h4, h5, h6, p, span, td, th {
                        color: #000 !important;
                        -webkit-print-color-adjust: exact;
                    }

                    /* Chart Bars - Force Background Color */
                    [class*="MuiBox-root"][style*="background-color"], 
                    [class*="MuiBox-root"][style*="bgcolor"] {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Force page break for Top Risks if necessary */
                    .page-break {
                        page-break-before: always !important;
                        padding-top: 10px !important;
                    }

                    /* Grid to Block for Print */
                    .MuiGrid-container {
                        display: block !important;
                    }
                    .MuiGrid-item {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin-bottom: 15px !important;
                    }

                    /* Hide the Export button itself in print */
                    .ExecutiveReport-header button {
                        display: none !important;
                    }
                }
            ` }} />
        </Box>
    );
}
