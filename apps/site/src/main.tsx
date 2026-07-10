import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HomePage } from "./pages/HomePage";
import "./styles/global.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <HomePage />
  </StrictMode>
);
