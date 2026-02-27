import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Divider,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Chip,
    Paper,
    CircularProgress,
    Alert,
    Stack,
    Dialog,
    Grow,
    alpha
} from '@mui/material';
import { Close, Save, AttachFile, CloudUpload } from '@mui/icons-material';
import api, { myRisksAPI } from '../services/api';
import { format } from 'date-fns';

interface MyRiskDrawerProps {
    open: boolean;
    riskId: string;
    onClose: () => void;
}

interface RiskDetail {
    risk_id: string;
    risk_code: string;
    statement: string;
    category: string;
    inherent_risk_score: number;
    plan_id: string;
    action_title: string;
    description: string;
    action_plan: string | null;
    notes: any[];
    status: string;
    priority: string;
    due_date: string | null;
    ai_suggestions: string[];
    files: any[];
}

export default function MyRiskDrawer({ open, riskId, onClose }: MyRiskDrawerProps) {
    const [risk, setRisk] = useState<RiskDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [actionPlan, setActionPlan] = useState('');
    const [newNote, setNewNote] = useState('');
    const [status, setStatus] = useState('');

    const [uploading, setUploading] = useState(false);
    const [fileError, setFileError] = useState('');

    const fetchRiskDetail = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await myRisksAPI.get(riskId);
            setRisk(response.data);
            setActionPlan(response.data.action_plan || '');
            setStatus(response.data.status);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load risk details');
        } finally {
            setLoading(false);
        }
    }, [riskId]);

    useEffect(() => {
        if (open && riskId) {
            fetchRiskDetail();
        }
    }, [open, riskId, fetchRiskDetail]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            setFileError('');

            // 1. Upload file to server (assuming a temporary upload or generic upload endpoint)
            // For now, let's use the myRisksAPI.upload which seems to expect metadata
            // Actually, we should use a proper FormData upload for the file.
            // Looking at api.ts, myRisksAPI.upload takes riskId and metadata.
            // We might need a separate multipart upload for the actual file first or use the myRisksAPI.upload as intended.

            // Re-reading api.ts: myRisksAPI.upload: (riskId: string, data: { file_name: string; file_path: string; ... })
            // Wait, this looks like it just saves metadata. We need the actual file upload.
            // importAPI.upload is the only one with FormData.

            const formData = new FormData();
            formData.append('file', file);
            formData.append('taskId', riskId); // MyRiskDrawer's riskId is actually the task/plan ID/code
            // We use the evidence API directly for GRC evidence
            await api.post('evidence/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Refresh detailed view to show new files
            await fetchRiskDetail();
            setSuccess('File uploaded successfully');
        } catch (err: any) {
            setFileError(err.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            // Validation: Enforce evidence for COMPLETED status
            if (status === 'COMPLETED' && (!risk?.files || risk.files.length === 0)) {
                setError('You must upload at least one evidence file before completing this task.');
                setSaving(false);
                return;
            }

            const updates: any = {};
            if (actionPlan !== risk?.action_plan) updates.action_plan = actionPlan;
            if (newNote.trim()) updates.notes = newNote.trim();
            if (status !== risk?.status) updates.status = status;

            if (Object.keys(updates).length === 0) {
                setError('No changes to save');
                return;
            }

            await myRisksAPI.updateTask(riskId, updates);
            setSuccess('Task updated successfully');
            setNewNote('');

            // Refresh data
            await fetchRiskDetail();

            // Close drawer after 1.5 seconds to let user see success
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update task');
        } finally {
            setSaving(false);
        }
    };

    const getSeverityLabel = (score: number) => {
        if (score >= 20) return { label: 'CRITICAL', color: 'error' };
        if (score >= 15) return { label: 'HIGH', color: 'warning' };
        if (score >= 10) return { label: 'MEDIUM', color: 'info' };
        return { label: 'LOW', color: 'success' };
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            TransitionComponent={Grow}
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: '90vh',
                    overflow: 'hidden'
                }
            }}
        >
            <Box
                className="no-scrollbar"
                sx={{
                    p: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { display: 'none' },
                    'scrollbarWidth': 'none',
                    'msOverflowStyle': 'none'
                }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" fontWeight={600}>
                        Task Details
                    </Typography>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : error && !risk ? (
                    <Alert severity="error">{error}</Alert>
                ) : risk ? (
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {/* Alerts */}
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                        {/* Read-only: Risk Information */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                mb: 3,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'grey.50',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 3,
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: 4,
                                    bgcolor: 'primary.main'
                                }
                            }}
                        >
                            <Typography variant="overline" color="primary.main" fontWeight="bold" sx={{ letterSpacing: 1.2 }}>
                                Risk Context (Read-only)
                            </Typography>
                            <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    {risk.risk_code}
                                </Typography>
                                <Typography variant="h6" sx={{ fontSize: '1.05rem', lineHeight: 1.4, mb: 2 }}>
                                    {risk.statement}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Chip
                                        label={risk.category}
                                        size="small"
                                        variant="outlined"
                                        sx={{ borderColor: 'divider', fontWeight: 600 }}
                                    />
                                    <Chip
                                        label={getSeverityLabel(risk.inherent_risk_score).label}
                                        color={getSeverityLabel(risk.inherent_risk_score).color as any}
                                        size="small"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Stack>
                            </Box>
                        </Paper>

                        {/* Read-only: AI Suggestions */}
                        {risk.ai_suggestions && risk.ai_suggestions.length > 0 && (
                            <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50' }}>
                                <Typography variant="overline" color="text.secondary">
                                    AI Suggestions (Read-only)
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    {risk.ai_suggestions.map((suggestion, idx) => (
                                        <Typography key={idx} variant="body2" sx={{ mb: 1 }}>
                                            • {suggestion}
                                        </Typography>
                                    ))}
                                </Box>
                            </Paper>
                        )}

                        {/* Editable: Task Details */}
                        <Typography variant="h6" gutterBottom>
                            Task: {risk.action_title}
                        </Typography>
                        {risk.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {risk.description}
                            </Typography>
                        )}
                        {risk.due_date && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Due: {format(new Date(risk.due_date), 'MMM d, yyyy')}
                            </Typography>
                        )}

                        {/* Status Dropdown */}
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={status}
                                label="Status"
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <MenuItem value="OPEN">Open</MenuItem>
                                <MenuItem value="ASSIGNED">Assigned</MenuItem>
                                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                                <MenuItem value="MITIGATED">Mitigated</MenuItem>
                                <MenuItem value="COMPLETED" disabled={!risk?.files || risk.files.length === 0}>
                                    Completed {!risk?.files || risk.files.length === 0 ? '(Evidence Required)' : ''}
                                </MenuItem>
                                <MenuItem value="BLOCKED">Blocked</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Evidence Upload */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Evidence & Artifacts
                                {(!risk.files || risk.files.length === 0) && (
                                    <Chip label="Required for Completion" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                )}
                            </Typography>

                            {fileError && <Alert severity="error" sx={{ mb: 2 }}>{fileError}</Alert>}

                            <input
                                type="file"
                                id="evidence-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <label htmlFor="evidence-upload">
                                <Button
                                    component="span"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                                    disabled={uploading}
                                    sx={{
                                        py: 1.5,
                                        borderStyle: 'dashed',
                                        '&:hover': { borderStyle: 'dashed' }
                                    }}
                                >
                                    {uploading ? 'Uploading...' : 'Upload Evidence File'}
                                </Button>
                            </label>

                            {risk.files && risk.files.length > 0 && (
                                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {risk.files.map((file: any) => (
                                        <Chip
                                            key={file.file_id || file.id}
                                            icon={<AttachFile sx={{ fontSize: '1rem !important' }} />}
                                            label={file.file_name}
                                            size="small"
                                            onDelete={() => { }} // TODO: Implement delete
                                            variant="filled"
                                            sx={{
                                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                                color: 'primary.main',
                                                borderColor: 'primary.light'
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* Action Plan */}
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Action Plan"
                            value={actionPlan}
                            onChange={(e) => setActionPlan(e.target.value)}
                            placeholder="Describe your plan to address this risk..."
                            sx={{ mb: 3 }}
                        />

                        {/* Notes History */}
                        <Typography variant="subtitle2" gutterBottom>
                            Update Notes & History
                        </Typography>
                        {risk.notes && risk.notes.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 150, overflow: 'auto', bgcolor: 'transparent' }}>
                                {risk.notes.map((note: any, idx: number) => (
                                    <Box key={idx} sx={{ mb: 1, pb: 1, borderBottom: idx < risk.notes.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {format(new Date(note.created_at), 'MMM d, PPp')}
                                        </Typography>
                                        <Typography variant="body2">{note.text}</Typography>
                                    </Box>
                                ))}
                            </Paper>
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Add New Note"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a comment or update..."
                            sx={{ mb: 3 }}
                        />

                        {/* Save Button */}
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                ) : null}
            </Box>
        </Dialog>
    );
}
