import { useState, useEffect, useRef } from 'react';
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    CircularProgress,
    Tooltip,
    alpha,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle,
    Circle,
} from '@mui/icons-material';
import { notificationsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
    notification_id: string;
    message: string;
    read: boolean;
    created_at: string;
    risk_id?: string;
    risk_code?: string;
    risk_statement?: string;
    type?: string;
}

export default function NotificationBell() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const open = Boolean(anchorEl);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const response = await notificationsAPI.list();
            setNotifications(response.data.notifications || []);

            const countResponse = await notificationsAPI.getUnreadCount();
            setUnreadCount(countResponse.data.count || 0);
        } catch (error: any) {
            console.error('Failed to fetch notifications:', error);
            // If we get a 401 (e.g. token expired), stop polling to avoid logs clutter
            if (error.response?.status === 401 && intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!user) return;
        setAnchorEl(event.currentTarget);
        if (!loading && notifications.length === 0) {
            setLoading(true);
            fetchNotifications().finally(() => setLoading(false));
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.read) {
            try {
                await notificationsAPI.markAsRead(notification.notification_id);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev =>
                    prev.map(n =>
                        n.notification_id === notification.notification_id
                            ? { ...n, read: true }
                            : n
                    )
                );
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }

        // Navigate to risk if available
        if (notification.risk_id) {
            navigate(`/risks/${notification.risk_id}`);
            handleClose();
        } else if (notification.risk_code) {
            navigate(`/risks/${notification.risk_code}`);
            handleClose();
        }
    };

    useEffect(() => {
        if (user) {
            // Initial fetch
            fetchNotifications();

            // Poll every 30 seconds
            intervalRef.current = setInterval(fetchNotifications, 30000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user]);

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    onClick={handleClick}
                    sx={{
                        color: 'inherit',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    <Badge badgeContent={unreadCount} color="error">
                        <NotificationsIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: 380,
                        maxHeight: 500,
                        mt: 1,
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={600}>
                        Notifications
                    </Typography>
                    {unreadCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {unreadCount} unread
                        </Typography>
                    )}
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No notifications yet
                        </Typography>
                    </Box>
                ) : (
                    notifications.map((notification, index) => (
                        <Box key={notification.notification_id}>
                            {index > 0 && <Divider />}
                            <MenuItem
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    alignItems: 'flex-start',
                                    bgcolor: notification.read
                                        ? 'transparent'
                                        : alpha('#6366f1', 0.05),
                                    '&:hover': {
                                        bgcolor: notification.read
                                            ? 'action.hover'
                                            : alpha('#6366f1', 0.1),
                                    },
                                }}
                            >
                                <Box sx={{ mr: 1.5, mt: 0.5 }}>
                                    {notification.read ? (
                                        <CheckCircle
                                            sx={{ fontSize: 16, color: 'text.disabled' }}
                                        />
                                    ) : (
                                        <Circle
                                            sx={{ fontSize: 12, color: 'primary.main' }}
                                        />
                                    )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: notification.read ? 400 : 600,
                                            mb: 0.5,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {notification.message}
                                    </Typography>
                                    {notification.risk_code && (
                                        <Typography
                                            variant="caption"
                                            color="primary"
                                            sx={{ fontWeight: 500 }}
                                        >
                                            {notification.risk_code}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        </Box>
                    ))
                )}
            </Menu>
        </>
    );
}
