import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { upgradeHashRoute } from "./router";
import { WalletProvider } from "./wallet";
import "./styles.css";

upgradeHashRoute();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>
);
