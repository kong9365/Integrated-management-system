import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Plotly.js를 위한 폴리필
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;
(window as any).global = window;

createRoot(document.getElementById("root")!).render(<App />);

