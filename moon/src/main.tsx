import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "@mantine/core/styles.css";
import App from "app/app";
import { MantineProvider } from "@mantine/core";
import { Analytics } from "@vercel/analytics/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Analytics />
    <MantineProvider>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
