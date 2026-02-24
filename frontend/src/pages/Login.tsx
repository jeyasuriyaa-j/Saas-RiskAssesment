import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
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
    const theme = useTheme();
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
        <InteractiveBackground disableScroll>
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
                        bgcolor: 'background.paper',
                        backdropFilter: 'blur(8px)',
                        color: 'primary.main',
                        boxShadow: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'background.paper',
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
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
                        sx={{
                            p: { xs: 2.5, sm: 3.5 },
                            borderRadius: 4,
                            boxShadow: mode === 'dark' ? '0 24px 56px rgba(0,0,0,0.4)' : '0 24px 56px rgba(15, 23, 42, 0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                            background: mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : alpha('#FFFFFF', 0.9),
                            backdropFilter: 'blur(24px)',
                        }}
                    >
                        {/* Logo/Header */}
                        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    margin: '0 auto',
                                    mb: 1.5,
                                    background: mode === 'dark'
                                        ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
                                        : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
                                }}
                            >
                                <LoginIcon sx={{ fontSize: 32, color: 'white' }} />
                            </Box>
                            <Typography
                                variant="h4"
                                fontWeight="bold"
                                gutterBottom
                                sx={{
                                    color: 'text.primary',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                Risk Assessment
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }} fontWeight={600}>
                                Sign in to your account
                            </Typography>
                        </Box>

                        {error && (
                            <Alert
                                severity="error"
                                sx={{ mb: 3 }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'text.primary', mb: 1, ml: 0.5, fontWeight: 700 }}>
                                        Email Address
                                    </Typography>
                                    <TextField
                                        required
                                        fullWidth
                                        id="email"
                                        name="email"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                        autoFocus
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Email sx={{ color: 'text.secondary', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'text.primary', mb: 1, ml: 0.5, fontWeight: 700 }}>
                                        Password
                                    </Typography>
                                    <TextField
                                        required
                                        fullWidth
                                        name="password"
                                        placeholder="••••••••"
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock sx={{ color: 'text.secondary', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                        sx={{ color: 'text.secondary' }}
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
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
                                        py: 1.25,
                                        fontSize: '1rem',
                                        fontWeight: 700,
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
                                            color: 'text.secondary',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': {
                                                color: 'primary.main',
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
                                            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.03)',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            animation: 'slideIn 0.3s ease-out'
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block', fontWeight: 600 }}>
                                            Enter your company subdomain:
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <TextField
                                                size="small"
                                                placeholder="my-company"
                                                value={subdomain}
                                                onChange={(e) => setSubdomain(e.target.value)}
                                                sx={{ flex: 1 }}
                                            />
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleSsoSubmit}
                                                sx={{ px: 2 }}
                                            >
                                                Go
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Stack>

                            <Box sx={{ mt: 2.5, textAlign: 'center', p: 1, borderRadius: 2, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.03)' }}>
                                <MuiLink
                                    component={Link}
                                    to="/register"
                                    variant="body2"
                                    sx={{
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        color: 'primary.main',
                                        display: 'block',
                                        '&:hover': {
                                            color: 'primary.dark',
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
                            mt: 2,
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
