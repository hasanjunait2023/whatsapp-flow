import { ViteReactSSG } from "vite-react-ssg";

import { routes } from "./routes";
import "./content.css";

/**
 * Entry for the isolated content SSG build (/learn, /compare). vite-react-ssg
 * renders each route in `routes` to static HTML at build time and hydrates the
 * same tree in the browser. Deliberately imports NONE of the SPA app shell
 * (App.tsx, Supabase, auth, i18n, the service worker), so nothing browser-only
 * executes during server rendering.
 */
export const createRoot = ViteReactSSG({ routes });
