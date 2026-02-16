import { useNavigate, useLocation } from 'react-router-dom';
import {
    Paper,
    BottomNavigation,
    BottomNavigationAction,
    Box,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Warning as RiskIcon,
    Assignment as IncidentIcon,
    Person as ProfileIcon,
} from '@mui/icons-material';

export default function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!isMobile) return null;

    const getValue = () => {
        const path = location.pathname;
        if (path.includes('dashboard')) return 0;
        if (path.includes('risks')) return 1;
        if (path.includes('incidents')) return 2;
        if (path.includes('profile')) return 3;
        return 0;
    };

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: theme.zIndex.appBar,
                display: { xs: 'block', sm: 'none' },
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                background: theme.palette.mode === 'dark'
                    ? 'rgba(30, 30, 30, 0.8)'
                    : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
            }}
            elevation={3}
        >
            <BottomNavigation
                showLabels
                value={getValue()}
                onChange={(_, newValue) => {
                    switch (newValue) {
                        case 0: navigate('/dashboard'); break;
                        case 1: navigate('/risks'); break;
                        case 2: navigate('/incidents'); break;
                        case 3: navigate('/profile'); break;
                    }
                }}
                sx={{
                    bgcolor: 'transparent',
                    height: 64,
                    '& .MuiBottomNavigationAction-root': {
                        color: 'text.secondary',
                        '&.Mui-selected': {
                            color: 'primary.main',
                        }
                    }
                }}
            >
                <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
                <BottomNavigationAction label="Risks" icon={<RiskIcon />} />
                <BottomNavigationAction label="Incidents" icon={<IncidentIcon />} />
                <BottomNavigationAction label="Profile" icon={<ProfileIcon />} />
            </BottomNavigation>
            {/* Safe area spacer for modern mobile browsers */}
            <Box sx={{ height: 'env(safe-area-inset-bottom)', bgcolor: 'transparent' }} />
        </Paper>
    );
}
