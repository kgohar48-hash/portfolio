import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";

const path = window.location.pathname.replace(/\/$/, "");

// The admin dashboard and the privacy page are separate bundle chunks — the
// public portfolio never downloads them.
const Root =
  path === "/admin"
    ? React.lazy(() => import("./admin/AdminApp.jsx"))
    : path === "/privacy"
      ? React.lazy(() => import("./pages/Privacy.jsx"))
      : path.startsWith("/cv/")
        ? React.lazy(() => import("./pages/CvPage.jsx"))
        : React.lazy(() => import("./App.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <Root />
    </React.Suspense>
  </React.StrictMode>
);
