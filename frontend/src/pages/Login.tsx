import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container,
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    Link as MuiLink,
    Stack,
    InputAdornment,
    IconButton,
} from '@mui/material';
import {
    Email,
    Lock,
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    DarkMode,
    LightMode,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import InteractiveBackground from '../components/InteractiveBackground';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { mode, toggleMode } = useThemeMode();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <InteractiveBackground>
            <Box
                sx={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    zIndex: 10,
                }}
            >
                <IconButton
                    onClick={toggleMode}
                    sx={{
                        bgcolor: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(8px)',
                        color: mode === 'light' ? '#667eea' : '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                            transform: 'translateY(-2px)',
                        }
                    }}
                >
                    {mode === 'light' ? <DarkMode /> : <LightMode />}
                </IconButton>
            </Box>
            <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                <Box className="fade-in">
                    <Paper
                        elevation={0}
                        className="glass"
                        sx={{
                            p: 5,
                            borderRadius: 4,
                            boxShadow: '0 24px 56px rgba(0,0,0,0.4)', // Stronger shadow for contrast
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(23, 23, 23, 0.4)', // Darker, more contrasty glass background
                            backdropFilter: 'blur(24px)',
                        }}
                    >
                        {/* Logo/Header */}
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    margin: '0 auto',
                                    mb: 2,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                                }}
                            >
                                <LoginIcon sx={{ fontSize: 40, color: 'white' }} />
                            </Box>
                            <Typography
                                variant="h4"
                                fontWeight="bold"
                                gutterBottom
                                sx={{
                                    color: 'white',
                                    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                }}
                            >
                                Risk Assessment
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} fontWeight={500}>
                                Sign in to your account
                            </Typography>
                        </Box>

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 3,
                                    borderRadius: 2,
                                    backdropFilter: 'blur(10px)',
                                    bgcolor: 'rgba(211, 47, 47, 0.2)',
                                    color: '#ffcdd2',
                                    border: '1px solid rgba(239, 83, 80, 0.3)',
                                    '& .MuiAlert-icon': { color: '#ef5350' }
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1, ml: 0.5, fontWeight: 500 }}>
                                        Email Address
                                    </Typography>
                                    <TextField
                                        required
                                        fullWidth
                                        id="email"
                                        name="email"
                                        placeholder="Enter your email"
                                        autoComplete="email"
                                        autoFocus
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Email sx={{ color: 'rgba(255,255,255,0.7)' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(0, 0, 0, 0.2)',
                                                backdropFilter: 'blur(10px)',
                                                borderRadius: 2,
                                                color: 'white',
                                                transition: 'all 0.2s',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                },
                                                '&.Mui-focused': {
                                                    bgcolor: 'rgba(0, 0, 0, 0.4)',
                                                    boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.5)',
                                                    borderColor: 'rgba(102, 126, 234, 0.8)',
                                                    '& fieldset': { border: 'none' },
                                                },
                                                '& fieldset': { border: 'none' },
                                                '& .MuiInputBase-input': {
                                                    py: 1.5,
                                                    color: 'white',
                                                    '&:-webkit-autofill': {
                                                        transition: 'background-color 5000s ease-in-out 0s',
                                                        WebkitTextFillColor: 'white !important',
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1, ml: 0.5, fontWeight: 500 }}>
                                        Password
                                    </Typography>
                                    <TextField
                                        required
                                        fullWidth
                                        name="password"
                                        placeholder="Enter your password"
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock sx={{ color: 'rgba(255,255,255,0.7)' }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(0, 0, 0, 0.2)',
                                                backdropFilter: 'blur(10px)',
                                                borderRadius: 2,
                                                color: 'white',
                                                transition: 'all 0.2s',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                },
                                                '&.Mui-focused': {
                                                    bgcolor: 'rgba(0, 0, 0, 0.4)',
                                                    boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.5)',
                                                    borderColor: 'rgba(102, 126, 234, 0.8)',
                                                    '& fieldset': { border: 'none' },
                                                },
                                                '& fieldset': { border: 'none' },
                                                '& .MuiInputBase-input': {
                                                    py: 1.5,
                                                    color: 'white',
                                                    '&:-webkit-autofill': {
                                                        transition: 'background-color 5000s ease-in-out 0s',
                                                        WebkitTextFillColor: 'white !important',
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </Box>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                            boxShadow: '0 12px 32px rgba(102, 126, 234, 0.6)',
                                        }
                                    }}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </Stack>

                            <Box sx={{ mt: 3, textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <MuiLink
                                    component={Link}
                                    to="/register"
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        color: '#90caf9',
                                        display: 'block',
                                        '&:hover': {
                                            color: '#ffffff',
                                        },
                                    }}
                                >
                                    Don't have an account? <span style={{ textDecoration: 'underline' }}>Sign Up</span>
                                </MuiLink>
                            </Box>
                        </Box>
                    </Paper>

                    {/* Footer */}
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            textAlign: 'center',
                            mt: 3,
                            color: 'rgba(255, 255, 255, 0.5)',
                        }}
                    >
                        © 2026 Risk Assessment Platform. All rights reserved.
                    </Typography>
                </Box>
            </Container>
        </InteractiveBackground>
    );
}
