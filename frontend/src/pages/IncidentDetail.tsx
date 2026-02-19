import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Chip,
    Button,
    Divider,
    Stack,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    List,
} from '@mui/material';
import {
    ArrowBack,
    Assessment,
    TrendingUp,
} from '@mui/icons-material';
import { eventsAPI } from '../services/api';
import { format } from 'date-fns';

export default function IncidentDetail() {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<any>(null);
    const [assessment, setAssessment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchEventDetails();
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [eventId]);

    const fetchEventDetails = async () => {
        if (!eventId) return;
        setLoading(true);
        try {
            const response = await eventsAPI.get(eventId);
            setEvent(response.data);
            // Check if there are related suggestions in the database (this part might need backend support if not already there)
        } catch (err) {
            console.error(err);
            setError('Failed to load incident details');
        } finally {
            setLoading(false);
        }
    };

    const handleStartAnalysis = async () => {
        if (!eventId) return;
        setAnalyzing(true);
        setError('');
        try {
            const response = await eventsAPI.assessImpact(eventId, {
                event_type: event.event_type,
                event_details: { description: event.description }
            });
            const requestId = response.data.request_id;
            startPolling(requestId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to start AI analysis');
            setAnalyzing(false);
        }
    };

    const startPolling = (requestId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await eventsAPI.getAssessment(eventId!, requestId);
                if (response.data.status === 'COMPLETED') {
                    setAssessment(response.data.suggestion || response.data);
                    setAnalyzing(false);
                    clearInterval(interval);
                    setPollingInterval(null);
                } else if (response.data.status === 'FAILED') {
                    setError('AI analysis failed');
                    setAnalyzing(false);
                    clearInterval(interval);
                    setPollingInterval(null);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
        setPollingInterval(interval);
    };

    if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
    if (!event) return <Box sx={{ p: 5 }}><Alert severity="error">Incident not found</Alert></Box>;

    return (
        <Box>
            <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/incidents')}
                sx={{ mb: 3 }}
            >
                Back to Incidents
            </Button>

            <Grid container spacing={3}>
                {/* Incident Overview */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h5" fontWeight="bold">{event.event_name}</Typography>
                            <Chip
                                label={event.severity}
                                color={event.severity === 'CRITICAL' ? 'error' : 'warning'}
                                size="small"
                            />
                        </Box>

                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">TYPE</Typography>
                                <Typography variant="body1">{event.event_type}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">DATE OCCURRED</Typography>
                                <Typography variant="body1">{format(new Date(event.occurred_at), 'PPPp')}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">DESCRIPTION</Typography>
                                <Typography variant="body1">{event.description}</Typography>
                            </Box>
                        </Stack>

                        <Divider sx={{ my: 3 }} />

                        {!assessment && !analyzing && (
                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={<Assessment />}
                                onClick={handleStartAnalysis}
                                sx={{ py: 1.5, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            >
                                Run AI Impact Analysis
                            </Button>
                        )}

                        {analyzing && (
                            <Box sx={{ textAlign: 'center', p: 3 }}>
                                <CircularProgress size={32} sx={{ mb: 2 }} />
                                <Typography variant="body2">AI is analyzing portfolio impact...</Typography>
                            </Box>
                        )}

                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    </Paper>
                </Grid>

                {/* AI Impact Results */}
                <Grid item xs={12} md={7}>
                    {assessment ? (
                        <Box>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                                <Assessment sx={{ mr: 1, color: '#667eea' }} />
                                AI Assessment Results
                            </Typography>

                            <Card sx={{ mb: 3, background: 'rgba(102, 126, 234, 0.05)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                        EXECUTIVE SUMMARY
                                    </Typography>
                                    <Typography variant="body1">
                                        {assessment.summary}
                                    </Typography>
                                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="body2" fontWeight="bold" sx={{ mr: 2 }}>
                                            RECOMMENDED ACTION:
                                        </Typography>
                                        <Chip
                                            label={assessment.recommended_action}
                                            color={assessment.recommended_action === 'ESCALATE' ? 'error' : 'warning'}
                                            size="small"
                                        />
                                    </Box>
                                </CardContent>
                            </Card>

                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Affected Risks & Correlation
                            </Typography>

                            <List>
                                {assessment.affected_risks.map((risk: any) => (
                                    <Card key={risk.risk_id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {risk.risk_id}
                                                </Typography>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" color="text.secondary">SUGGESTED SCORE</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                                                        <TrendingUp sx={{ mr: 0.5, fontSize: 16 }} />
                                                        <Typography variant="h6" fontWeight="bold">
                                                            {risk.suggested_score}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary">
                                                {risk.justification}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </List>
                        </Box>
                    ) : !analyzing && (
                        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
                            <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                No Analysis Available
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Click the button on the left to start AI impact investigation.
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}
