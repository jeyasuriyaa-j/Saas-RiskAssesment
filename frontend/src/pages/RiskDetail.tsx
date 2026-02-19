import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Divider,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    CardContent,
    Fade,
    Stack,
    alpha
} from '@mui/material';
import { riskAPI, aiAPI, controlsAPI, remediationAPI, usersAPI } from '../services/api';
import { Psychology, Refresh, AutoAwesome, Warning, Info, TrendingUp, CheckCircle, Save, ArrowBack, History as HistoryIcon, CompareArrows, Add, HealthAndSafety, Shield, Assessment, Bolt } from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import AssignedTasksSection from '../components/AssignedTasksSection';

interface RiskDetailProps {
    riskId?: string;
    onClose?: () => void;
}

export default function RiskDetail({ riskId: propRiskId, onClose }: RiskDetailProps = {}) {
    const { riskId: paramRiskId } = useParams<{ riskId: string }>();
    const riskId = propRiskId || paramRiskId;
    const isDrawer = !!propRiskId;
    const navigate = useNavigate();
    const { config, user } = useAuth();
    const aiFeatures = config?.ai_features || {};

    const [risk, setRisk] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // AI state
    const [aiImproving, setAiImproving] = useState(false);
    const [aiScoring, setAiScoring] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);
    const [scoreSuggestion, setScoreSuggestion] = useState<any>(null); // New state for score review
    const [deepAnalysis, setDeepAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Controls & Remediation State
    const [availableControls, setAvailableControls] = useState<any[]>([]);
    const [openControlDialog, setOpenControlDialog] = useState(false);
    const [selectedControlId, setSelectedControlId] = useState('');
    const [mitigationStrength, setMitigationStrength] = useState('MODERATE');

    // AI Remediation
    const [aiRemediationLoading, setAiRemediationLoading] = useState(false);
    const [remediationPlans, setRemediationPlans] = useState<any[]>([]);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Task Assignment State
    const [openAssignDialog, setOpenAssignDialog] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignForm, setAssignForm] = useState({
        assignee_user_id: '',
        action_title: '',
        description: '',
        due_date: '',
        priority: 'MEDIUM'
    });

    useEffect(() => {
        if (riskId === 'new') {
            setRisk({
                statement: '',
                description: '',
                status: 'identified',
                likelihood_score: null,
                impact_score: null,
                owner_name: 'Me', // Fallback for UI
                department: '',
                priority: 'medium',
                created_at: new Date().toISOString()
            });
            setIsEditing(true);
            setLoading(false);
        } else if (riskId) {
            fetchRisk();
        }
    }, [riskId]);

    const fetchRisk = async () => {
        setLoading(true);
        try {
            const response = await riskAPI.get(riskId!);
            const riskData = response.data;
            setRisk(riskData);
            setRemediationPlans(riskData.remediation_plans || []);
            setDeepAnalysis(riskData.analysis);
            setError('');

            // Automatically trigger analysis if missing and not a 'new' risk
            if (!riskData.analysis && riskId !== 'new') {
                handleRunAnalysis(false);
            }
        } catch (err) {
            setError('Failed to fetch risk details');
        } finally {
            setLoading(false);
        }
    };

    const handleRunAnalysis = async (force: boolean = false) => {
        if (!riskId || riskId === 'new') return;

        setAnalyzing(true);
        console.log(`Triggering AI Analysis for ${riskId} (Force: ${force})`);

        try {
            const response = await riskAPI.analyze(riskId, force);
            setDeepAnalysis(response.data.analysis);
            // Optionally update the risk object locally to include analysis
            setRisk((prev: any) => prev ? { ...prev, analysis: response.data.analysis } : null);
        } catch (err: any) {
            console.error('AI Analysis Error:', err);
            // Don't show a blocking error banner - the UI shows 'Analysis unavailable' info message instead
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        try {
            if (riskId === 'new') {
                const response = await riskAPI.create(risk);
                navigate(`/risks/${response.data.risk.risk_id}`);
            } else {
                await riskAPI.update(riskId!, risk);
                setIsEditing(false);
                fetchRisk();
            }
        } catch (err) {
            setError('Failed to save risk');
        }
    };

    const handleDelete = async (permanent: boolean = false) => {
        if (!riskId || riskId === 'new') return;
        setDeleteLoading(true);
        try {
            await riskAPI.delete(riskId, permanent);
            setOpenDeleteDialog(false);
            if (onClose) {
                onClose();
            } else {
                navigate('/risks');
            }
        } catch (err) {
            setError('Failed to delete risk');
        } finally {
            setDeleteLoading(false);
        }
    };

    const pollForSuggestion = async (rId: string, reqId: string, type: 'improvement' | 'score') => {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                setError('AI timeout');
                if (type === 'improvement') setAiImproving(false);
                else setAiScoring(false);
                return;
            }

            try {
                const response = type === 'improvement'
                    ? await riskAPI.getImprovementSuggestion(rId, reqId)
                    : await riskAPI.getScoreSuggestion(rId, reqId);

                if (response.data.status === 'COMPLETED' || (type === 'score' && response.data.suggestion)) {
                    clearInterval(interval);
                    if (type === 'improvement') {
                        setAiSuggestion({ ...response.data.suggestion, request_id: reqId });
                        setAiImproving(false);
                    } else {
                        setScoreSuggestion({ ...response.data.suggestion, request_id: reqId });
                        setAiScoring(false);
                    }
                } else if (response.data.status === 'FAILED') {
                    clearInterval(interval);
                    setError('AI processing failed');
                    if (type === 'improvement') setAiImproving(false);
                    else setAiScoring(false);
                }
            } catch (e) {
                // ignore transient errors
            }
        }, 1000);
    };

    const handleImproveWithAI = async () => {
        setAiImproving(true);
        try {
            // For new risks, use transient API
            if (riskId === 'new') {
                const response = await aiAPI.improveDescription(risk.description || risk.statement);
                setAiSuggestion(response.data);
                setAiImproving(false);
                return;
            }

            // For existing, use persistent API
            const response = await riskAPI.suggestImprovement(riskId!, {
                prompt_id: 'risk_rewrite_v1',
                raw_statement: risk.statement
            });
            pollForSuggestion(riskId!, response.data.request_id, 'improvement');
        } catch (err) {
            setError('AI improvement failed');
            setAiImproving(false);
        }
    };

    const handleApplyAISuggestion = async () => {
        if (!aiSuggestion) return;

        // Log acceptance if persistent
        if (aiSuggestion.request_id && riskId !== 'new') {
            try {
                await riskAPI.updateSuggestionStatus(riskId!, aiSuggestion.request_id, 'ACCEPTED');
            } catch (e) { console.error('Failed to log acceptance'); }
        }

        setRisk({
            ...risk,
            statement: aiSuggestion.improved_risk,
            description: `Cause: ${aiSuggestion.cause}\nEvent: ${aiSuggestion.event}\nImpact: ${aiSuggestion.impact}`
        });
        setAiSuggestion(null);
        setIsEditing(true);
    };

    const handleDismissAISuggestion = async () => {
        if (!aiSuggestion) return;
        if (aiSuggestion.request_id && riskId !== 'new') {
            try {
                await riskAPI.updateSuggestionStatus(riskId!, aiSuggestion.request_id, 'REJECTED');
            } catch (e) { console.error('Failed to log rejection'); }
        }
        setAiSuggestion(null);
    };

    const handleSuggestScores = async () => {
        setAiScoring(true);
        try {
            if (riskId === 'new') {
                const response = await aiAPI.suggestScore({
                    risk_statement: risk.statement,
                    risk_description: risk.description
                });
                setScoreSuggestion(response.data); // Show review first
                setAiScoring(false);
                return;
            }

            const response = await riskAPI.suggestScore(riskId!, {
                prompt_id: 'risk_scoring_v1',
                use_industry_benchmarks: true
            });
            pollForSuggestion(riskId!, response.data.request_id, 'score');
        } catch (err) {
            setError('AI scoring failed');
            setAiScoring(false);
        }
    };

    const handleApplyScoreSuggestion = async () => {
        if (!scoreSuggestion) return;

        if (scoreSuggestion.request_id && riskId !== 'new') {
            try {
                await riskAPI.updateSuggestionStatus(riskId!, scoreSuggestion.request_id, 'ACCEPTED');
            } catch (e) { console.error('Failed to log acceptance'); }
        }

        setRisk({
            ...risk,
            likelihood_score: scoreSuggestion.suggested_likelihood,
            impact_score: scoreSuggestion.suggested_impact
        });
        setScoreSuggestion(null);
        setIsEditing(true);
    };

    const handleDismissScoreSuggestion = async () => {
        if (scoreSuggestion && scoreSuggestion.request_id && riskId !== 'new') {
            try {
                await riskAPI.updateSuggestionStatus(riskId!, scoreSuggestion.request_id, 'REJECTED');
            } catch (e) { console.error('Failed to log rejection'); }
        }
        setScoreSuggestion(null);
    };

    // --- Controls Logic ---
    const handleOpenControlDialog = async () => {
        try {
            const response = await controlsAPI.list();
            setAvailableControls(response.data.controls);
            setOpenControlDialog(true);
        } catch (err) {
            setError('Failed to load control library');
        }
    };

    const handleAssignControl = async () => {
        if (!selectedControlId) return;
        try {
            await controlsAPI.assign(risk.risk_id, {
                control_id: selectedControlId,
                mitigation_strength: mitigationStrength
            });
            setOpenControlDialog(false);
            fetchRisk(); // Refresh to see new mapping
        } catch (err) {
            setError('Failed to assign control');
        }
    };

    // --- Remediation Logic ---
    const handleSuggestRemediation = async () => {
        setAiRemediationLoading(true);
        try {
            const response = await remediationAPI.suggest(risk.risk_id);
            // AI returns an array of suggestions. We can show them to user to accept.
            // For simplicity in this sprint, we'll just alert or log them, 
            // ideally we should have a dialog to preview and add them.
            // Let's auto-add them as 'OPEN' plans for now or show in a temporary list.

            // Assuming response.data is array of plans
            const suggestions = response.data;
            if (suggestions && suggestions.length > 0) {
                // Create them in backend
                for (const plan of suggestions) {
                    await remediationAPI.create({
                        risk_id: risk.risk_id,
                        action_title: plan.action_title,
                        description: plan.description,
                        due_date: plan.suggested_due_date_days ? new Date(Date.now() + plan.suggested_due_date_days * 86400000) : null,
                        ai_suggested: true
                    });
                }
                fetchRisk();
            }
        } catch (err) {
            setError('AI remediation suggestion failed');
        } finally {
            setAiRemediationLoading(false);
        }
    };

    // Task Assignment Handlers
    const handleOpenAssignDialog = async () => {
        try {
            // Load users - fetch all assignable users regardless of department
            const response = await usersAPI.assignable();
            setAssignableUsers(response.data);
            setOpenAssignDialog(true);
        } catch (err) {
            setError('Failed to load assignable users');
        }
    };

    const handleAssignTask = async () => {
        if (!assignForm.assignee_user_id || !assignForm.action_title) {
            setError('Please select an assignee and enter a task title');
            return;
        }

        setAssignLoading(true);
        try {
            await remediationAPI.assign({
                risk_id: risk.risk_id,
                assignee_user_id: assignForm.assignee_user_id,
                action_title: assignForm.action_title,
                description: assignForm.description,
                due_date: assignForm.due_date || null,
                priority: assignForm.priority
            });

            setOpenAssignDialog(false);
            setAssignForm({
                assignee_user_id: '',
                action_title: '',
                description: '',
                due_date: '',
                priority: 'MEDIUM'
            });
            fetchRisk(); // Refresh to see new task
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to assign task');
        } finally {
            setAssignLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        const s = status?.toLowerCase();
        const configs: Record<string, { color: any; icon: any; label: string }> = {
            draft: { color: 'default', icon: <Info fontSize="small" />, label: 'Draft' },
            active: { color: 'info', icon: <TrendingUp fontSize="small" />, label: 'Active' },
            identified: { color: 'info', icon: <Info fontSize="small" />, label: 'Identified' },
            assessed: { color: 'primary', icon: <TrendingUp fontSize="small" />, label: 'Assessed' },
            mitigated: { color: 'success', icon: <CheckCircle fontSize="small" />, label: 'Mitigated' },
            accepted: { color: 'warning', icon: <Warning fontSize="small" />, label: 'Accepted' },
            closed: { color: 'default', icon: <CheckCircle fontSize="small" />, label: 'Closed' },
        };
        return configs[s] || { color: 'default', icon: <Info fontSize="small" />, label: status || 'Unknown' };
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!risk) return <Alert severity="error">Risk not found</Alert>;

    const statusConfig = getStatusConfig(risk.status);

    return (
        <Box sx={{ p: isDrawer ? 3 : 0, color: isDrawer ? '#fff' : 'inherit' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isDrawer ? (
                    <Button startIcon={<ArrowBack />} onClick={onClose}>
                        Close
                    </Button>
                ) : (
                    <Button startIcon={<ArrowBack />} onClick={() => navigate('/risks')}>
                        {riskId === 'new' ? 'Discard & Return' : 'Back to Register'}
                    </Button>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isEditing && riskId !== 'new' && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setOpenDeleteDialog(true)}
                            disabled={user?.role === 'viewer' || user?.role === 'auditor'}
                        >
                            Delete Risk
                        </Button>
                    )}
                    {!isEditing ? (
                        <Button variant="contained" onClick={() => setIsEditing(true)}>Edit Risk</Button>
                    ) : (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button variant="contained" startIcon={<Save />} onClick={handleSave}>Save Changes</Button>
                        </Box>
                    )}
                </Box>
            </Box>

            <Typography variant="h4" fontWeight="800" gutterBottom sx={{
                background: isDrawer ? 'linear-gradient(45deg, #fff 30%, #a5b4fc 90%)' : 'none',
                WebkitBackgroundClip: isDrawer ? 'text' : 'none',
                WebkitTextFillColor: isDrawer ? 'transparent' : 'inherit',
            }}>
                {riskId === 'new' ? 'Add New Risk' : 'Risk Details'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                    <Tab label="Details" />
                    <Tab label="Controls & Remediation" disabled={riskId === 'new'} />
                    <Tab label="History" disabled={riskId === 'new'} />
                </Tabs>
            </Box>

            {/* TAB 0: DETAILS */}
            {activeTab === 0 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Paper sx={{
                            p: 3, mb: 3,
                            bgcolor: isDrawer ? alpha('#fff', 0.03) : 'background.paper',
                            border: isDrawer ? `1px solid ${alpha('#fff', 0.05)}` : 'none',
                            borderRadius: '16px',
                            color: 'inherit'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                                {riskId !== 'new' ? (
                                    <Typography variant="overline" color="text.secondary">
                                        {risk.risk_code} • {risk.created_at ? `Created ${format(new Date(risk.created_at), 'PPP')}` : ''}
                                    </Typography>
                                ) : <Box />} {/* Spacer for new risk */}

                                {isEditing ? (
                                    <TextField
                                        select
                                        size="small"
                                        label="Status"
                                        value={risk.status || 'DRAFT'}
                                        onChange={(e) => setRisk({ ...risk, status: e.target.value })}
                                        sx={{ minWidth: 150 }}
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="IDENTIFIED">Identified</option>
                                        <option value="ASSESSED">Assessed</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="MITIGATED">Mitigated</option>
                                        <option value="ACCEPTED">Accepted</option>
                                        <option value="CLOSED">Closed</option>
                                    </TextField>
                                ) : (
                                    <Chip
                                        icon={statusConfig.icon}
                                        label={statusConfig.label}
                                        color={statusConfig.color}
                                        size="small"
                                    />
                                )}
                            </Box>

                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    label="Risk Statement"
                                    value={risk.statement || ''}
                                    onChange={(e) => setRisk({ ...risk, statement: e.target.value })}
                                    sx={{ mb: 3 }}
                                />
                            ) : (
                                <Typography variant="h5" gutterBottom>{risk.statement}</Typography>
                            )}

                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    label="Description"
                                    value={risk.description || ''}
                                    onChange={(e) => setRisk({ ...risk, description: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                            ) : (
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                                    {risk.description || 'No description provided.'}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {aiFeatures.risk_suggestion !== false && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AutoAwesome />}
                                        onClick={handleImproveWithAI}
                                        disabled={aiImproving}
                                    >
                                        {aiImproving ? 'AI working...' : 'Improve with AI'}
                                    </Button>
                                )}
                                {aiSuggestion && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={handleDismissAISuggestion}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            startIcon={<CompareArrows />}
                                            onClick={handleApplyAISuggestion}
                                        >
                                            Apply Improvement
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            {aiSuggestion && (
                                <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
                                    <Typography variant="subtitle2" gutterBottom color="secondary.main">
                                        AI Suggestion:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}><strong>Statement:</strong> {aiSuggestion.improved_risk}</Typography>
                                    <Typography variant="caption" display="block"><strong>Cause:</strong> {aiSuggestion.cause}</Typography>
                                    <Typography variant="caption" display="block"><strong>Event:</strong> {aiSuggestion.event}</Typography>
                                    <Typography variant="caption" display="block"><strong>Impact:</strong> {aiSuggestion.impact}</Typography>
                                    <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                                        Rationale: {aiSuggestion.explanation}
                                    </Typography>
                                </Paper>
                            )}
                        </Paper>

                        {/* AI STRATEGIC INSIGHTS SECTION */}
                        <Paper sx={{
                            p: 3, mb: 3,
                            background: isDrawer ? alpha('#6366f1', 0.05) : 'background.paper',
                            border: `1px solid ${alpha('#6366f1', 0.1)}`,
                            borderRadius: '24px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <Box sx={{
                                        p: 1, borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        color: '#fff', display: 'flex'
                                    }}>
                                        <Psychology />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight="700">AI Strategic Insights</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.6 }}>Deep-learning risk assessment</Typography>
                                    </Box>
                                </Box>
                                <Box>
                                    {!analyzing ? (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<Refresh />}
                                            onClick={() => handleRunAnalysis(true)}
                                            sx={{ borderRadius: '100px', borderColor: alpha('#6366f1', 0.3), color: 'text.primary' }}
                                        >
                                            {deepAnalysis ? 'Re-run AI' : 'Run Analysis'}
                                        </Button>
                                    ) : null}
                                </Box>
                            </Box>

                            {analyzing ? (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <CircularProgress size={32} sx={{ mb: 2, color: '#6366f1' }} />
                                    <Typography variant="body2" sx={{ opacity: 0.6, animation: 'pulse 2s infinite' }}>
                                        AI is analyzing root causes & impacts...
                                    </Typography>
                                </Box>
                            ) : deepAnalysis ? (
                                <Fade in={true}>
                                    <Box>
                                        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: '16px', border: `1px solid ${alpha('#6366f1', 0.1)}` }}>
                                            <Typography variant="subtitle2" sx={{ color: '#6366f1', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AutoAwesome fontSize="small" /> ENHANCED DESCRIPTION
                                            </Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.primary' }}>
                                                {deepAnalysis.enhancedDescription}
                                            </Typography>
                                        </Box>

                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, height: '100%', bgcolor: 'action.hover', borderRadius: '16px', border: `1px solid ${alpha('#ef4444', 0.15)}` }}>
                                                    <Typography variant="subtitle2" sx={{ color: '#ef4444', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Assessment fontSize="small" /> IMPACT
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{deepAnalysis.impact}</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, height: '100%', bgcolor: 'action.hover', borderRadius: '16px', border: `1px solid ${alpha('#fbbf24', 0.15)}` }}>
                                                    <Typography variant="subtitle2" sx={{ color: '#fbbf24', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Shield fontSize="small" /> LIKELIHOOD
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{deepAnalysis.likelihood}</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ mb: 0 }}>
                                            <Typography variant="subtitle2" sx={{ color: '#22c55e', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Bolt fontSize="small" /> MITIGATION SUGGESTIONS
                                            </Typography>
                                            <Stack spacing={1}>
                                                {deepAnalysis.mitigationSuggestions?.map((s: string, i: number) => (
                                                    <Box key={i} sx={{
                                                        p: 1.5, bgcolor: alpha('#22c55e', 0.05),
                                                        borderRadius: '12px', border: `1px solid ${alpha('#22c55e', 0.1)}`,
                                                        display: 'flex', gap: 1.5, alignItems: 'center'
                                                    }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#22c55e' }}>{i + 1}</Typography>
                                                        <Typography variant="body2" sx={{ color: isDrawer ? alpha('#fff', 0.8) : 'text.primary' }}>{s}</Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Box>

                                        {deepAnalysis.whyMatters && (
                                            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha('#fff', 0.05)}` }}>
                                                <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.5 }}>
                                                    CRO Rationale: {deepAnalysis.whyMatters}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Fade>
                            ) : (
                                <Alert severity="info" sx={{ borderRadius: '16px', bgcolor: alpha('#6366f1', 0.05), color: isDrawer ? alpha('#fff', 0.7) : 'inherit' }}>
                                    Analysis unavailable for this item. Click "Run Analysis" to generate insights.
                                </Alert>
                            )}
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>Assessment</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" display="block">Likelihood</Typography>
                                    {isEditing ? (
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={risk.likelihood_score ?? ''}
                                            onChange={(e) => setRisk({ ...risk, likelihood_score: e.target.value ? parseInt(e.target.value) : null })}
                                        />
                                    ) : (
                                        <Typography variant="h4">{risk.likelihood_score || '-'}</Typography>
                                    )}
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" display="block">Impact</Typography>
                                    {isEditing ? (
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={risk.impact_score ?? ''}
                                            onChange={(e) => setRisk({ ...risk, impact_score: e.target.value ? parseInt(e.target.value) : null })}
                                        />
                                    ) : (
                                        <Typography variant="h4">{risk.impact_score || '-'}</Typography>
                                    )}
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
                                <Typography variant="caption" display="block">Score</Typography>
                                <Typography variant="h4">
                                    {risk.inherent_risk_score ? Number(risk.inherent_risk_score).toFixed(1) : '-'}
                                </Typography>
                            </Box>

                            {aiFeatures.risk_suggestion !== false && (
                                scoreSuggestion ? (
                                    <Paper variant="outlined" sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderColor: 'secondary.main' }}>
                                        <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                                            AI Score Suggestion
                                        </Typography>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2">Likelihood: <strong>{scoreSuggestion.suggested_likelihood}</strong></Typography>
                                            <Typography variant="body2">Impact: <strong>{scoreSuggestion.suggested_impact}</strong></Typography>
                                        </Box>
                                        <Typography variant="caption" fontStyle="italic" display="block" mb={2}>
                                            {scoreSuggestion.rationale}
                                        </Typography>
                                        <Box display="flex" gap={1}>
                                            <Button size="small" variant="outlined" color="error" fullWidth onClick={handleDismissScoreSuggestion}>
                                                Reject
                                            </Button>
                                            <Button size="small" variant="contained" color="secondary" fullWidth onClick={handleApplyScoreSuggestion}>
                                                Apply
                                            </Button>
                                        </Box>
                                    </Paper>
                                ) : (
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<AutoAwesome />}
                                        sx={{ mt: 3 }}
                                        onClick={handleSuggestScores}
                                        disabled={aiScoring}
                                    >
                                        {aiScoring ? 'Calculating...' : 'AI Scoring Assistant'}
                                    </Button>
                                )
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* TAB 1: CONTROLS & REMEDIATION */}
            {activeTab === 1 && (
                <Grid container spacing={3}>
                    {/* Controls Section */}
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Mapped Controls</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<HealthAndSafety />}
                                    onClick={async () => {
                                        try {
                                            await controlsAPI.assessEffectiveness(risk.risk_id);
                                            alert('AI Assessment started. Check back shortly.');
                                        } catch (e) {
                                            alert('Failed to start assessment');
                                        }
                                    }}
                                >
                                    Assess Effectiveness
                                </Button>
                                <Button variant="outlined" startIcon={<Add />} onClick={handleOpenControlDialog}>
                                    Map Control
                                </Button>
                            </Box>
                        </Box>
                        <TableContainer component={Paper} sx={{ mb: 4 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Control Name</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Mitigation Strength</TableCell>
                                        <TableCell>Effectiveness</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {risk.controls?.map((control: any) => (
                                        <TableRow key={control.control_id}>
                                            <TableCell>{control.control_name}</TableCell>
                                            <TableCell><Chip label={control.control_type} size="small" variant="outlined" /></TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={control.implementation_status}
                                                    size="small"
                                                    color={control.implementation_status === 'IMPLEMENTED' ? 'success' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>{control.mitigation_strength || '-'}</TableCell>
                                            <TableCell>
                                                {control.effectiveness_percent ? `${control.effectiveness_percent}%` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!risk.controls || risk.controls.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                No controls mapped to this risk.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>

                    {/* Remediation Section */}
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Remediation Plans</Typography>
                            {aiFeatures.risk_suggestion !== false && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<AutoAwesome />}
                                    onClick={handleSuggestRemediation}
                                    disabled={aiRemediationLoading}
                                    sx={{ mr: 1 }}
                                >
                                    {aiRemediationLoading ? 'AI Analyzing...' : 'Suggest Remediation'}
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Add />}
                                onClick={handleOpenAssignDialog}
                                sx={{ mr: 1 }}
                            >
                                Assign Task
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<Save />}
                                onClick={() => {
                                    if (!remediationPlans.length) return;
                                    const csvContent = "data:text/csv;charset=utf-8,"
                                        + "Action Title,Status,Description,Due Date,AI Suggested\n"
                                        + remediationPlans.map(p =>
                                            `"${p.action_title}","${p.status}","${p.description}","${p.due_date || ''}","${p.ai_suggested ? 'Yes' : 'No'}"`
                                        ).join("\n");
                                    const encodedUri = encodeURI(csvContent);
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodedUri);
                                    link.setAttribute("download", `risk_${riskId}_actions.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                disabled={remediationPlans.length === 0}
                            >
                                Export Actions
                            </Button>
                        </Box>
                        <Grid container spacing={2}>
                            {remediationPlans.map((plan: any) => (
                                <Grid item xs={12} md={6} key={plan.plan_id}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="subtitle1" fontWeight="bold">{plan.action_title}</Typography>
                                                <Chip label={plan.status} size="small" color={plan.status === 'COMPLETED' ? 'success' : 'primary'} />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                {plan.description}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                                                {plan.ai_suggested && <Chip icon={<AutoAwesome />} label="AI Suggested" size="small" color="secondary" variant="outlined" />}
                                                <Typography variant="caption">
                                                    Due: {plan.due_date ? format(new Date(plan.due_date), 'PP') : 'No date'}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {remediationPlans.length === 0 && (
                                <Grid item xs={12}>
                                    <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }} variant="outlined">
                                        No remediation plans. Use AI Suggestion to generate plans.
                                    </Paper>
                                </Grid>
                            )}
                        </Grid>
                    </Grid>

                    {/* Assigned Tasks Section - Only for Managers/Admins */}
                    {(user?.role === 'admin' || user?.role === 'risk_manager') && riskId ? (
                        <Grid item xs={12}>
                            <AssignedTasksSection riskId={riskId} />
                        </Grid>
                    ) : null}
                </Grid>
            )}

            {/* TAB 2: HISTORY */}
            {activeTab === 2 && (
                <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <HistoryIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Change Log</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Changes</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {risk.history?.map((entry: any) => {
                                    // Helper to parse if value is JSON string
                                    const parseVal = (val: any) => {
                                        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                                            try { return JSON.parse(val); } catch (e) { return val; }
                                        }
                                        return val;
                                    };

                                    const oldVal = parseVal(entry.old_value);
                                    const newVal = parseVal(entry.new_value);
                                    let changes = [];

                                    // Calculate diffs if both are objects
                                    if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal && newVal) {
                                        const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
                                        allKeys.forEach(key => {
                                            if (['risk_id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'history_id', 'owner_user_id'].includes(key)) return;

                                            const v1 = oldVal[key];
                                            const v2 = newVal[key];
                                            // Loose comparison for numbers/strings
                                            // eslint-disable-next-line eqeqeq
                                            if (v1 != v2) {
                                                // Handle date quirks or massive text differences if needed
                                                changes.push({ field: key, from: v1, to: v2 });
                                            }
                                        });
                                    } else if (entry.field_name) {
                                        // Specific single field change
                                        changes.push({ field: entry.field_name, from: oldVal, to: newVal });
                                    }

                                    return (
                                        <TableRow key={entry.history_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell sx={{ verticalAlign: 'top' }}>
                                                {entry.changed_at ? format(new Date(entry.changed_at), 'PP p') : '-'}
                                            </TableCell>
                                            <TableCell sx={{ verticalAlign: 'top' }}><Chip label={entry.change_type} size="small" variant="outlined" /></TableCell>
                                            <TableCell sx={{ verticalAlign: 'top' }}>{entry.changed_by_name || 'System'}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {entry.change_reason || (entry.change_type === 'created' ? 'Risk created' : 'Risk updated')}
                                                </Typography>

                                                {/* Render Diffs */}
                                                {changes.length > 0 ? (
                                                    <Box sx={{ mt: 1, bgcolor: 'action.hover', p: 1, borderRadius: 1, fontSize: '0.85rem' }}>
                                                        {changes.map((change: any, i: number) => (
                                                            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                                                <Typography variant="caption" fontWeight="bold" sx={{ minWidth: 80, textTransform: 'capitalize' }}>
                                                                    {change.field.replace(/_/g, ' ')}:
                                                                </Typography>
                                                                <Typography variant="caption" color="error.main" sx={{ textDecoration: 'line-through' }}>
                                                                    {String(change.from ?? 'null')}
                                                                </Typography>
                                                                <Typography variant="caption">→</Typography>
                                                                <Typography variant="caption" color="success.main" fontWeight="bold">
                                                                    {String(change.to ?? 'null')}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                ) : (
                                                    // Fallback if no specific diff detected but values exist (e.g. huge text block)
                                                    (entry.old_value || entry.new_value) && (
                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                            Raw Update: {String(entry.old_value ?? '')} → {String(entry.new_value ?? '')}
                                                        </Typography>
                                                    )
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Controls Dialog */}
            <Dialog open={openControlDialog} onClose={() => setOpenControlDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Map Control to Risk</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            select
                            fullWidth
                            label="Select Control"
                            value={selectedControlId}
                            onChange={(e) => setSelectedControlId(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ mb: 3 }}
                        >
                            <option value="">-- Select --</option>
                            {availableControls.map((c) => (
                                <option key={c.control_id} value={c.control_id}>
                                    {c.control_name} ({c.control_type})
                                </option>
                            ))}
                        </TextField>

                        <TextField
                            select
                            fullWidth
                            label="Mitigation Strength"
                            value={mitigationStrength}
                            onChange={(e) => setMitigationStrength(e.target.value)}
                            SelectProps={{ native: true }}
                        >
                            <option value="CRITICAL">Critical (High Impact)</option>
                            <option value="HIGH">High</option>
                            <option value="MODERATE">Moderate</option>
                            <option value="LOW">Low</option>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenControlDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssignControl} disabled={!selectedControlId}>
                        Assign Control
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Task Assignment Dialog */}
            <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Assign Task
                    {risk?.department && (
                        <Chip
                            label={risk.department}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ ml: 2 }}
                        />
                    )}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            select
                            fullWidth
                            label="Assign To"
                            value={assignForm.assignee_user_id}
                            onChange={(e) => setAssignForm({ ...assignForm, assignee_user_id: e.target.value })}
                            SelectProps={{ native: true }}
                            helperText="Showing users from: All Departments"
                        >
                            <option value="">-- Select User --</option>
                            {assignableUsers.map((user) => (
                                <option key={user.user_id} value={user.user_id}>
                                    {user.full_name} ({user.email}){user.department ? ` - ${user.department}` : ''}
                                </option>
                            ))}
                        </TextField>

                        <TextField
                            fullWidth
                            label="Task Title"
                            value={assignForm.action_title}
                            onChange={(e) => setAssignForm({ ...assignForm, action_title: e.target.value })}
                            placeholder="e.g., Implement firewall rules"
                            required
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={assignForm.description}
                            onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                            placeholder="Detailed instructions for the task..."
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Due Date"
                                value={assignForm.due_date}
                                onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                select
                                fullWidth
                                label="Priority"
                                value={assignForm.priority}
                                onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                                SelectProps={{ native: true }}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </TextField>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAssignTask}
                        disabled={assignLoading || !assignForm.assignee_user_id || !assignForm.action_title}
                    >
                        {assignLoading ? 'Assigning...' : 'Assign Task'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* DELETE CONFIRMATION DIALOG */}
            <Dialog open={openDeleteDialog} onClose={() => !deleteLoading && setOpenDeleteDialog(false)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                    <Warning color="error" /> Delete Risk
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Are you sure you want to delete risk <strong>{risk.risk_code}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        By default, this will set the risk status to 'CLOSED' and keep it in the history.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={() => setOpenDeleteDialog(false)} disabled={deleteLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleDelete(false)}
                        color="error"
                        variant="outlined"
                        disabled={deleteLoading}
                    >
                        Soft Delete (Close)
                    </Button>
                    {user?.role === 'admin' && (
                        <Button
                            onClick={() => handleDelete(true)}
                            color="error"
                            variant="contained"
                            disabled={deleteLoading}
                        >
                            Permanent Delete
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
