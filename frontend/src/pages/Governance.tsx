import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    Card,
    CardContent,
    Stack,
    Chip,
    CircularProgress,
    Alert,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Collapse,
    Tabs,
    Tab,
    Switch,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Modal,
    TextField
} from '@mui/material';
import {
    Psychology,
    TrendingUp,
    Warning,
    History,
    ExpandMore,
    ExpandLess,
    CheckCircle,
    InfoOutlined,
    Rule,
    Gavel,
    ErrorOutline,
    Shield,
    Add,
    SettingsSuggest,
    Equalizer,
    Layers
} from '@mui/icons-material';
import { governanceAPI, complianceAPI } from '../services/api';

interface Outlier {
    risk_id: string;
    statement: string;
    current_score: number;
    why_outlier: string;
    suggested_review: boolean;
}

interface AnalysisResult {
    detected_outliers: Outlier[];
    drift_trends: string[];
    justification_required: string[];
    explanation: string;
}

interface ComplianceFramework {
    framework_id: string;
    framework_name: string;
    enabled: boolean;
}

interface ComplianceStats {
    framework_id: string;
    framework_name: string;
    total_clauses: number;
    mapped_clauses: number;
    high_exposure_count: number;
    coverage_percentage: number;
}

interface ComplianceClause {
    clause_id: string;
    clause_number: string;
    clause_text: string;
    description: string;
    mapped_risks?: any[];
}

export default function Governance() {
    const { user } = useAuth();
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedOutlier, setExpandedOutlier] = useState<string | null>(null);

    // Compliance States
    const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
    const [complianceStats, setComplianceStats] = useState<ComplianceStats[]>([]);
    const [clauses, setClauses] = useState<ComplianceClause[]>([]);
    const [selectedFw, setSelectedFw] = useState<string | null>(null);
    const [fwLoading, setFwLoading] = useState(false);
    const [clausesLoading, setClausesLoading] = useState(false);

    // AI Learning State
    const [learningRecs, setLearningRecs] = useState<any[]>([]);
    const [learningLoading, setLearningLoading] = useState(false);

    // New Regulation State (RESTORED)
    const [isAddFwModalOpen, setIsAddFwModalOpen] = useState(false);
    const [newFwName, setNewFwName] = useState('');
    const [isAddClauseModalOpen, setIsAddClauseModalOpen] = useState(false);
    const [newClause, setNewClause] = useState({ number: '', text: '', description: '' });

    // Risk Appetite & Simulation State
    const [appetiteConfig, setAppetiteConfig] = useState<any>(null);
    const [simulationBaseline, setSimulationBaseline] = useState<any>(null);
    const [simScenario, setSimScenario] = useState('');
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [simLoading, setSimLoading] = useState(false);
    const [calibrating, setCalibrating] = useState(false);

    useEffect(() => {
        if (tab === 1) {
            fetchComplianceData();
        } else if (tab === 2) {
            fetchLearningRecs();
        } else if (tab === 3) {
            fetchAppetiteAndSim();
        }
    }, [tab]);

    const fetchAppetiteAndSim = async () => {
        setSimLoading(true);
        try {
            const [appetiteRes, simRes] = await Promise.all([
                governanceAPI.getRiskAppetite(),
                governanceAPI.getSimulationBaseline()
            ]);
            setAppetiteConfig(appetiteRes.data);
            setSimulationBaseline(simRes.data);
        } catch (err) {
            console.error('Failed to fetch appetite/sim data:', err);
        } finally {
            setSimLoading(false);
        }
    };

    const handleUpdateAppetite = async () => {
        try {
            await governanceAPI.updateRiskAppetite(appetiteConfig);
            setError(null);
            // Show a temporary success alert? 
        } catch (err) {
            console.error('Failed to update appetite:', err);
            setError('Failed to save risk appetite settings.');
        }
    };

    const handleCalibrate = async () => {
        setCalibrating(true);
        try {
            const res = await governanceAPI.calibrateRiskAppetite();
            if (res.data?.suggested_thresholds) {
                setAppetiteConfig({
                    ...appetiteConfig,
                    thresholds: res.data.suggested_thresholds,
                    appetite_type: res.data.recommended_type
                });
                alert(`AI Suggestion: ${res.data.assessment}`);
            }
        } catch (err) {
            console.error('Calibration failed:', err);
            setError('Failed to calibrate risk appetite.');
        } finally {
            setCalibrating(false);
        }
    };

    const handleRunSimulation = async () => {
        if (!simScenario) return;
        setSimLoading(true);
        try {
            const res = await governanceAPI.runSimulation(simScenario);
            setSimulationResult(res.data);
        } catch (err) {
            console.error('Simulation failed:', err);
            setError('Failed to run simulation.');
        } finally {
            setSimLoading(false);
        }
    };

    const fetchLearningRecs = async () => {
        setLearningLoading(true);
        try {
            const res = await governanceAPI.getLearningRecommendations();
            setLearningRecs(res.data.data);
        } catch (err) {
            console.error('Failed to fetch learning recommendations:', err);
        } finally {
            setLearningLoading(false);
        }
    };

    const fetchComplianceData = async () => {
        setFwLoading(true);
        try {
            const [fwRes, statsRes] = await Promise.all([
                complianceAPI.getFrameworks(),
                complianceAPI.getDashboard()
            ]);
            setFrameworks(fwRes.data);
            setComplianceStats(statsRes.data);
        } catch (err) {
            console.error('Failed to fetch compliance data:', err);
        } finally {
            setFwLoading(false);
        }
    };

    const handleToggleFramework = async (id: string, currentStatus: boolean) => {
        try {
            await complianceAPI.toggleFramework(id, !currentStatus);
            fetchComplianceData();
            if (selectedFw === id) setSelectedFw(null);
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    const handleViewClauses = async (fwId: string) => {
        setSelectedFw(fwId);
        setClausesLoading(true);
        try {
            const res = await complianceAPI.getClauses(fwId);
            setClauses(res.data);
        } catch (err) {
            console.error('Failed to fetch clauses:', err);
        } finally {
            setClausesLoading(false);
        }
    };

    const handleCreateFramework = async () => {
        if (!newFwName) return;
        try {
            await complianceAPI.createFramework(newFwName);
            setNewFwName('');
            setIsAddFwModalOpen(false);
            fetchComplianceData();
        } catch (err) {
            console.error('Failed to create framework:', err);
        }
    };

    const handleAddClause = async () => {
        if (!selectedFw || !newClause.number || !newClause.text) return;
        try {
            await complianceAPI.addClause(selectedFw, {
                clause_number: newClause.number,
                clause_text: newClause.text,
                description: newClause.description
            });
            setNewClause({ number: '', text: '', description: '' });
            setIsAddClauseModalOpen(false);
            handleViewClauses(selectedFw);
        } catch (err) {
            console.error('Failed to add clause:', err);
        }
    };

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await governanceAPI.analyzeDrift();
            setResult(response.data);
        } catch (err) {
            console.error('Analysis failed:', err);
            setError('Failed to run AI analysis. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const toggleOutlier = (id: string) => {
        setExpandedOutlier(expandedOutlier === id ? null : id);
    };

    return (
        <Box>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    SWOT Governance
                </Typography>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {(user?.role === 'admin' || user?.role === 'risk_manager' || user?.role === 'auditor') && (
                        <Tab label="AI Scoring Analysis" icon={<Psychology />} iconPosition="start" />
                    )}
                    {(user?.role === 'admin' || user?.role === 'risk_manager' || user?.role === 'auditor') && (
                        <Tab label="Compliance Frameworks" icon={<Rule />} iconPosition="start" />
                    )}
                    {(user?.role === 'admin' || user?.role === 'risk_manager') && (
                        <Tab label="AI Learning Insights" icon={<TrendingUp />} iconPosition="start" />
                    )}
                    {(user?.role === 'admin' || user?.role === 'viewer') && (
                        <Tab label="Risk Appetite & Simulation" icon={<Layers />} iconPosition="start" />
                    )}
                </Tabs>
            </Box>

            {tab === 0 && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                Risk Scoring Integrity
                            </Typography>
                            <Typography color="text.secondary">
                                Monitor consistency and detect unusual patterns using AI.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Psychology />}
                            onClick={runAnalysis}
                            disabled={loading}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                px: 4,
                                py: 1.5,
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                            }}
                        >
                            {loading ? 'Analyzing Portfolio...' : 'Start AI Analysis'}
                        </Button>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {!result && !loading && !error && (
                        <Paper
                            sx={{
                                p: 8,
                                textAlign: 'center',
                                borderRadius: 4,
                                bgcolor: 'background.paper',
                                border: '1px dashed',
                                borderColor: 'divider',
                            }}
                            elevation={0}
                        >
                            <Psychology sx={{ fontSize: 80, color: 'primary.main', mb: 2, opacity: 0.5 }} />
                            <Typography variant="h5" gutterBottom fontWeight="bold">
                                Ready for Insights?
                            </Typography>
                            <Typography color="text.secondary" maxWidth={600} mx="auto" mb={4}>
                                Our AI engine will analyze your entire risk register to find scoring inconsistencies,
                                industry outliers, and potential bias in your assessments.
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={runAnalysis}
                                sx={{ borderRadius: 2, px: 4 }}
                            >
                                Run First Scan
                            </Button>
                        </Paper>
                    )}

                    {loading && (
                        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4 }} elevation={0}>
                            <CircularProgress size={60} sx={{ mb: 3 }} />
                            <Typography variant="h6" gutterBottom>AI Deep Scan in Progress</Typography>
                            <Typography color="text.secondary">Comparing risks, analyzing categories, and checking benchmarks...</Typography>
                        </Paper>
                    )}

                    {result && (
                        <Grid container spacing={4}>
                            <Grid item xs={12}>
                                <Paper sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid', borderLeftColor: 'primary.main' }}>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                                        <CheckCircle color="success" /> Assessment Summary
                                    </Typography>
                                    <Typography variant="body1">
                                        {result.explanation}
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={7}>
                                <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                                    <Warning color="warning" /> Unusual Patterns (Outliers)
                                </Typography>
                                <Stack spacing={2}>
                                    {result.detected_outliers?.length === 0 ? (
                                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                            <Typography color="text.secondary">No material outliers detected.</Typography>
                                        </Paper>
                                    ) : (
                                        result.detected_outliers?.map((outlier) => (
                                            <Card key={outlier.risk_id} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                                <CardContent sx={{ p: '16px !important' }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                        <Box>
                                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                                {outlier.statement}
                                                            </Typography>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <Chip label={`Score: ${outlier.current_score}`} size="small" color="primary" variant="outlined" />
                                                                {outlier.suggested_review && <Chip label="Review Recommended" size="small" color="warning" />}
                                                            </Stack>
                                                        </Box>
                                                        <IconButton onClick={() => toggleOutlier(outlier.risk_id)}>
                                                            {expandedOutlier === outlier.risk_id ? <ExpandLess /> : <ExpandMore />}
                                                        </IconButton>
                                                    </Box>
                                                    <Collapse in={expandedOutlier === outlier.risk_id}>
                                                        <Box mt={2} p={2} bgcolor="action.hover" borderRadius={2}>
                                                            <Typography variant="body2" color="text.secondary" fontWeight="bold" gutterBottom>AI Reasoning:</Typography>
                                                            <Typography variant="body2">{outlier.why_outlier}</Typography>
                                                        </Box>
                                                    </Collapse>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </Stack>
                            </Grid>

                            <Grid item xs={12} md={5}>
                                <Stack spacing={4}>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                                            <TrendingUp color="primary" /> Drift Trends
                                        </Typography>
                                        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                            <List disablePadding>
                                                {result.drift_trends?.map((trend, idx) => (
                                                    <ListItem key={idx} divider={idx !== (result.drift_trends?.length || 0) - 1}>
                                                        <ListItemIcon><InfoOutlined color="info" /></ListItemIcon>
                                                        <ListItemText primary={trend} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                                            <History color="secondary" /> Actions Needed
                                        </Typography>
                                        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                            <List disablePadding>
                                                {result.justification_required?.map((req, idx) => (
                                                    <ListItem key={idx} divider={idx !== (result.justification_required?.length || 0) - 1}>
                                                        <ListItemIcon><Warning color="secondary" sx={{ fontSize: 20 }} /></ListItemIcon>
                                                        <ListItemText primary={req} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Box>
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}

            {tab === 1 && (
                <Box>
                    <Grid container spacing={3}>
                        {/* Framework Management */}
                        <Grid item xs={12} md={4}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                                    <Gavel /> Framework Library
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={() => setIsAddFwModalOpen(true)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Add Framework
                                </Button>
                            </Box>
                            <Paper sx={{ borderRadius: 3, p: 2 }}>
                                {fwLoading && <CircularProgress size={24} sx={{ display: 'block', m: 'auto' }} />}
                                <List>
                                    {frameworks.map((fw) => (
                                        <ListItem
                                            key={fw.framework_id}
                                            secondaryAction={
                                                <Switch
                                                    edge="end"
                                                    checked={fw.enabled}
                                                    onChange={() => handleToggleFramework(fw.framework_id, fw.enabled)}
                                                />
                                            }
                                        >
                                            <ListItemText
                                                primary={fw.framework_name}
                                                secondary={fw.enabled ? 'Active Monitoring' : 'Disabled'}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Grid>

                        {/* Exposure Dashboard */}
                        <Grid item xs={12} md={8}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                                <Shield /> Compliance Exposure
                            </Typography>
                            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Framework</TableCell>
                                            <TableCell>Coverage</TableCell>
                                            <TableCell>Exposure Level</TableCell>
                                            <TableCell>Impact Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {complianceStats.map((stat) => (
                                            <TableRow
                                                key={stat.framework_id}
                                                hover
                                                selected={selectedFw === stat.framework_id}
                                                onClick={() => handleViewClauses(stat.framework_id)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell sx={{ fontWeight: 600 }}>{stat.framework_name}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={stat.coverage_percentage}
                                                                sx={{ height: 8, borderRadius: 5 }}
                                                            />
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {Math.round(stat.coverage_percentage)}%
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={stat.high_exposure_count > 0 ? `${stat.high_exposure_count} High Risk` : 'Optimal'}
                                                        color={stat.high_exposure_count > 0 ? 'error' : 'success'}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title={stat.high_exposure_count > 0 ? "Critical clauses are being impacted by active risks. Fines/Sanctions potential." : "All audited controls functioning."}>
                                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                                            {stat.high_exposure_count > 0 ? <ErrorOutline color="error" /> : <CheckCircle color="success" />}
                                                            <Typography variant="caption" color={stat.high_exposure_count > 0 ? 'error' : 'success'} fontWeight="bold">
                                                                {stat.high_exposure_count > 0 ? 'FAILING' : 'COMPLIANT'}
                                                            </Typography>
                                                        </Stack>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {complianceStats.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">Enable frameworks to start monitoring compliance risk.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Detailed Clause View */}
                            {selectedFw && (
                                <Box mt={4}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6" fontWeight="bold">
                                            Clauses: {complianceStats.find(s => s.framework_id === selectedFw)?.framework_name || frameworks.find(f => f.framework_id === selectedFw)?.framework_name}
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Add />}
                                            onClick={() => setIsAddClauseModalOpen(true)}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Add Clause
                                        </Button>
                                    </Box>
                                    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                        {clausesLoading ? (
                                            <Box p={4} textAlign="center"><CircularProgress /></Box>
                                        ) : (
                                            <List disablePadding>
                                                {clauses.map((clause, idx) => (
                                                    <ListItem
                                                        key={clause.clause_id}
                                                        divider={idx !== clauses.length - 1}
                                                        sx={{ flexDirection: 'column', alignItems: 'stretch', py: 2 }}
                                                    >
                                                        <Box display="flex" justifyContent="space-between" width="100%">
                                                            <Box>
                                                                <Typography variant="subtitle2" color="primary" fontWeight="bold">
                                                                    {clause.clause_number}: {clause.clause_text}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {clause.description}
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                label="Control Active"
                                                                size="small"
                                                                variant="outlined"
                                                                color="success"
                                                                icon={<Shield sx={{ fontSize: 16 }} />}
                                                            />
                                                        </Box>

                                                        {/* Mapped Risks placeholder - In a real app we'd fetch these */}
                                                        <Box mt={2} p={1.5} bgcolor="grey.50" borderRadius={2} border="1px solid" borderColor="divider">
                                                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
                                                                IMPACTING RISKS
                                                            </Typography>
                                                            <Stack direction="row" spacing={1}>
                                                                {idx === 0 ? (
                                                                    <>
                                                                        <Chip label="Data Breach" size="small" color="error" variant="outlined" />
                                                                        <Chip label="Unauthorized Access" size="small" color="warning" variant="outlined" />
                                                                    </>
                                                                ) : (
                                                                    <Typography variant="caption" color="text.secondary">No direct risk mappings for this clause.</Typography>
                                                                )}
                                                            </Stack>
                                                        </Box>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                    </Paper>
                                </Box>
                            )}

                            <Box mt={3}>
                                <Alert severity="info" icon={<History />} sx={{ borderRadius: 3 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">Compliance Impact Insight (AI):</Typography>
                                    <Typography variant="body2">
                                        Current exposures in {complianceStats.find(s => s.high_exposure_count > 0)?.framework_name || 'your portfolio'}
                                        could lead to significant regulatory scrutiny. Impact includes potential temporary license suspension
                                        and mandatory third-party audits.
                                    </Typography>
                                </Alert>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {tab === 2 && (
                <Box>
                    <Box mb={4}>
                        <Typography variant="h5" fontWeight="bold">Intelligent Risk Feedback Loop</Typography>
                        <Typography color="text.secondary">AI analysis of incident data suggesting updates to your risk landscape.</Typography>
                    </Box>

                    {learningLoading ? (
                        <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>
                    ) : (
                        <Grid container spacing={4}>
                            {learningRecs.length === 0 ? (
                                <Grid item xs={12}>
                                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                        <Typography color="text.secondary">No new learning recommendations. Your SWOT risk assessments match current incident patterns.</Typography>
                                    </Paper>
                                </Grid>
                            ) : (
                                learningRecs.map((rec: any, idx: number) => (
                                    <Grid item xs={12} md={6} key={idx}>
                                        <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" mb={2}>
                                                    <Chip
                                                        label={rec.type.replace('_', ' ')}
                                                        color={rec.type === 'RISK_SCORE' ? 'primary' : 'secondary'}
                                                        size="small"
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {Math.round(rec.confidence * 100)}% Confidence
                                                    </Typography>
                                                </Box>
                                                <Typography variant="h6" fontWeight="bold" gutterBottom>{rec.item_name}</Typography>
                                                <Typography variant="body2" color="text.secondary" paragraph>{rec.reason}</Typography>

                                                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                                    <Box textAlign="center">
                                                        <Typography variant="caption" display="block">CURRENT</Typography>
                                                        <Typography variant="body1" fontWeight="bold">{rec.current_value}</Typography>
                                                    </Box>
                                                    <TrendingUp color="disabled" />
                                                    <Box textAlign="center">
                                                        <Typography variant="caption" display="block" color="primary">SUGGESTED</Typography>
                                                        <Typography variant="body1" fontWeight="bold" color="primary">{rec.suggested_value}</Typography>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))
                            )}
                        </Grid>
                    )}
                </Box>
            )}

            {tab === 3 && (
                <Box>
                    <Grid container spacing={4}>
                        {/* Risk Appetite Configuration */}
                        <Grid item xs={12} md={5}>
                            <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                                    <SettingsSuggest color="primary" /> Risk Appetite Framework
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={3}>
                                    Define the scoring thresholds that determine your organization's risk tolerance.
                                </Typography>

                                {appetiteConfig && (
                                    <Stack spacing={4}>
                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>Appetite Strategy</Typography>
                                            <Stack direction="row" spacing={1}>
                                                {['Conservative', 'Balanced', 'Aggressive'].map((type) => (
                                                    <Chip
                                                        key={type}
                                                        label={type}
                                                        onClick={() => setAppetiteConfig({ ...appetiteConfig, appetite_type: type })}
                                                        color={appetiteConfig.appetite_type === type ? 'primary' : 'default'}
                                                        variant={appetiteConfig.appetite_type === type ? 'filled' : 'outlined'}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" display="flex" justifyContent="space-between">
                                                Critical Threshold <span>{appetiteConfig.thresholds?.critical || 0}</span>
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={appetiteConfig.thresholds?.critical || 0}
                                                sx={{ height: 8, borderRadius: 5, my: 1, bgcolor: 'error.light' }}
                                            />
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={appetiteConfig.thresholds?.critical || 0}
                                                onChange={(e) => setAppetiteConfig({
                                                    ...appetiteConfig,
                                                    thresholds: { ...appetiteConfig.thresholds, critical: Number(e.target.value) }
                                                })}
                                            />
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" display="flex" justifyContent="space-between">
                                                High Threshold <span>{appetiteConfig.thresholds?.high || 0}</span>
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={appetiteConfig.thresholds?.high || 0}
                                                sx={{ height: 8, borderRadius: 5, my: 1, bgcolor: 'warning.light' }}
                                            />
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={appetiteConfig.thresholds?.high || 0}
                                                onChange={(e) => setAppetiteConfig({
                                                    ...appetiteConfig,
                                                    thresholds: { ...appetiteConfig.thresholds, high: Number(e.target.value) }
                                                })}
                                            />
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" display="flex" justifyContent="space-between">
                                                Medium Threshold <span>{appetiteConfig.thresholds?.medium || 0}</span>
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={appetiteConfig.thresholds?.medium || 0}
                                                sx={{ height: 8, borderRadius: 5, my: 1, bgcolor: 'info.light' }}
                                            />
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={appetiteConfig.thresholds?.medium || 0}
                                                onChange={(e) => setAppetiteConfig({
                                                    ...appetiteConfig,
                                                    thresholds: { ...appetiteConfig.thresholds, medium: Number(e.target.value) }
                                                })}
                                            />
                                        </Box>

                                        <Box display="flex" gap={2}>
                                            <Button
                                                variant="contained"
                                                onClick={handleUpdateAppetite}
                                                fullWidth
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Save Config
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={handleCalibrate}
                                                disabled={calibrating}
                                                startIcon={calibrating ? <CircularProgress size={20} /> : <Psychology />}
                                                sx={{ borderRadius: 2, minWidth: 160 }}
                                            >
                                                {calibrating ? 'Calibrating...' : 'AI Calibrate'}
                                            </Button>
                                        </Box>
                                    </Stack>
                                )}
                            </Paper>
                        </Grid>

                        {/* Decision Simulation */}
                        <Grid item xs={12} md={7}>
                            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(51, 65, 85, 0.6)' : 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                                    <Psychology color="secondary" /> Strategic Decision Simulation
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={4}>
                                    Simulate the impact of resource allocation and threat landscape changes on your portfolio's residual risk.
                                </Typography>

                                {simLoading ? <Box textAlign="center" p={4}><CircularProgress /><Typography mt={2}>Simulating outcomes...</Typography></Box> : (
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <Card sx={{ mb: 3, p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Box>
                                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>CURRENT PORTFOLIO BASELINE</Typography>
                                                        <Typography variant="h4" fontWeight="bold">
                                                            {simulationBaseline ? Math.round(simulationBaseline.avg_inherent_score) : '--'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Avg. Risk Score</Typography>
                                                    </Box>
                                                    <Equalizer sx={{ fontSize: 40, opacity: 0.5 }} />
                                                </Stack>
                                            </Card>

                                            <Box display="flex" gap={2} mb={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Decision Scenario"
                                                    placeholder="E.g. We are expanding into the APAC region next quarter."
                                                    value={simScenario}
                                                    onChange={(e) => setSimScenario(e.target.value)}
                                                    multiline
                                                />
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    onClick={handleRunSimulation}
                                                    disabled={!simScenario}
                                                    sx={{ minWidth: 120, borderRadius: 2 }}
                                                >
                                                    Simulate
                                                </Button>
                                            </Box>
                                        </Grid>

                                        {simulationResult ? (
                                            <>
                                                <Grid item xs={12}>
                                                    <Alert severity={simulationResult.overall_risk_change === 'INCREASE' ? 'warning' : 'success'} icon={<TrendingUp />}>
                                                        <Typography fontWeight="bold">Executive Summary</Typography>
                                                        {simulationResult.executive_summary}
                                                    </Alert>
                                                </Grid>

                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Impacted Risks</Typography>
                                                    {simulationResult.impacted_risks.length === 0 ? (
                                                        <Typography color="text.secondary">No existing risks significantly impacted.</Typography>
                                                    ) : (
                                                        <Stack spacing={1}>
                                                            {simulationResult.impacted_risks.map((r: any, i: number) => (
                                                                <Card key={i} variant="outlined" sx={{ p: 1.5 }}>
                                                                    <Box display="flex" justifyContent="space-between">
                                                                        <Typography variant="body2" fontWeight="bold">{r.risk_code}</Typography>
                                                                        <Chip
                                                                            label={`${r.current_score} → ${r.predicted_score}`}
                                                                            size="small"
                                                                            color={r.predicted_score > r.current_score ? 'error' : 'success'}
                                                                        />
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary">{r.title}</Typography>
                                                                </Card>
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Grid>

                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Emerging Risks</Typography>
                                                    {simulationResult.new_risks_emerging.length === 0 ? (
                                                        <Typography color="text.secondary">No new risks predicted.</Typography>
                                                    ) : (
                                                        <Stack spacing={1}>
                                                            {simulationResult.new_risks_emerging.map((r: any, i: number) => (
                                                                <Card key={i} variant="outlined" sx={{ p: 1.5, borderColor: 'warning.light', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                                                                    <Typography variant="body2" fontWeight="bold">NEW: {r.title}</Typography>
                                                                    <Typography variant="caption">{r.description}</Typography>
                                                                </Card>
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Grid>
                                            </>
                                        ) : (
                                            <Grid item xs={12} textAlign="center" py={4}>
                                                <Psychology sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                                <Typography color="text.secondary">
                                                    Enter a strategic decision to seeing its impact on your risk profile.
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Add Framework Modal */}
            <Modal open={isAddFwModalOpen} onClose={() => setIsAddFwModalOpen(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 400, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 24, p: 4
                }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Log New Regulation</Typography>
                    <TextField
                        fullWidth
                        label="Regulation Name"
                        placeholder="e.g. DORA / HIPAA"
                        value={newFwName}
                        onChange={(e) => setNewFwName(e.target.value)}
                        sx={{ mb: 3 }}
                    />
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                        <Button onClick={() => setIsAddFwModalOpen(false)}>Cancel</Button>
                        <Button variant="contained" onClick={handleCreateFramework} disabled={!newFwName}>Create</Button>
                    </Box>
                </Box>
            </Modal>

            {/* Add Clause Modal */}
            <Modal open={isAddClauseModalOpen} onClose={() => setIsAddClauseModalOpen(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 500, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 24, p: 4
                }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Add Clause to Regulation</Typography>
                    <Stack spacing={2}>
                        <TextField
                            label="Clause Number"
                            placeholder="e.g. A.5.1"
                            value={newClause.number}
                            onChange={(e) => setNewClause({ ...newClause, number: e.target.value })}
                        />
                        <TextField
                            label="Clause Title"
                            placeholder="e.g. Information Security Policy"
                            value={newClause.text}
                            onChange={(e) => setNewClause({ ...newClause, text: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            value={newClause.description}
                            onChange={(e) => setNewClause({ ...newClause, description: e.target.value })}
                        />
                    </Stack>
                    <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                        <Button onClick={() => setIsAddClauseModalOpen(false)}>Cancel</Button>
                        <Button variant="contained" onClick={handleAddClause} disabled={!newClause.number || !newClause.text}>Add Clause</Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
}
