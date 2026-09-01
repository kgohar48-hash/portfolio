import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";

const isAdmin = window.location.pathname.replace(/\/$/, "") === "/admin";

// The admin dashboard is a separate bundle chunk — the public portfolio never
// downloads it, and it's only reachable by typing /admin directly.
const Root = isAdmin
  ? React.lazy(() => import("./admin/AdminApp.jsx"))
  : React.lazy(() => import("./App.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <Root />
    </React.Suspense>
  </React.StrictMode>
);
