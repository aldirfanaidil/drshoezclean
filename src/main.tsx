import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { useAppStore } from "@/lib/store";

// Wait for Zustand persist to rehydrate, then fetch data
const unsub = useAppStore.persist.onFinishHydration(() => {
    const state = useAppStore.getState();
    if (state.currentUser) {
        state.fetchInitialData();
    }
    unsub(); // Clean up listener
});

// Also trigger immediately if already hydrated
if (useAppStore.persist.hasHydrated()) {
    const state = useAppStore.getState();
    if (state.currentUser) {
        state.fetchInitialData();
    }
}

createRoot(document.getElementById("root")!).render(<App />);
