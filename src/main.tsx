import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";
import { AuthProvider } from "./auth/AuthProvider";
import { ContentStoreProvider } from "./features/content/contentStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ContentStoreProvider>
        <App />
      </ContentStoreProvider>
    </AuthProvider>
  </React.StrictMode>
);