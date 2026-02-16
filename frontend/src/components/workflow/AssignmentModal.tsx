
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Stack,
    Typography,
    Avatar,
    Chip
} from '@mui/material';

// Mock API for departments/users until explicit endpoint exists
// In real app, we fetch users by department
const MOCK_USERS = [
    { user_id: 'u1', full_name: 'Alice Johnson', department: 'IT' },
    { user_id: 'u2', full_name: 'Bob Smith', department: 'IT' },
    { user_id: 'u3', full_name: 'Charlie Brown', department: 'Finance' },
];

interface AssignmentModalProps {
    open: boolean;
    onClose: () => void;
    riskTitle: string;
    onAssign: (userId: string, dueDate: string) => Promise<void>;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
    open,
    onClose,
    riskTitle,
    onAssign
}) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedUser) return;
        setLoading(true);
        try {
            await onAssign(selectedUser, dueDate);
            onClose();
        } catch (error) {
            console.error('Assignment failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ className: 'glass-card' }}>
            <DialogTitle>Assign Risk</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                        Assigning: <strong>{riskTitle}</strong>
                    </Typography>

                    <TextField
                        select
                        label="Assign To"
                        fullWidth
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                    >
                        {MOCK_USERS.map((user) => (
                            <MenuItem key={user.user_id} value={user.user_id}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                                        {user.full_name[0]}
                                    </Avatar>
                                    <span>{user.full_name}</span>
                                    <Chip label={user.department} size="small" variant="outlined" sx={{ height: 20 }} />
                                </Stack>
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        type="date"
                        label="Due Date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} className="btn-secondary">Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!selectedUser || loading}
                    className="btn-primary"
                >
                    {loading ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
