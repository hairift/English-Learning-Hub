import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Font merek Sela Tutor English (Nunito, bobot variabel 200-1000).
import "@fontsource-variable/nunito";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
