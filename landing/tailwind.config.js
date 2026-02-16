/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#020617", // Deep navy/black
                primary: {
                    DEFAULT: "#8b5cf6", // Purple
                    dark: "#6d28d9",
                    light: "#a78bfa",
                },
                secondary: {
                    DEFAULT: "#3b82f6", // Blue
                    dark: "#1d4ed8",
                    light: "#60a5fa",
                },
                accent: {
                    DEFAULT: "#c084fc",
                    glow: "rgba(139, 92, 246, 0.3)",
                },
                enterprise: {
                    bg: "#020617",
                    card: "rgba(15, 23, 42, 0.6)",
                    border: "rgba(30, 41, 59, 0.5)",
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15), transparent 70%)',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 1s ease-out forwards',
                'slide-up': 'slideUp 0.8s ease-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
