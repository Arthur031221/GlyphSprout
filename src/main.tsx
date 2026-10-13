import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { SecureContextRequired } from "./ui/SecureContextRequired";
import "./ui/style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
  <React.StrictMode>
    {window.isSecureContext &&
    typeof crypto.randomUUID === "function" &&
    crypto.subtle ? (
      <App />
    ) : (
      <SecureContextRequired />
    )}
  </React.StrictMode>,
);

import "./register-sw";
