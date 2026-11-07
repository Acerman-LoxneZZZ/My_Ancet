import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { NavigationProvider } from "./navigation/NavigationProvider";
import "./styles/site.css";
import "./styles/journey.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
