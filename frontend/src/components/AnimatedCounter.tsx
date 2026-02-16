import { useEffect, useState } from 'react';
import { Typography, TypographyProps } from '@mui/material';

interface AnimatedCounterProps extends TypographyProps {
    value: number;
    duration?: number;
    decimals?: number;
}

export default function AnimatedCounter({ value, duration = 1000, decimals = 0, ...props }: AnimatedCounterProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentCount = easeOutQuart * value;

            setCount(currentCount);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [value, duration]);

    return (
        <Typography {...props} className="counter-animate">
            {count.toFixed(decimals)}
        </Typography>
    );
}
