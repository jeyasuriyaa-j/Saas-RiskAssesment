import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Tabs,
    Tab,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import { ChevronRight, Warning } from '@mui/icons-material';
import { myRisksAPI } from '../services/api';
import { format } from 'date-fns';
import MyRiskDrawer from '../components/MyRiskDrawer';

interface MyRisk {
    plan_id: string;
    action_title: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
    risk_id: string;
    risk_code: string;
    risk_statement: string;
    inherent_risk_score: number;
    category: string;
    is_overdue: boolean;
}

export default function MyRisks() {
    const [searchParams] = useSearchParams();
    const [risks, setRisks] = useState<MyRisk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const fetchRisks = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const params: any = {};
            if (currentTab === 1) params.status = 'ASSIGNED';
            if (currentTab === 2) params.status = 'IN_PROGRESS';
            if (currentTab === 3) params.status = 'COMPLETED';
            if (currentTab === 4) params.overdue = true;

            const response = await myRisksAPI.list(params);
            setRisks(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load risks');
        } finally {
            setLoading(false);
        }
    }, [currentTab]);

    useEffect(() => {
        fetchRisks();
    }, [fetchRisks]);

    // Handle auto-opening from URL
    useEffect(() => {
        const riskIdParam = searchParams.get('riskId');
        if (riskIdParam) {
            setSelectedRisk(riskIdParam);
            setDrawerOpen(true);
        }
    }, [searchParams]);

    const handleRowClick = (riskCode: string) => {
        setSelectedRisk(riskCode);
        setDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setDrawerOpen(false);
        setSelectedRisk(null);
        fetchRisks(); // Refresh list after closing drawer
    };

    const getStatusColor = (status: string) => {
        const colors: any = {
            ASSIGNED: 'default',
            IN_PROGRESS: 'info',
            MITIGATED: 'success',
            COMPLETED: 'success',
            BLOCKED: 'error',
        };
        return colors[status] || 'default';
    };

    const getPriorityColor = (priority: string) => {
        const colors: any = {
            CRITICAL: 'error',
            HIGH: 'warning',
            MEDIUM: 'info',
            LOW: 'default',
        };
        return colors[priority] || 'default';
    };

    const getSeverityLabel = (score: number) => {
        if (score >= 20) return { label: 'CRITICAL', color: 'error' };
        if (score >= 15) return { label: 'HIGH', color: 'warning' };
        if (score >= 10) return { label: 'MEDIUM', color: 'info' };
        return { label: 'LOW', color: 'default' };
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight={600}>
                My Risks
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your assigned risk tasks
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
                    <Tab label="All" />
                    <Tab label="Assigned" />
                    <Tab label="In Progress" />
                    <Tab label="Completed" />
                    <Tab label="Overdue" icon={<Warning fontSize="small" />} iconPosition="end" />
                </Tabs>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : risks.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No risks found for this filter
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Task Title</TableCell>
                                <TableCell>Risk</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Priority</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {risks.map((risk) => {
                                const severity = getSeverityLabel(risk.inherent_risk_score);
                                return (
                                    <TableRow
                                        key={risk.plan_id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            bgcolor: risk.is_overdue ? 'error.50' : 'inherit',
                                        }}
                                        onClick={() => handleRowClick(risk.risk_code)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {risk.action_title}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                                                {risk.risk_code}: {risk.risk_statement}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={severity.label}
                                                color={severity.color as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={risk.priority}
                                                color={getPriorityColor(risk.priority) as any}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {risk.due_date ? (
                                                <Box>
                                                    <Typography variant="body2">
                                                        {format(new Date(risk.due_date), 'MMM d, yyyy')}
                                                    </Typography>
                                                    {risk.is_overdue && (
                                                        <Typography variant="caption" color="error">
                                                            Overdue
                                                        </Typography>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No due date
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={risk.status.replace('_', ' ')}
                                                color={getStatusColor(risk.status) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small">
                                                <ChevronRight />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {selectedRisk && (
                <MyRiskDrawer
                    open={drawerOpen}
                    riskId={selectedRisk}
                    onClose={handleDrawerClose}
                />
            )}
        </Box>
    );
}
