import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MoonHeatmap from "./MoonHeatmap";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MoonHeatmap />
  </StrictMode>,
);
