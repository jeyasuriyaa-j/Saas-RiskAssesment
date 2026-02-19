import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getDesignTokens } from '../theme/theme';

interface ThemeModeContextType {
    mode: 'light' | 'dark';
    toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType>({
    mode: 'light',
    toggleMode: () => { },
});

export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('themeMode');
        return (saved as 'light' | 'dark') || 'light';
    });

    useEffect(() => {
        localStorage.setItem('themeMode', mode);
        document.body.setAttribute('data-theme', mode);
    }, [mode]);

    const toggleMode = () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    };

    const theme = useMemo(
        () => createTheme(getDesignTokens(mode) as any),
        [mode]
    );

    return (
        <ThemeModeContext.Provider value={{ mode, toggleMode }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}
