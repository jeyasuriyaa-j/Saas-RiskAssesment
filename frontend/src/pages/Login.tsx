import { useState } from 'react';
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
    Business as BusinessIcon,
    VpnKey as VpnKeyIcon,
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    DarkMode,
    LightMode,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import InteractiveBackground from '../components/InteractiveBackground';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';

export default function Login() {
    const navigate = useNavigate();
    const { login, initSSO, verifyMFA } = useAuth();
    const [email, setEmail] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [showSsoDialog, setShowSsoDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mfaModal, setMfaModal] = useState({ open: false, token: '', code: '' });

    const { mode, toggleMode } = useThemeMode();

    const handleLoginResponse = (res: { mfa_required?: boolean; mfa_token?: string }) => {
        if (res.mfa_required && res.mfa_token) {
            setMfaModal({ open: true, token: res.mfa_token, code: '' });
            return true;
        }
        navigate('/dashboard');
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await login(email, password);
            handleLoginResponse(res);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };



    const handleMfaSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            await verifyMFA(mfaModal.token, mfaModal.code);
            setMfaModal({ ...mfaModal, open: false });
            navigate('/dashboard');
        } catch (err: any) {
            setError('Invalid MFA code');
        } finally {
            setLoading(false);
        }
    };

    const handleSsoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subdomain) return;
        setLoading(true);
        try {
            const ssoUrl = await initSSO(subdomain);
            window.location.href = ssoUrl;
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'SSO initialization failed');
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



                                <Box sx={{ textAlign: 'center' }}>
                                    <Button
                                        variant="text"
                                        startIcon={<BusinessIcon />}
                                        onClick={() => setShowSsoDialog(!showSsoDialog)}
                                        sx={{
                                            color: 'rgba(255,255,255,0.6)',
                                            textTransform: 'none',
                                            fontSize: '0.8rem',
                                            '&:hover': {
                                                color: 'white',
                                                bgcolor: 'transparent'
                                            }
                                        }}
                                    >
                                        Enterprise SSO
                                    </Button>
                                </Box>

                                {showSsoDialog && (
                                    <Box
                                        component="div"
                                        sx={{
                                            mt: 1,
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            animation: 'slideIn 0.3s ease-out'
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, display: 'block' }}>
                                            Enter your company subdomain:
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <TextField
                                                size="small"
                                                placeholder="my-company"
                                                value={subdomain}
                                                onChange={(e) => setSubdomain(e.target.value)}
                                                sx={{
                                                    flex: 1,
                                                    '& .MuiOutlinedInput-root': {
                                                        color: 'white',
                                                        fontSize: '0.875rem',
                                                        bgcolor: 'rgba(0,0,0,0.2)',
                                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                                                    }
                                                }}
                                            />
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleSsoSubmit}
                                                sx={{ px: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                                            >
                                                Go
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
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

            {/* MFA Verification Dialog */}
            <Dialog
                open={mfaModal.open}
                onClose={() => setMfaModal({ ...mfaModal, open: false })}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(23, 23, 23, 0.95)',
                        backdropFilter: 'blur(16px)',
                        color: 'white',
                        borderRadius: 3,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        p: 2
                    }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Multi-Factor Authentication
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <VpnKeyIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
                        <Typography variant="body1" gutterBottom>
                            Enter the 6-digit code from your authenticator app
                        </Typography>
                    </Box>
                    <TextField
                        fullWidth
                        autoFocus
                        placeholder="000000"
                        value={mfaModal.code}
                        onChange={(e) => setMfaModal({ ...mfaModal, code: e.target.value })}
                        inputProps={{
                            maxLength: 6,
                            style: { textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5rem', fontWeight: 'bold' }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleMfaSubmit}
                        disabled={mfaModal.code.length !== 6 || loading}
                        sx={{
                            py: 1.5,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Sign In'}
                    </Button>
                </DialogActions>
            </Dialog>
        </InteractiveBackground>
    );
}
