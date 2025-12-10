import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { useAppStore } from "@/lib/store";

// Initial fetch
// Initial fetch if user is logged in (rehydrated from local storage)
const state = useAppStore.getState();
if (state.currentUser) {
    state.fetchInitialData();
}

createRoot(document.getElementById("root")!).render(<App />);
