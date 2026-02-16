import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { Assignment, PlayArrow, CheckCircle, Warning } from '@mui/icons-material';
import { myRisksAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface DashboardCounts {
    assigned: number;
    in_progress: number;
    completed: number;
    overdue: number;
}

export default function MyRisksDashboard() {
    const [counts, setCounts] = useState<DashboardCounts>({
        assigned: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await myRisksAPI.dashboard();
            setCounts(response.data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        {
            title: 'Assigned',
            count: counts.assigned,
            icon: <Assignment sx={{ fontSize: 40 }} />,
            color: '#3b82f6',
            bgColor: '#eff6ff',
            filter: 'assigned',
        },
        {
            title: 'In Progress',
            count: counts.in_progress,
            icon: <PlayArrow sx={{ fontSize: 40 }} />,
            color: '#8b5cf6',
            bgColor: '#f5f3ff',
            filter: 'in-progress',
        },
        {
            title: 'Completed',
            count: counts.completed,
            icon: <CheckCircle sx={{ fontSize: 40 }} />,
            color: '#10b981',
            bgColor: '#f0fdf4',
            filter: 'completed',
        },
        {
            title: 'Overdue',
            count: counts.overdue,
            icon: <Warning sx={{ fontSize: 40 }} />,
            color: '#ef4444',
            bgColor: '#fef2f2',
            filter: 'overdue',
        },
    ];

    const handleCardClick = (filter: string) => {
        // Navigate to My Risks page with filter
        navigate(`/my-risks?filter=${filter}`);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
                My Tasks
            </Typography>
            <Grid container spacing={2}>
                {cards.map((card) => (
                    <Grid item xs={12} sm={6} md={3} key={card.title}>
                        <Paper
                            sx={{
                                p: 2.5,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                bgcolor: card.bgColor,
                                border: '1px solid',
                                borderColor: 'transparent',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 3,
                                    borderColor: card.color,
                                },
                            }}
                            onClick={() => handleCardClick(card.filter)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ color: card.color, mr: 1.5 }}>
                                    {card.icon}
                                </Box>
                                <Box>
                                    <Typography variant="h3" fontWeight={700} sx={{ color: card.color }}>
                                        {card.count}
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                {card.title}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
