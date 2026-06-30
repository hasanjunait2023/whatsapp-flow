import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Theme v2 — palette, motion, glass, typography, mobile patterns.
// Imported AFTER Tailwind directives so its @layer utilities extend the
// existing utility classes (no override conflicts).
import "./styles/theme.css";
import "./i18n"; // Initialize i18n
import { registerServiceWorker } from "./lib/pwa";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
