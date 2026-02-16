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
    TableRow
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={6} className="no-print">
                <Typography variant="h4" fontWeight="bold">Executive Board Deck</Typography>
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
                        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                            <PsychologyIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h5" fontWeight="bold">AI Executive Summary</Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                            {data.executive_summary}
                        </Typography>
                        <Box mt={3} display="flex" gap={2}>
                            <Chip
                                label={`Status: ${data.overall_status}`}
                                color={data.overall_status === 'Elevated' ? 'warning' : 'success'}
                                sx={{ bgcolor: 'white', color: 'primary.dark', fontWeight: 'bold' }}
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
                                        <Typography variant="caption" color="text.secondary">KEY ACTIONS</Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                            {briefData.key_actions.map((action: string, i: number) => (
                                                <Chip key={i} label={action} size="small" color="secondary" />
                                            ))}
                                        </Stack>
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
                        <AssessmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography color="text.secondary" gutterBottom>Portfolio Risk Level</Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary">
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
                    <Paper sx={{ p: 3, borderRadius: 3, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
                        <Box textAlign="center">
                            <Box display="flex" gap={1} alignItems="flex-end" height={150} mb={2}>
                                {['Low', 'Med', 'High', 'Crit'].map((label, i) => (
                                    <Box key={label} textAlign="center">
                                        <Box sx={{
                                            width: 40,
                                            height: [40, 80, 120, 60][i],
                                            bgcolor: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336'][i],
                                            borderRadius: '4px 4px 0 0'
                                        }} />
                                        <Typography variant="caption">{label}</Typography>
                                    </Box>
                                ))}
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
                        size: A4 landscape;
                        margin: 10mm;
                    }
                    
                    /* Hide navigation and non-content elements */
                    .no-print,
                    .MuiDrawer-root,
                    .MuiAppBar-root,
                    nav,
                    aside {
                        display: none !important;
                    }
                    
                    /* Ensure body and root are visible */
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Remove sidebar offset and use full width */
                    body > div,
                    #root,
                    main {
                        max-width: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        margin-left: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Ensure main content box uses full width */
                    main > div > div {
                        max-width: none !important;
                        width: 100% !important;
                        padding: 10mm !important;
                        margin: 0 !important;
                    }
                    
                    /* Page break controls - only for sections with page-break class */
                    .page-break {
                        page-break-before: always;
                    }
                    
                    /* Keep Paper components together */
                    .MuiPaper-root {
                        box-shadow: none !important;
                        border: 1px solid #ddd !important;
                        margin-bottom: 8px !important;
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    
                    /* Keep headings with content */
                    h3, h5, h6 {
                        page-break-after: avoid;
                        page-break-inside: avoid;
                    }
                    
                    /* Compact spacing */
                    .MuiGrid-container {
                        gap: 8px !important;
                    }
                    
                    .MuiCardContent-root {
                        padding: 12px !important;
                    }
                    
                    /* Slightly reduce font sizes */
                    h3 {
                        font-size: 1.3rem !important;
                    }
                    
                    h5 {
                        font-size: 1rem !important;
                    }
                    
                    h6 {
                        font-size: 0.9rem !important;
                    }
                    
                    /* Force colors to print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            ` }} />
        </Box>
    );
}
