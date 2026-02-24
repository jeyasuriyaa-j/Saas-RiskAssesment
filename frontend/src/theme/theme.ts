import { createTheme, PaletteMode, alpha } from '@mui/material';

// Deep navy/black for dark mode, crisp white/gray for light mode
export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        primary: {
            main: '#7C3AED', // Slightly deeper purple for better visibility
            light: '#A78BFA',
            dark: '#6D28D9',
            contrastText: '#ffffff',
        },
        secondary: {
            main: mode === 'dark' ? '#64748B' : '#334155', // Deeper slate in light mode
            light: '#94A3B8',
            dark: '#1E293B',
            contrastText: '#ffffff',
        },
        success: {
            main: '#059669', // Stronger emerald
            light: '#34D399',
            dark: '#064E3B',
        },
        warning: {
            main: '#D97706', // Stronger amber
            light: '#FBBF24',
            dark: '#78350F',
        },
        error: {
            main: '#DC2626', // Stronger red
            light: '#F87171',
            dark: '#7F1D1D',
        },
        info: {
            main: '#2563EB', // Stronger blue
            light: '#60A5FA',
            dark: '#1E3A8A',
        },
        background: {
            default: mode === 'dark' ? '#020617' : '#F1F5F9', // Slightly cooler/darker light bg for contrast
            paper: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
        },
        text: {
            primary: mode === 'dark' ? '#F8FAFC' : '#0F172A',
            secondary: mode === 'dark' ? '#94A3B8' : '#475569', // Higher contrast secondary text
            disabled: mode === 'dark' ? '#475569' : '#94A3B8',
        },
        divider: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
        action: {
            hover: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)',
            selected: mode === 'dark' ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.08)',
            active: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15, 23, 42, 0.1)',
            focus: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15, 23, 42, 0.12)',
        }
    },
    typography: {
        fontFamily: '"Inter", "Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em' },
        h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
        h5: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' },
        h6: { fontSize: '1rem', fontWeight: 600 },
        body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
        body2: { fontSize: '0.875rem', lineHeight: 1.5 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                        background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderRadius: '4px',
                        '&:hover': { background: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
                    },
                    '*::focus-visible': {
                        outline: `2px solid #7C3AED`,
                        outlineOffset: '2px',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 20px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:focus-visible': {
                        outline: `2px solid #7C3AED`,
                        outlineOffset: '2px',
                    },
                },
                containedPrimary: {
                    background: '#7C3AED',
                    '&:hover': {
                        background: '#6D28D9',
                        transform: 'translateY(-1px)',
                        boxShadow: mode === 'dark' ? '0 0 20px rgba(124, 58, 237, 0.4)' : '0 4px 12px rgba(124, 58, 237, 0.3)',
                    },
                },
                outlined: {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(15, 23, 42, 0.15)',
                    '&:hover': {
                        borderColor: '#7C3AED',
                        backgroundColor: mode === 'dark' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(124, 58, 237, 0.04)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                    boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05), 0 10px 20px -5px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundImage: 'none',
                    '&:hover': {
                        borderColor: alpha('#7C3AED', 0.4),
                        boxShadow: mode === 'dark' ? '0 0 20px rgba(124, 58, 237, 0.1)' : '0 8px 24px rgba(124, 58, 237, 0.08)',
                    }
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? 'rgba(2, 6, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
                    boxShadow: 'none',
                    color: mode === 'dark' ? '#F8FAFC' : '#0F172A',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.02)',
                        transition: 'all 0.2s',
                        '& fieldset': {
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15, 23, 42, 0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15, 23, 42, 0.2)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#7C3AED',
                            borderWidth: '2px',
                        },
                    },
                    '& .MuiInputLabel-root': {
                        color: mode === 'dark' ? '#94A3B8' : '#475569',
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
                    padding: '16px',
                    color: mode === 'dark' ? '#F8FAFC' : '#334155',
                },
                head: {
                    backgroundColor: mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.02)',
                    color: mode === 'dark' ? '#94A3B8' : '#475569',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    transition: 'background-color 0.2s',
                    '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.02)',
                    },
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.08)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '2px 8px',
                    transition: 'all 0.2s',
                    '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.04)',
                    },
                    '&.Mui-selected': {
                        backgroundColor: alpha('#7C3AED', 0.1),
                        color: '#7C3AED',
                        fontWeight: 600,
                        '&:hover': {
                            backgroundColor: alpha('#7C3AED', 0.15),
                        },
                        '& .MuiListItemIcon-root': {
                            color: '#7C3AED',
                        }
                    }
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    backgroundImage: 'none',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 600,
                },
                outlined: {
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(15, 23, 42, 0.1)',
                }
            }
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    fontWeight: 500,
                },
                standardSuccess: {
                    backgroundColor: mode === 'dark' ? 'rgba(6, 78, 59, 0.2)' : 'rgba(209, 250, 229, 0.5)',
                    color: mode === 'dark' ? '#34D399' : '#065F46',
                    border: `1px solid ${alpha('#10B981', 0.2)}`,
                },
                standardError: {
                    backgroundColor: mode === 'dark' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(254, 226, 226, 0.5)',
                    color: mode === 'dark' ? '#F87171' : '#991B1B',
                    border: `1px solid ${alpha('#EF4444', 0.2)}`,
                }
            }
        }
    },
});


// Backward compatibility for static usage if needed, but Context should use getDesignTokens
export const premiumTheme = createTheme(getDesignTokens('dark') as any);

export default premiumTheme;
