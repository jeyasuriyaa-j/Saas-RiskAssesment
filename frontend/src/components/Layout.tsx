import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Toolbar,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    Tooltip,
    useTheme,
    alpha,
    Typography,
    Stack,
    Paper,
    Fade,
    Drawer as MuiDrawer
} from '@mui/material';
import {
    LayoutDashboard,
    ClipboardList,
    Shield,
    AlertTriangle,
    BarChart3,
    Upload,
    Users as UsersIcon,
    Brain,
    Settings as SettingsIcon,
    CheckSquare,
    LogOut,
    Menu as MenuIcon,
    Moon,
    Sun,
    ChevronRight,
    Shield as ShieldLogo
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import ChatWidget from './ChatWidget';
import NotificationBell from './NotificationBell';
import MobileBottomNav from './MobileBottomNav';
import { usePushNotifications } from '../hooks/usePushNotifications';

const SIDEBAR_WIDTH = 280;

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { mode, toggleMode } = useThemeMode();
    const theme = useTheme();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // Initialize push notifications
    usePushNotifications();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('import_job_id');
        sessionStorage.removeItem('import_active_step');
        logout();
        navigate('/login');
    };

    const getMenuItems = () => {
        const role = user?.role?.toLowerCase();

        const items = [
            { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', roles: ['admin', 'risk_manager', 'auditor', 'viewer', 'user'] },
            { text: 'Risk Register', icon: <ClipboardList size={20} />, path: '/risks', roles: ['admin', 'risk_manager', 'auditor', 'viewer'] },
            { text: 'My Risks', icon: <CheckSquare size={20} />, path: '/my-risks', roles: ['user', 'admin', 'risk_manager', 'auditor', 'viewer'] },
            { text: 'Controls', icon: <Shield size={20} />, path: '/controls', roles: ['admin', 'risk_manager', 'auditor'] },
            { text: 'Incidents', icon: <AlertTriangle size={20} />, path: '/incidents', roles: ['admin', 'risk_manager', 'auditor', 'user', 'viewer'] },
            { text: 'Executive Board', icon: <BarChart3 size={20} />, path: '/governance/report', roles: ['admin', 'risk_manager', 'auditor', 'viewer'] },
            { text: 'Import Excel', icon: <Upload size={20} />, path: '/import', roles: ['admin', 'risk_manager'] },
            { text: 'AI Analysis', icon: <Brain size={20} />, path: '/governance', roles: ['admin', 'risk_manager'] },
            { text: 'Users', icon: <UsersIcon size={20} />, path: '/admin/users', roles: ['admin'] },
            { text: 'Settings', icon: <SettingsIcon size={20} />, path: '/admin/settings', roles: ['admin'] },
        ];

        return items.filter(item => !item.roles || item.roles.includes(role || ''));
    };

    const menuItems = getMenuItems();

    const isActive = (path: string) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname === path;
    };

    const drawerContent = (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Glow */}
            <Box sx={{
                position: 'absolute',
                top: -100,
                left: -100,
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                filter: 'blur(40px)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            {/* Logo Section */}
            <Box sx={{
                p: 3,
                pb: 1,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                zIndex: 1
            }}>
                <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                    mr: 2,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)'
                    }} />
                    <ShieldLogo size={26} color="white" strokeWidth={2.5} />
                </Box>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{
                        background: mode === 'dark'
                            ? 'linear-gradient(to right, #fff, #94a3b8)'
                            : `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em'
                    }}>
                        SWOT RISK
                    </Typography>
                    <Typography variant="caption" sx={{
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        color: mode === 'dark' ? 'text.secondary' : 'primary.main',
                        textTransform: 'uppercase',
                        fontSize: '0.65rem',
                        display: 'block',
                        pl: 0.5,
                        opacity: mode === 'dark' ? 1 : 0.8
                    }}>
                        Enterprise Edition
                    </Typography>
                </Box>
            </Box>

            {/* Navigation Section */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                px: 2,
                py: 2,
                zIndex: 1,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <List sx={{ pt: 1 }}>
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    onClick={() => navigate(item.path)}
                                    selected={active}
                                    sx={{
                                        borderRadius: 3,
                                        py: 1.5,
                                        px: 2,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&.Mui-selected': {
                                            background: mode === 'dark'
                                                ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)}, transparent)`
                                                : `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
                                            borderLeft: `3px solid ${theme.palette.primary.main}`,
                                            '&:hover': {
                                                background: mode === 'dark'
                                                    ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.25)}, transparent)`
                                                    : `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)}, transparent)`,
                                            }
                                        },
                                        '&:not(.Mui-selected):hover': {
                                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                                            transform: 'translateX(4px)'
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{
                                        minWidth: 42,
                                        color: active ? 'primary.main' : 'text.secondary',
                                        transition: 'color 0.3s'
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            variant: 'body2',
                                            fontWeight: active ? 700 : 500,
                                            fontSize: '0.95rem',
                                            color: 'text.primary'
                                        }}
                                    />
                                    {active && (
                                        <Fade in>
                                            <Box sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                bgcolor: 'primary.main',
                                                boxShadow: `0 0 10px ${theme.palette.primary.main}`
                                            }} />
                                        </Fade>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            {/* Profile Card Fixed at Bottom */}
            <Box sx={{ p: 2, zIndex: 1 }}>
                <Paper
                    elevation={0}
                    onClick={handleMenuOpen}
                    sx={{
                        p: 1.5,
                        borderRadius: 3,
                        cursor: 'pointer',
                        background: alpha(theme.palette.background.paper, 0.6),
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)',
                            borderColor: theme.palette.primary.main
                        }
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{
                            width: 36,
                            height: 36,
                            bgcolor: 'primary.main',
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                            border: `2px solid ${theme.palette.background.paper}`,
                            fontSize: '0.9rem',
                            fontWeight: 700
                        }}>
                            {user?.full_name?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ color: 'text.primary' }}>
                                {user?.full_name || 'User'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                {user?.role?.replace('_', ' ') || 'Risk Manager'}
                            </Typography>
                        </Box>
                        <ChevronRight size={18} color={theme.palette.text.secondary} />
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Desktop Floating Sidebar */}
            <Box
                component="nav"
                sx={{
                    width: { sm: SIDEBAR_WIDTH },
                    flexShrink: { sm: 0 },
                    display: { xs: 'none', sm: 'block' },
                    p: 2,
                    height: '100vh',
                    position: 'fixed'
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        height: '100%',
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.8 : 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: mode === 'dark'
                            ? '0 20px 40px rgba(0,0,0,0.4)'
                            : '0 20px 40px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}
                >
                    {drawerContent}
                </Paper>
            </Box>

            {/* Mobile Drawer (Standard) */}
            <Box component="nav">
                <Toolbar sx={{ display: { sm: 'none' } }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
                <MuiDrawer // Alias needed if imported as Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: SIDEBAR_WIDTH,
                            border: 'none',
                            bgcolor: 'background.paper'
                        },
                    }}
                >
                    {drawerContent}
                </MuiDrawer>
            </Box>

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${SIDEBAR_WIDTH}px)` },
                    ml: { sm: `${SIDEBAR_WIDTH}px` },
                    minHeight: '100vh',
                    pb: { xs: 10, sm: 2 } // Space for MobileBottomNav
                }}
            >
                {/* Floating Top Pill */}
                <Box sx={{
                    position: 'sticky',
                    top: 24,
                    right: 24,
                    zIndex: 1100,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mb: 4,
                    px: 3 // Add some padding to the row to ensure it doesn't touch edge if window small
                }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1,
                            px: 2,
                            borderRadius: 50, // Pill shape
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: isScrolled ? alpha(theme.palette.background.paper, 0.8) : 'transparent',
                            backdropFilter: isScrolled ? 'blur(12px)' : 'none',
                            border: isScrolled ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                            boxShadow: isScrolled ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Tooltip title={mode === 'dark' ? "Light Mode" : "Dark Mode"}>
                                <IconButton onClick={toggleMode} size="small" sx={{
                                    bgcolor: alpha(theme.palette.action.active, 0.05),
                                    '&:hover': { bgcolor: alpha(theme.palette.action.active, 0.1) }
                                }}>
                                    {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                                </IconButton>
                            </Tooltip>
                            <NotificationBell />
                        </Stack>
                    </Paper>
                </Box>

                {/* Content */}
                <Box sx={{ mt: 2, px: 1 }}>
                    <Outlet />
                </Box>
            </Box>

            <ChatWidget />

            {/* User Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        mt: 1.5,
                        minWidth: 220,
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
                        backdropFilter: 'blur(12px)',
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                    },
                }}
                transformOrigin={{ horizontal: 'center', vertical: 'bottom' }} // Changed for floating sidebar
                anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            >
                <MenuItem onClick={() => navigate('/security')} sx={{ py: 1.5, px: 2.5, mx: 1, borderRadius: 1.5, mb: 0.5 }}>
                    <ListItemIcon>
                        <Shield size={18} />
                    </ListItemIcon>
                    <Typography variant="body2" fontWeight={600}>Security</Typography>
                </MenuItem>
                {user?.role?.toLowerCase() === 'admin' && (
                    <MenuItem onClick={() => navigate('/admin/settings')} sx={{ py: 1.5, px: 2.5, mx: 1, borderRadius: 1.5, mb: 0.5 }}>
                        <ListItemIcon>
                            <SettingsIcon size={18} />
                        </ListItemIcon>
                        <Typography variant="body2" fontWeight={600}>Settings</Typography>
                    </MenuItem>
                )}
                <Divider sx={{ my: 0.5, opacity: 0.1 }} />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main', py: 1.5, px: 2.5, mx: 1, borderRadius: 1.5, mt: 0.5 }}>
                    <ListItemIcon sx={{ color: 'error.main' }}>
                        <LogOut size={18} />
                    </ListItemIcon>
                    <Typography variant="body2" fontWeight={600}>Logout</Typography>
                </MenuItem>
            </Menu>

            <MobileBottomNav />
        </Box >
    );
}

