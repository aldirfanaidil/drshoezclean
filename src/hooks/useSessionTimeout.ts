import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutes before

interface UseSessionTimeoutOptions {
    onTimeout?: () => void;
    onWarning?: () => void;
}

/**
 * Hook to handle session timeout based on user inactivity
 * Logs out user after 30 minutes of no activity
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
    const { logout, currentUser } = useAppStore();
    const lastActivityRef = useRef<number>(Date.now());
    const warningShownRef = useRef<boolean>(false);

    // Update last activity on user interaction
    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        // Track user activity
        const events = ["mousedown", "keydown", "scroll", "touchstart"];
        events.forEach((event) => {
            document.addEventListener(event, updateActivity);
        });

        // Check for timeout
        const checkTimeout = () => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivityRef.current;

            // Show warning 5 minutes before timeout
            if (
                timeSinceActivity >= SESSION_TIMEOUT_MS - WARNING_BEFORE_MS &&
                !warningShownRef.current
            ) {
                warningShownRef.current = true;
                options.onWarning?.();
            }

            // Timeout - log out user
            if (timeSinceActivity >= SESSION_TIMEOUT_MS) {
                logout();
                options.onTimeout?.();
            }
        };

        const interval = setInterval(checkTimeout, 10000); // Check every 10 seconds

        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, updateActivity);
            });
            clearInterval(interval);
        };
    }, [currentUser, logout, updateActivity, options]);

    return {
        updateActivity,
        getTimeRemaining: () => {
            const elapsed = Date.now() - lastActivityRef.current;
            return Math.max(0, SESSION_TIMEOUT_MS - elapsed);
        },
    };
}
