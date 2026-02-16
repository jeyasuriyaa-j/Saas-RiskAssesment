import { createTheme, PaletteMode } from '@mui/material';

// Deep navy/black for dark mode, crisp white/gray for light mode
export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        primary: {
            main: '#8B5CF6', // Vivid Purple
            light: '#A78BFA',
            dark: '#7C3AED',
            contrastText: '#ffffff',
        },
        secondary: {
            main: mode === 'dark' ? '#64748B' : '#475569', // Slate
            light: '#94A3B8',
            dark: '#334155',
            contrastText: '#ffffff',
        },
        success: {
            main: '#10B981', // Emerald
            light: '#34D399',
            dark: '#059669',
        },
        warning: {
            main: '#F59E0B', // Amber
            light: '#FBBF24',
            dark: '#D97706',
        },
        error: {
            main: '#EF4444', // Red
            light: '#F87171',
            dark: '#DC2626',
        },
        info: {
            main: '#3B82F6', // Blue
            light: '#60A5FA',
            dark: '#2563EB',
        },
        background: {
            default: mode === 'dark' ? '#020617' : '#F8FAFC', // Deep navy vs Slate-50
            paper: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF', // Glassmorphism vs White
            glass: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        },
        text: {
            primary: mode === 'dark' ? '#EDEDED' : '#0F172A',
            secondary: mode === 'dark' ? '#A1A1AA' : '#64748B',
            disabled: mode === 'dark' ? '#52525B' : '#94A3B8',
        },
        divider: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        action: {
            hover: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            selected: mode === 'dark' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
        }
    },
    typography: {
        fontFamily: '"Inter", "Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: mode === 'dark' ? '#fff' : '#0f172a' },
        h2: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', color: mode === 'dark' ? '#fff' : '#0f172a' },
        h3: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em', color: mode === 'dark' ? '#fff' : '#0f172a' },
        h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', color: mode === 'dark' ? '#fff' : '#0f172a' },
        h5: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', color: mode === 'dark' ? '#fff' : '#0f172a' },
        h6: { fontSize: '1rem', fontWeight: 600, color: mode === 'dark' ? '#fff' : '#0f172a' },
        body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
        body2: { fontSize: '0.875rem', lineHeight: 1.5 },
        button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: (mode === 'dark' ? [
        'none',
        '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
        'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'
    ] : [
        'none',
        '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
        'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'
    ]) as any,
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: mode === 'dark' ? '#020617' : '#F8FAFC',
                    color: mode === 'dark' ? '#EDEDED' : '#0F172A',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    boxShadow: 'none',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 'none',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(90deg, #6d28d9, #8b5cf6)',
                    color: '#ffffff',
                    '&:hover': {
                        background: 'linear-gradient(90deg, #5b21b6, #7c3aed)',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                        transform: 'translateY(-2px)',
                    },
                },
                outlined: {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: mode === 'dark' ? '#EDEDED' : '#0F172A',
                    '&:hover': {
                        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(30, 41, 59, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
                    backgroundImage: 'none',
                    boxShadow: mode === 'dark' ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)',
                    }
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
                    backgroundImage: 'none',
                    border: mode === 'dark' ? '1px solid rgba(30, 41, 59, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: mode === 'dark' ? '1px solid rgba(30, 41, 59, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
                    boxShadow: 'none',
                    color: mode === 'dark' ? '#fff' : '#0f172a',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'dark' ? '#020617' : '#F8FAFC',
                    borderRight: mode === 'dark' ? '1px solid rgba(30, 41, 59, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
                        '& fieldset': {
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#8B5CF6',
                            borderWidth: '1px',
                        },
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    padding: '16px',
                    color: mode === 'dark' ? '#EDEDED' : '#334155',
                },
                head: {
                    backgroundColor: 'transparent',
                    color: mode === 'dark' ? '#A1A1AA' : '#64748B',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    },
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    border: mode === 'dark' ? '1px solid rgba(30, 41, 59, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        }
                    }
                }
            }
        }
    },
});


// Backward compatibility for static usage if needed, but Context should use getDesignTokens
export const premiumTheme = createTheme(getDesignTokens('dark') as any);

export default premiumTheme;
