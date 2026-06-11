import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n
import { registerServiceWorker } from "./lib/pwa";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
