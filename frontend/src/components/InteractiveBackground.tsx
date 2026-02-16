import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useThemeMode } from '../contexts/ThemeModeContext';

const InteractiveBackground = ({ children }: { children: React.ReactNode }) => {
    const interactiveRef = useRef<HTMLDivElement>(null);
    const { mode } = useThemeMode();

    useEffect(() => {
        let curX = 0;
        let curY = 0;
        let tgX = 0;
        let tgY = 0;

        const handleMouseMove = (event: MouseEvent) => {
            tgX = event.clientX;
            tgY = event.clientY;
        };

        const animate = () => {
            curX += (tgX - curX) / 20;
            curY += (tgY - curY) / 20;

            if (interactiveRef.current) {
                interactiveRef.current.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
            }
            requestAnimationFrame(animate);
        };

        window.addEventListener('mousemove', handleMouseMove);
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Gradients matching Layout.tsx sidebar but lighter for background
    const backgroundGradient = mode === 'light'
        ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' // Slightly cooler/darker grey for better contrast
        : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)';

    const cursorGradient = mode === 'light'
        ? 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)' // Indigo hint for cursor
        : 'radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(59, 130, 246, 0) 70%)';

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                background: backgroundGradient,
                transition: 'background 0.5s ease',
            }}
        >
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    filter: 'blur(80px)',
                    zIndex: 0,
                    pointerEvents: 'none',
                    opacity: mode === 'light' ? 1 : 0.8, // Full opacity for container in light mode
                }}
            >
                {/* Static ambient blobs - adjusted for harmony with new background */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '-10%',
                        left: '-10%',
                        width: '50vw',
                        height: '50vw',
                        background: mode === 'light' ? '#cbd5e1' : '#4c1d95', // Slate 300 (Visible Grey)
                        borderRadius: '50%',
                        opacity: mode === 'light' ? 0.6 : 0.5,
                        animation: 'float 20s infinite alternate',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: '-10%',
                        right: '-10%',
                        width: '60vw',
                        height: '60vw',
                        background: mode === 'light' ? '#94a3b8' : '#1d4ed8', // Slate 400 (Darker Grey)
                        borderRadius: '50%',
                        opacity: mode === 'light' ? 0.4 : 0.4,
                        animation: 'float 25s infinite alternate-reverse',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: '20%',
                        right: '20%',
                        width: '30vw',
                        height: '30vw',
                        background: mode === 'light' ? '#bfdbfe' : '#06b6d4', // Pale Blue (Subtle Color)
                        borderRadius: '50%',
                        opacity: mode === 'light' ? 0.5 : 0.3,
                        animation: 'pulse 15s infinite',
                    }}
                />

                {/* Interactive cursor blob */}
                <Box
                    ref={interactiveRef}
                    sx={{
                        position: 'absolute', // Fixed position logic in JS, simplified here
                        top: -250,
                        left: -250,
                        width: 500,
                        height: 500,
                        background: cursorGradient,
                        borderRadius: '50%',
                        opacity: 0.8,
                        pointerEvents: 'none',
                        mixBlendMode: mode === 'light' ? 'multiply' : 'screen',
                    }}
                />
            </Box>

            {/* Grain overlay */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    opacity: 0.1,
                    zIndex: 1,
                    pointerEvents: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                }}
            />

            {/* Content */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                }}
            >
                {children}
            </Box>

            <style>
                {`
                @keyframes float {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    100% { transform: translate(50px, 50px) rotate(10deg); }
                }
                 @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.1); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 0.3; }
                }
                `}
            </style>
        </Box>
    );
};

export default InteractiveBackground;
