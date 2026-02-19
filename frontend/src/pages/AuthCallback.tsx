import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshConfig } = useAuth();
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;

        const params = new URLSearchParams(location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const userData = params.get('user');

        if (accessToken && refreshToken && userData) {
            try {
                sessionStorage.setItem('access_token', accessToken);
                sessionStorage.setItem('refresh_token', refreshToken);
                sessionStorage.setItem('user', userData);

                // We use window.location here to force a full reload and context reset
                // or we can manually update context if we expose a setUser method.
                // For now, let's refresh config and then go to dashboard.
                refreshConfig().then(() => {
                    navigate('/dashboard', { replace: true });
                });
                processedRef.current = true;
            } catch (error) {
                console.error('Error processing auth callback:', error);
                navigate('/login?error=Session initialization failed');
            }
        } else {
            console.error('Missing auth parameters');
            navigate('/login?error=Authentication failed');
        }
    }, [location, navigate, refreshConfig]);

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#0f172a'
            }}
        >
            <CircularProgress size={60} thickness={4} sx={{ mb: 4, color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 500 }}>
                Finishing Secure Login...
            </Typography>
        </Box>
    );
};

export default AuthCallback;
