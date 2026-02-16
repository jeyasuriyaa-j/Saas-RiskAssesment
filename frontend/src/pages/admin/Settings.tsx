import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Grid,
    Tabs,
    Tab,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    Slider
} from '@mui/material';
import {
    Save as SaveIcon,
    Tune as TuneIcon,
    Psychology as AIIcon,
    Business as BusinessIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface TenantSettings {
    risk_appetite: string;
    scales: {
        likelihood: number;
        impact: number;
    };
    language_preference: string;
    api_key: string;
    model: string;
    ai_features: {
        auto_mapping: boolean;
        risk_suggestion: boolean;
        drift_detection: boolean;
    };
}

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [auditFilters, setAuditFilters] = useState({ user_id: '', action: '' });
    const [settings, setSettings] = useState<TenantSettings>({
        risk_appetite: 'Balanced',
        scales: { likelihood: 5, impact: 5 },
        language_preference: 'Professional',
        api_key: '',
        model: 'gemini-1.5-flash',
        ai_features: {
            auto_mapping: true,
            risk_suggestion: true,
            drift_detection: true
        }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/config');
            if (response.data && Object.keys(response.data).length > 0) {
                // Merge with defaults to ensure all fields exist
                setSettings(prev => ({ ...prev, ...response.data }));
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        try {
            const response = await api.get('/admin/audit', { params: auditFilters });
            setAuditLogs(response.data);

            // Fetch users for filter if not loaded
            if (users.length === 0) {
                const userRes = await api.get('/users');
                setUsers(userRes.data.users);
            }
        } catch (error) {
            console.error('Failed to load audit logs', error);
        } finally {
            setLoadingAudit(false);
        }
    };

    useEffect(() => {
        if (activeTab === 3) {
            fetchAuditLogs();
        }
    }, [activeTab]);

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await api.put('/admin/config', settings);
            setMsg({ type: 'success', text: 'Settings saved successfully' });
        } catch (error) {
            setMsg({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleAIChange = (feature: keyof TenantSettings['ai_features']) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({
            ...prev,
            ai_features: {
                ...prev.ai_features,
                [feature]: e.target.checked
            }
        }));
    };

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;

    return (
        <Box className="fade-in">
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Admin Settings
                    </Typography>
                    <Typography color="text.secondary">
                        Configure your risk model, appetite, and AI preferences
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </Box>

            {msg && (
                <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>
                    {msg.text}
                </Alert>
            )}

            <Card className="glass">
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<BusinessIcon />} label="General" iconPosition="start" />
                    <Tab icon={<TuneIcon />} label="Risk Model" iconPosition="start" />
                    <Tab icon={<AIIcon />} label="AI Controls" iconPosition="start" />
                    <Tab icon={<HistoryIcon />} label="Audit History" iconPosition="start" />
                </Tabs>

                <CardContent sx={{ p: 4 }}>
                    {/* General Tab */}
                    {activeTab === 0 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>Organization Profile</Typography>
                                <TextField
                                    fullWidth
                                    label="Language Tone"
                                    value={settings.language_preference}
                                    onChange={(e) => setSettings({ ...settings, language_preference: e.target.value })}
                                    helperText="Preferred tone for AI generated content (e.g., Professional, Strict, Neutral)"
                                    sx={{ mb: 3 }}
                                />
                                <TextField
                                    fullWidth
                                    select
                                    label="Risk Appetite"
                                    value={settings.risk_appetite}
                                    onChange={(e) => setSettings({ ...settings, risk_appetite: e.target.value })}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="Conservative">Conservative (Avoid Risk)</option>
                                    <option value="Balanced">Balanced</option>
                                    <option value="Aggressive">Aggressive (Seek Risk)</option>
                                </TextField>
                            </Grid>
                        </Grid>
                    )}

                    {/* Risk Model Tab */}
                    {activeTab === 1 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>Scoring Scales</Typography>
                            <Typography variant="body2" color="text.secondary" mb={4}>
                                Define the dimensions for your risk matrix. Changing these will affect the Heatmap.
                            </Typography>

                            <Grid container spacing={6}>
                                <Grid item xs={12} md={6}>
                                    <Typography gutterBottom>Likelihood Scale (1 - {settings.scales.likelihood})</Typography>
                                    <Slider
                                        value={settings.scales.likelihood}
                                        min={3}
                                        max={10}
                                        step={1}
                                        marks
                                        valueLabelDisplay="on"
                                        onChange={(_, v) => setSettings({
                                            ...settings,
                                            scales: { ...settings.scales, likelihood: v as number }
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography gutterBottom>Impact Scale (1 - {settings.scales.impact})</Typography>
                                    <Slider
                                        value={settings.scales.impact}
                                        min={3}
                                        max={10}
                                        step={1}
                                        marks
                                        valueLabelDisplay="on"
                                        onChange={(_, v) => setSettings({
                                            ...settings,
                                            scales: { ...settings.scales, impact: v as number }
                                        })}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* AI Controls Tab */}
                    {activeTab === 2 && (
                        <Box>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="AI API Key"
                                        type="password"
                                        value={settings.api_key}
                                        onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                                        helperText="Enter your Gemini/OpenRouter API Key"
                                        sx={{ mb: 3 }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="AI Model"
                                        value={settings.model}
                                        onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                                        helperText="Model identifier (e.g., gemini-1.5-flash, google/gemini-2.0-flash-lite)"
                                        sx={{ mb: 3 }}
                                    />
                                </Grid>
                            </Grid>

                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom mb={2}>Toggle AI Capabilities</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.ai_features.auto_mapping}
                                                onChange={handleAIChange('auto_mapping')}
                                            />
                                        }
                                        label="Enable AI Auto-Mapping for Excel Imports"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.ai_features.risk_suggestion}
                                                onChange={handleAIChange('risk_suggestion')}
                                            />
                                        }
                                        label="Enable AI Risk Scoring Suggestions"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.ai_features.drift_detection}
                                                onChange={handleAIChange('drift_detection')}
                                            />
                                        }
                                        label="Enable Scale Drift & Outlier Detection"
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    {/* Audit History Tab */}
                    {activeTab === 3 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>Configuration Audit Trail</Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Track changes across the system. (Admins see all tenants)
                            </Typography>

                            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                                <TextField
                                    select
                                    label="Filter by User"
                                    size="small"
                                    sx={{ minWidth: 200 }}
                                    value={auditFilters.user_id}
                                    onChange={(e) => setAuditFilters({ ...auditFilters, user_id: e.target.value })}
                                    SelectProps={{ native: true }}
                                    InputLabelProps={{ shrink: true }}
                                >
                                    <option value="">All Users</option>
                                    {users.map(u => (
                                        <option key={u.user_id} value={u.user_id}>
                                            {u.full_name} ({u.organization || 'My Tenant'})
                                        </option>
                                    ))}
                                </TextField>

                                <TextField
                                    select
                                    label="Filter by Action"
                                    size="small"
                                    sx={{ minWidth: 200 }}
                                    value={auditFilters.action}
                                    onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                                    SelectProps={{ native: true }}
                                    InputLabelProps={{ shrink: true }}
                                >
                                    <option value="">All Actions</option>
                                    <option value="CREATE">Create</option>
                                    <option value="UPDATE">Update</option>
                                    <option value="DELETE">Delete</option>
                                    <option value="LOGIN">Login</option>
                                </TextField>

                                <Button variant="outlined" onClick={fetchAuditLogs}>
                                    Apply Filters
                                </Button>
                            </Box>
                            {loadingAudit ? (
                                <Box textAlign="center" py={4}><CircularProgress size={30} /></Box>
                            ) : (
                                <Box>
                                    {auditLogs.length === 0 ? (
                                        <Typography color="text.secondary" textAlign="center" py={4}>No audit logs found.</Typography>
                                    ) : (
                                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                                            {auditLogs.map((log, index) => (
                                                <Box
                                                    key={log.log_id}
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: index % 2 === 0 ? 'background.paper' : 'action.hover',
                                                        borderBottom: index !== auditLogs.length - 1 ? '1px solid' : 'none',
                                                        borderColor: 'divider'
                                                    }}
                                                >
                                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {log.actor_name || 'Admin'} performed {log.action}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        {log.changes?.scales && (
                                                            <Typography variant="body2">
                                                                Scales changed:{' '}
                                                                {log.changes.scales.old?.likelihood ? `${log.changes.scales.old.likelihood}x${log.changes.scales.old.impact}` : 'None'}
                                                                {' → '}
                                                                {log.changes.scales.new?.likelihood ? `${log.changes.scales.new.likelihood}x${log.changes.scales.new.impact}` : 'None'}
                                                            </Typography>
                                                        )}
                                                        {log.changes?.risk_appetite && log.changes.risk_appetite.old.appetite_type !== log.changes.risk_appetite.new.appetite_type && (
                                                            <Typography variant="body2">
                                                                Appetite changed: {log.changes.risk_appetite.old.appetite_type} → {log.changes.risk_appetite.new.appetite_type}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
