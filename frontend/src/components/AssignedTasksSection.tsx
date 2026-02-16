import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Divider,
    Stack,
} from '@mui/material';
import {
    ExpandMore,
    Refresh,
    Person,
    CalendarToday,
    Notes as NotesIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { remediationAPI } from '../services/api';

interface Assignee {
    user_id: string;
    full_name: string;
    email: string;
}

interface Note {
    text: string;
    created_at: string;
}

interface AssignedTask {
    plan_id: string;
    action_title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    action_plan: string | null;
    notes: Note[];
    attachments: any[];
    created_at: string;
    updated_at: string;
    assignee: Assignee | null;
}

interface AssignedTasksSectionProps {
    riskId: string;
}

export default function AssignedTasksSection({ riskId }: AssignedTasksSectionProps) {
    const [tasks, setTasks] = useState<AssignedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState<string | false>(false);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await remediationAPI.getAssignedTasks(riskId);
            setTasks(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load assigned tasks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [riskId]);

    const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
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

    if (loading) {
        return (
            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <CircularProgress size={32} />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                        📋 Assigned Tasks ({tasks.length})
                    </Typography>
                    <IconButton onClick={fetchTasks} size="small" title="Refresh">
                        <Refresh />
                    </IconButton>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {tasks.length === 0 ? (
                    <Box py={4} textAlign="center">
                        <Typography color="text.secondary">
                            No tasks assigned yet
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        {tasks.map((task) => (
                            <Accordion
                                key={task.plan_id}
                                expanded={expanded === task.plan_id}
                                onChange={handleAccordionChange(task.plan_id)}
                                sx={{ mb: 1 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box sx={{ width: '100%', pr: 2 }}>
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <Person fontSize="small" color="action" />
                                            <Typography variant="body1" fontWeight={500}>
                                                {task.assignee?.full_name || 'Unassigned'}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Chip
                                                label={task.status.replace('_', ' ')}
                                                color={getStatusColor(task.status) as any}
                                                size="small"
                                            />
                                            <Chip
                                                label={task.priority}
                                                color={getPriorityColor(task.priority) as any}
                                                size="small"
                                                variant="outlined"
                                            />
                                            {task.due_date && (
                                                <Chip
                                                    icon={<CalendarToday />}
                                                    label={`Due: ${format(new Date(task.due_date), 'MMM d, yyyy')}`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                            Task: {task.action_title}
                                        </Typography>
                                        {task.description && (
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                {task.description}
                                            </Typography>
                                        )}

                                        <Divider sx={{ my: 2 }} />

                                        {task.action_plan && (
                                            <Box mb={2}>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                    Action Plan
                                                </Typography>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {task.action_plan}
                                                </Typography>
                                            </Box>
                                        )}

                                        {task.notes && task.notes.length > 0 && (
                                            <Box mb={2}>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                    <NotesIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                                    Notes ({task.notes.length})
                                                </Typography>
                                                <Box>
                                                    {task.notes.map((note, idx) => (
                                                        <Box key={idx} mb={1} pl={2} borderLeft="2px solid" borderColor="divider">
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {note.text}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}

                                        <Typography variant="caption" color="text.secondary">
                                            Last updated: {format(new Date(task.updated_at), 'MMM d, yyyy h:mm a')}
                                        </Typography>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
