import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    formatFn?: (value: number) => string;
    className?: string;
}

export function AnimatedCounter({
    value,
    duration = 1000,
    formatFn = (v) => String(v),
    className = "",
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);
    const animationRef = useRef<number>();

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const current = startValue + (endValue - startValue) * easeOutQuart;
            setDisplayValue(current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    return <span className={className}>{formatFn(Math.round(displayValue))}</span>;
}
