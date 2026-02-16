import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Stack,
    Card,
    CardContent,
    CardActions,
    Divider,
    Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { PersonAdd, Block, CheckCircle, ContentCopy, Delete } from '@mui/icons-material';
import { usersAPI } from '../../services/api';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Predefined departments
const DEPARTMENTS = [
    'IT',
    'Finance',
    'Operations',
    'Sales & Marketing',
    'Human Resources',
    'Legal & Compliance',
    'Warehouse',
    'Customer Support',
    'Research & Development',
    'Executive'
];

export default function Users() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openInviteDialog, setOpenInviteDialog] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', full_name: '', role: 'user', department: '' });
    const [tempPassword, setTempPassword] = useState('');
    const [error, setError] = useState('');

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await usersAPI.list();
            setUsers(response.data.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        try {
            const response = await usersAPI.invite(inviteData);
            setTempPassword(response.data.temporary_password);
            fetchUsers();
            // Don't close dialog yet, show password
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to invite user');
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this user?`)) return;
        try {
            await usersAPI.updateStatus(userId, !currentStatus);
            fetchUsers();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await usersAPI.updateRole(userId, newRole);
            fetchUsers();
        } catch (err) {
            alert('Failed to update role');
        }
    };

    const handleDelete = async (userId: string, userName: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${userName}? This cannot be undone.`)) return;
        try {
            await usersAPI.delete(userId);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(tempPassword);
        alert('Password copied to clipboard');
    };

    const closeDialog = () => {
        setOpenInviteDialog(false);
        setTempPassword('');
        setInviteData({ email: '', full_name: '', role: 'user', department: '' });
        setError('');
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">User Management</Typography>
                {isAdmin && (
                    <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => setOpenInviteDialog(true)}
                    >
                        Invite User
                    </Button>
                )}
            </Box>

            {loading ? (
                <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
            ) : isMobile ? (
                <Stack spacing={2}>
                    {users.map((user) => (
                        <Card key={user.user_id}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">{user.full_name}</Typography>
                                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                    </Box>
                                    <Chip
                                        label={user.is_active ? 'Active' : 'Disabled'}
                                        color={user.is_active ? 'success' : 'default'}
                                        size="small"
                                    />
                                </Box>

                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Department</Typography>
                                        <Chip
                                            label={user.department || user.organization || 'Not Set'}
                                            size="small"
                                            variant="outlined"
                                            color={user.department ? 'primary' : 'default'}
                                            sx={{ mt: 0.5, borderRadius: 1 }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Role</Typography>
                                        {isAdmin ? (
                                            <TextField
                                                select
                                                size="small"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                                                variant="standard"
                                                InputProps={{ disableUnderline: true }}
                                                sx={{ mt: 0.5 }}
                                            >
                                                <MenuItem value="admin">Admin</MenuItem>
                                                <MenuItem value="risk_manager">Risk Manager</MenuItem>
                                                <MenuItem value="auditor">Auditor</MenuItem>
                                                <MenuItem value="viewer">Board Member</MenuItem>
                                                <MenuItem value="user">Risk Owner</MenuItem>
                                            </TextField>
                                        ) : (
                                            <Chip label={user.role} size="small" sx={{ mt: 0.5 }} />
                                        )}
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">Last Login: </Typography>
                                        <Typography variant="caption">{user.last_login ? format(new Date(user.last_login), 'PP p') : 'Never'}</Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                            {isAdmin && (
                                <>
                                    <Divider />
                                    <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                                        <Button
                                            size="small"
                                            color={user.is_active ? 'error' : 'success'}
                                            onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                                            startIcon={user.is_active ? <Block /> : <CheckCircle />}
                                        >
                                            {user.is_active ? 'Disable' : 'Enable'}
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => handleDelete(user.user_id, user.full_name)}
                                            startIcon={<Delete />}
                                        >
                                            Delete
                                        </Button>
                                    </CardActions>
                                </>
                            )}
                        </Card>
                    ))}
                </Stack>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Last Login</TableCell>
                                {isAdmin && <TableCell>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell>
                                        <Typography variant="subtitle2">{user.full_name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.department || user.organization || 'Not Set'}
                                            size="small"
                                            variant="outlined"
                                            color={user.department ? 'primary' : 'default'}
                                            sx={{ borderRadius: 1 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {isAdmin ? (
                                            <TextField
                                                select
                                                size="small"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                                                variant="standard"
                                                InputProps={{ disableUnderline: true }}
                                            >
                                                <MenuItem value="admin">Admin</MenuItem>
                                                <MenuItem value="risk_manager">Risk Manager</MenuItem>
                                                <MenuItem value="auditor">Auditor</MenuItem>
                                                <MenuItem value="viewer">Board Member</MenuItem>
                                                <MenuItem value="user">Risk Owner</MenuItem>
                                            </TextField>
                                        ) : (
                                            <Chip label={user.role} size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.is_active ? 'Active' : 'Disabled'}
                                            color={user.is_active ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {user.last_login ? format(new Date(user.last_login), 'PP p') : 'Never'}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5}>
                                                <IconButton
                                                    size="small"
                                                    color={user.is_active ? 'error' : 'success'}
                                                    onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                                                    title={user.is_active ? "Disable Account" : "Enable Account"}
                                                >
                                                    {user.is_active ? <Block /> : <CheckCircle />}
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(user.user_id, user.full_name)}
                                                    title="Delete User"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openInviteDialog} onClose={tempPassword ? undefined : closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogContent>
                    {tempPassword ? (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Alert severity="success" sx={{ mb: 2 }}>
                                User created successfully!
                            </Alert>
                            <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                                Please copy this temporary password and share it with the user.
                                It will not be shown again.
                            </Typography>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    mt: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    bgcolor: 'rgba(0, 212, 255, 0.05)',
                                    borderColor: 'primary.main',
                                    borderRadius: 2
                                }}
                            >
                                <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 'bold' }}>{tempPassword}</Typography>
                                <IconButton onClick={copyPassword} color="primary"><ContentCopy /></IconButton>
                            </Paper>
                        </Box>
                    ) : (
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            {error && <Alert severity="error">{error}</Alert>}
                            <TextField
                                label="Full Name"
                                fullWidth
                                value={inviteData.full_name}
                                onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                            />
                            <TextField
                                label="Email Address"
                                type="email"
                                fullWidth
                                value={inviteData.email}
                                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                            />
                            <TextField
                                select
                                label="Department"
                                fullWidth
                                value={inviteData.department}
                                onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                            >
                                <MenuItem value="">Select Department</MenuItem>
                                {DEPARTMENTS.map((dept) => (
                                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Role"
                                fullWidth
                                value={inviteData.role}
                                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                            >
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="risk_manager">Risk Manager</MenuItem>
                                <MenuItem value="auditor">Auditor</MenuItem>
                                <MenuItem value="viewer">Board Member</MenuItem>
                                <MenuItem value="user">Risk Owner</MenuItem>
                            </TextField>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    {tempPassword ? (
                        <Button onClick={closeDialog} variant="contained">Done</Button>
                    ) : (
                        <>
                            <Button onClick={closeDialog}>Cancel</Button>
                            <Button onClick={handleInvite} variant="contained">Send Invite</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
