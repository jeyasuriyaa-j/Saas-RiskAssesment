import { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Button,
    Stack,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    IconButton,
    Box,
    Container,
} from '@mui/material';
import {
    Smartphone,
    Copy,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SecuritySettings() {
    const { setupMFA, confirmMFASetup } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // MFA Setup State
    const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
    const [mfaData, setMfaData] = useState({ qrCodeUrl: '', secret: '' });
    const [otpCode, setOtpCode] = useState('');

    useEffect(() => {
        // In a real app, fetch current user security status
        // For now, we'll assume we can setup it
    }, []);

    const handleSetupMFA = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await setupMFA();
            setMfaData(data);
            setMfaDialogOpen(true);
        } catch (err: any) {
            setError('Failed to initialize MFA setup');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmMFA = async () => {
        setLoading(true);
        setError('');
        try {
            await confirmMFASetup(otpCode);
            setMfaDialogOpen(false);
            setSuccess('MFA enabled successfully!');
        } catch (err: any) {
            setError('Invalid OTP code. Please try again.');
        } finally {
            setLoading(false);
        }
    };



    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="bold">Security Settings</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            <Stack spacing={3}>
                {/* MFA Section */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(102, 126, 234, 0.1)',
                            color: 'primary.main',
                            mr: 2
                        }}>
                            <Smartphone size={24} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight="bold">Two-Factor Authentication (TOTP)</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Add an extra layer of security to your account by requiring a code from your authenticator app.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSetupMFA}
                            disabled={loading}
                        >
                            Setup MFA
                        </Button>
                    </Box>
                </Paper>


            </Stack>

            {/* MFA Setup Dialog */}
            <Dialog
                open={mfaDialogOpen}
                onClose={() => setMfaDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle fontWeight="bold">Setup Two-Factor Authentication</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        1. Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
                    </Typography>

                    <Box sx={{
                        textAlign: 'center',
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        mb: 2
                    }}>
                        {mfaData.qrCodeUrl ? (
                            <img src={mfaData.qrCodeUrl} alt="MFA QR Code" style={{ width: 200, height: 200 }} />
                        ) : (
                            <CircularProgress />
                        )}
                    </Box>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                        2. If you cannot scan the code, enter this secret manually:
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: 'rgba(0,0,0,0.05)',
                        borderRadius: 1,
                        mb: 3
                    }}>
                        <Typography component="span" sx={{ flex: 1, fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {mfaData.secret}
                        </Typography>
                        <IconButton size="small" onClick={() => copyToClipboard(mfaData.secret)}>
                            <Copy size={16} />
                        </IconButton>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                        3. Enter the 6-digit code to confirm:
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value)}
                        inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3rem' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setMfaDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmMFA}
                        disabled={otpCode.length !== 6 || loading}
                    >
                        Confirm Setup
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
