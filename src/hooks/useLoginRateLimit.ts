import { useState, useEffect, useCallback } from "react";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "login_rate_limit";

interface RateLimitData {
    failedAttempts: number;
    lockoutUntil: number | null;
}

/**
 * Hook to handle login rate limiting
 * Blocks login for 5 minutes after 5 failed attempts
 */
export function useLoginRateLimit() {
    const [isLocked, setIsLocked] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);

    // Load state from localStorage
    const loadState = useCallback((): RateLimitData => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error("Error loading rate limit state:", e);
        }
        return { failedAttempts: 0, lockoutUntil: null };
    }, []);

    // Save state to localStorage
    const saveState = useCallback((data: RateLimitData) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Error saving rate limit state:", e);
        }
    }, []);

    // Check lockout status
    useEffect(() => {
        const checkLockout = () => {
            const data = loadState();
            const now = Date.now();

            if (data.lockoutUntil && data.lockoutUntil > now) {
                setIsLocked(true);
                setRemainingTime(Math.ceil((data.lockoutUntil - now) / 1000));
            } else {
                setIsLocked(false);
                setRemainingTime(0);
                // Clear lockout if expired
                if (data.lockoutUntil && data.lockoutUntil <= now) {
                    saveState({ failedAttempts: 0, lockoutUntil: null });
                }
            }
            setFailedAttempts(data.failedAttempts);
        };

        checkLockout();
        const interval = setInterval(checkLockout, 1000);
        return () => clearInterval(interval);
    }, [loadState, saveState]);

    // Record failed login attempt
    const recordFailedAttempt = useCallback(() => {
        const data = loadState();
        const newAttempts = data.failedAttempts + 1;

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            saveState({
                failedAttempts: newAttempts,
                lockoutUntil: Date.now() + LOCKOUT_DURATION_MS,
            });
        } else {
            saveState({
                failedAttempts: newAttempts,
                lockoutUntil: null,
            });
        }
    }, [loadState, saveState]);

    // Reset on successful login
    const resetAttempts = useCallback(() => {
        saveState({ failedAttempts: 0, lockoutUntil: null });
    }, [saveState]);

    // Format remaining time
    const formatRemainingTime = (): string => {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return {
        isLocked,
        remainingTime,
        failedAttempts,
        formatRemainingTime,
        recordFailedAttempt,
        resetAttempts,
        attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts),
    };
}
