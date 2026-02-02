import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const apiBase = import.meta.env.VITE_API_BASE as string | undefined;
if (apiBase && typeof window !== "undefined" && !(window as any).__apiFetchWrapped) {
  (window as any).__apiFetchWrapped = true;
  const base = apiBase.replace(/\/$/, "");
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      if (input.startsWith("/")) {
        return originalFetch(`${base}${input}`, init);
      }
      return originalFetch(input, init);
    }
    if (input instanceof Request && input.url.startsWith("/") && typeof base === "string") {
      const next = new Request(`${base}${input.url}`, input);
      return originalFetch(next, init);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
