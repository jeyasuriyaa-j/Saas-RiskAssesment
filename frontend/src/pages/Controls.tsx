import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    CircularProgress,
    Alert,
    Tooltip,
    Card,
    CardContent,
    CardActions,
    Stack,
    Divider
} from '@mui/material';
import { Add, Edit, Delete, Security, Gavel, History } from '@mui/icons-material';
import { controlsAPI, complianceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Enum definitions
const CONTROL_TYPES = ['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE'];
const STATUSES = ['DESIGNED', 'IMPLEMENTED', 'OPTIMIZED'];

export default function Controls() {
    const [controls, setControls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [currentControl, setCurrentControl] = useState<any>(null);
    const [openAssessDialog, setOpenAssessDialog] = useState(false);
    const [assessmentData, setAssessmentData] = useState({ score: 0, notes: '' });
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const canManageControls = user?.role === 'admin' || user?.role === 'risk_manager';

    // Form state
    const [formData, setFormData] = useState({
        control_name: '',
        description: '',
        control_type: 'PREVENTIVE',
        implementation_status: 'DESIGNED',
        owner_name: '' // In real app, this would be a user select
    });

    useEffect(() => {
        fetchControls();
    }, []);

    const fetchControls = async () => {
        setLoading(true);
        try {
            const response = await controlsAPI.list();
            setControls(response.data.controls);
        } catch (err) {
            setError('Failed to fetch controls');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (currentControl) {
                await controlsAPI.update(currentControl.control_id, formData);
            } else {
                await controlsAPI.create(formData);
            }

            setOpenDialog(false);
            fetchControls();
        } catch (err) {
            setError('Failed to save control');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this control?')) return;
        try {
            await controlsAPI.delete(id);
            fetchControls();
        } catch (err) {
            setError('Failed to delete control');
        }
    };

    const openEdit = (control: any) => {
        setCurrentControl(control);
        setFormData({
            control_name: control.control_name,
            description: control.description || '',
            control_type: control.control_type,
            implementation_status: control.implementation_status,
            owner_name: ''
        });
        setOpenDialog(true);
    };

    const openCreate = () => {
        setCurrentControl(null);
        setFormData({
            control_name: '',
            description: '',
            control_type: 'PREVENTIVE',
            implementation_status: 'DESIGNED',
            owner_name: ''
        });
        setOpenDialog(true);
    };

    const openAssess = (control: any) => {
        setCurrentControl(control);
        setAssessmentData({
            score: control.effectiveness_score || 0,
            notes: control.assessment_notes || ''
        });
        setOpenAssessDialog(true);
    };

    const handleSaveEffectiveness = async () => {
        try {
            await complianceAPI.updateEffectiveness(currentControl.control_id, {
                effectiveness_score: assessmentData.score,
                assessment_notes: assessmentData.notes
            });
            setOpenAssessDialog(false);
            fetchControls();
        } catch (err) {
            setError('Failed to save assessment');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DESIGNED': return 'default';
            case 'IMPLEMENTED': return 'primary';
            case 'OPTIMIZED': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security fontSize="large" color="primary" />
                    Control Library
                </Typography>
                {canManageControls && (
                    <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                        New Control
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : isMobile ? (
                <Stack spacing={2}>
                    {controls.map((control) => (
                        <Card key={control.control_id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                        {control.control_name}
                                    </Typography>
                                    <Chip
                                        label={control.implementation_status}
                                        color={getStatusColor(control.implementation_status) as any}
                                        size="small"
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    {control.description}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                    <Chip label={control.control_type} size="small" variant="outlined" />
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography variant="caption">Effectiveness:</Typography>
                                        <Chip
                                            label={control.effectiveness_score || 'N/A'}
                                            size="small"
                                            color={control.effectiveness_score > 7 ? 'success' : control.effectiveness_score > 4 ? 'warning' : 'error'}
                                            variant="outlined"
                                        />
                                    </Box>
                                </Stack>
                            </CardContent>
                            {canManageControls && (
                                <>
                                    <Divider />
                                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                                        <Button size="small" startIcon={<Gavel />} onClick={() => openAssess(control)}>
                                            Assess
                                        </Button>
                                        <Button size="small" startIcon={<Edit />} onClick={() => openEdit(control)}>
                                            Edit
                                        </Button>
                                        <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDelete(control.control_id)}>
                                            Delete
                                        </Button>
                                    </CardActions>
                                </>
                            )}
                        </Card>
                    ))}
                    {controls.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                            No controls defined. Create one to get started.
                        </Typography>
                    )}
                </Stack>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Control Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Effectiveness</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {controls.map((control) => (
                                <TableRow key={control.control_id}>
                                    <TableCell sx={{ fontWeight: 'medium' }}>{control.control_name}</TableCell>
                                    <TableCell>{control.description}</TableCell>
                                    <TableCell>
                                        <Chip label={control.control_type} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={control.implementation_status}
                                            color={getStatusColor(control.implementation_status) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Chip
                                                label={control.effectiveness_score || 'N/A'}
                                                size="small"
                                                color={control.effectiveness_score > 7 ? 'success' : control.effectiveness_score > 4 ? 'warning' : 'error'}
                                                variant="outlined"
                                            />
                                            {control.last_assessed_at && (
                                                <Tooltip title={`Last assessed: ${new Date(control.last_assessed_at).toLocaleDateString()}`}>
                                                    <History sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {canManageControls && (
                                            <>
                                                <IconButton size="small" onClick={() => openAssess(control)} title="Assess Effectiveness">
                                                    <Gavel fontSize="small" color="primary" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => openEdit(control)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDelete(control.control_id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {controls.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No controls defined. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{currentControl ? 'Edit Control' : 'New Control'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Control Name"
                            fullWidth
                            value={formData.control_name}
                            onChange={(e) => setFormData({ ...formData, control_name: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <TextField
                            select
                            label="Type"
                            value={formData.control_type}
                            onChange={(e) => setFormData({ ...formData, control_type: e.target.value })}
                        >
                            {CONTROL_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                        <TextField
                            select
                            label="Implementation Status"
                            value={formData.implementation_status}
                            onChange={(e) => setFormData({ ...formData, implementation_status: e.target.value })}
                        >
                            {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>Save Control</Button>
                </DialogActions>
            </Dialog>

            {/* Assessment Dialog */}
            <Dialog open={openAssessDialog} onClose={() => setOpenAssessDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Assess Control Effectiveness</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <TextField
                            label="Effectiveness Score (0-10)"
                            type="number"
                            inputProps={{ min: 0, max: 10, step: 0.1 }}
                            fullWidth
                            value={assessmentData.score}
                            onChange={(e) => setAssessmentData({ ...assessmentData, score: parseFloat(e.target.value) })}
                            helperText="0 = No effectiveness, 10 = Fully optimized"
                        />
                        <TextField
                            label="Assessment Notes"
                            fullWidth
                            multiline
                            rows={4}
                            value={assessmentData.notes}
                            onChange={(e) => setAssessmentData({ ...assessmentData, notes: e.target.value })}
                            placeholder="Detail why this score was given..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssessDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveEffectiveness} color="primary">Confirm Assessment</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
