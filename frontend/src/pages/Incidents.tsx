import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Stack,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Autocomplete
} from '@mui/material';
import { Add, Assessment, Link as LinkIcon } from '@mui/icons-material';
import { eventsAPI, riskAPI } from '../services/api';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface RiskOption {
    risk_id: string;
    risk_code: string;
    title: string;
}

export default function Incidents() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const canAnalyze = user?.role === 'admin' || user?.role === 'risk_manager' || user?.role === 'auditor';
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        event_name: '',
        event_type: 'INCIDENT',
        description: '',
        severity: 'MEDIUM',
        occurred_at: format(new Date(), 'yyyy-MM-dd')
    });
    const [selectedRisks, setSelectedRisks] = useState<RiskOption[]>([]);
    const [riskOptions, setRiskOptions] = useState<RiskOption[]>([]);
    const [riskSearchLoading, setRiskSearchLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await eventsAPI.list();
            setEvents(response.data.events);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRiskOptions = async () => {
        if (riskOptions.length > 0) return; // already loaded
        setRiskSearchLoading(true);
        try {
            const response = await riskAPI.list({ limit: 500 });
            const risks = (response.data.risks || response.data || []).filter((r: any) => r.status !== 'CLOSED');
            setRiskOptions(risks.map((r: any) => ({
                risk_id: r.risk_id,
                risk_code: r.risk_code || 'N/A',
                title: r.statement || r.title || r.risk_statement || 'Untitled Risk'
            })));
        } catch (err) {
            console.error('Failed to load risks for linking', err);
        } finally {
            setRiskSearchLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await eventsAPI.create({
                ...formData,
                affected_risk_ids: selectedRisks.map(r => r.risk_id)
            });
            setOpenDialog(false);
            fetchEvents();
            setFormData({
                event_name: '',
                event_type: 'INCIDENT',
                description: '',
                severity: 'MEDIUM',
                occurred_at: format(new Date(), 'yyyy-MM-dd')
            });
            setSelectedRisks([]);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create event');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">SWOT Incident Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => { setOpenDialog(true); fetchRiskOptions(); }}
                    color="error"
                >
                    Report Incident
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
            ) : isMobile ? (
                <Stack spacing={2}>
                    {events.map((event) => (
                        <Card key={event.event_id} elevation={2} sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(new Date(event.occurred_at), 'PP')}
                                    </Typography>
                                    <Chip
                                        label={event.severity}
                                        color={getSeverityColor(event.severity) as any}
                                        size="small"
                                    />
                                </Box>
                                <Typography variant="h6" gutterBottom>{event.event_name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {event.description}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip label={event.event_type} size="small" variant="outlined" />
                                        {event.affected_risk_ids?.length > 0 && (
                                            <Chip icon={<LinkIcon sx={{ fontSize: 14 }} />} label={`${event.affected_risk_ids.length} Linked`} size="small" color="primary" variant="outlined" />
                                        )}
                                    </Stack>
                                    {canAnalyze && (
                                        <Button
                                            variant="outlined"
                                            startIcon={<Assessment />}
                                            size="small"
                                            onClick={() => navigate(`/incidents/${event.event_id}`)}
                                        >
                                            Analyze
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                    {events.length === 0 && (
                        <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
                            No incidents reported
                        </Typography>
                    )}
                </Stack>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Event Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Linked Risks</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {events.map((event) => (
                                <TableRow key={event.event_id}>
                                    <TableCell>{format(new Date(event.occurred_at), 'PP')}</TableCell>
                                    <TableCell><Typography variant="subtitle2">{event.event_name}</Typography></TableCell>
                                    <TableCell><Chip label={event.event_type} size="small" variant="outlined" /></TableCell>
                                    <TableCell>
                                        <Chip
                                            label={event.severity}
                                            color={getSeverityColor(event.severity) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {event.affected_risk_ids?.length > 0 ? (
                                            <Chip icon={<LinkIcon sx={{ fontSize: 14 }} />} label={`${event.affected_risk_ids.length} Linked`} size="small" color="primary" variant="outlined" />
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">None</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {event.description}
                                    </TableCell>
                                    <TableCell>
                                        {canAnalyze && (
                                            <Button
                                                startIcon={<Assessment />}
                                                size="small"
                                                onClick={() => navigate(`/incidents/${event.event_id}`)}
                                            >
                                                Analyze
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle>Report New Incident</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField
                            label="Event Name"
                            fullWidth
                            value={formData.event_name}
                            onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                        />
                        <TextField
                            select
                            label="Type"
                            fullWidth
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                        >
                            <MenuItem value="INCIDENT">Incident</MenuItem>
                            <MenuItem value="NEAR_MISS">Near Miss</MenuItem>
                            <MenuItem value="SECURITY_BREACH">Security Breach</MenuItem>
                            <MenuItem value="AUDIT_FINDING">Audit Finding</MenuItem>
                        </TextField>

                        <TextField
                            select
                            label="Severity"
                            fullWidth
                            value={formData.severity}
                            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                        >
                            <MenuItem value="LOW">Low</MenuItem>
                            <MenuItem value="MEDIUM">Medium</MenuItem>
                            <MenuItem value="HIGH">High</MenuItem>
                            <MenuItem value="CRITICAL">Critical</MenuItem>
                        </TextField>

                        <TextField
                            label="Date Occurred"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.occurred_at}
                            onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
                        />

                        <Autocomplete
                            multiple
                            options={riskOptions}
                            loading={riskSearchLoading}
                            value={selectedRisks}
                            onChange={(_, newValue) => setSelectedRisks(newValue)}
                            getOptionLabel={(option) => `${option.risk_code}: ${option.title}`}
                            isOptionEqualToValue={(option, value) => option.risk_id === value.risk_id}
                            PaperComponent={(props) => (
                                <Paper
                                    {...(props as any)}
                                    sx={{
                                        ...(props as any).sx,
                                        backgroundColor: theme.palette.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                        backgroundImage: 'none',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                        opacity: 1,
                                    }}
                                />
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Link to Risks (optional)"
                                    placeholder="Search risks..."
                                    helperText="Connect this incident to risks in the register"
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {riskSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        {...getTagProps({ index })}
                                        key={option.risk_id}
                                        label={option.risk_code}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))
                            }
                        />

                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            fullWidth
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" color="error">Report</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


