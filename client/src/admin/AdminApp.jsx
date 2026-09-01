import { useEffect, useState } from "react";
import { adminApi, getToken, setToken } from "./adminApi";
import Login from "./Login";
import Dashboard from "./Dashboard";
import "../styles/admin.css";

export default function AdminApp() {
  const [authed, setAuthed] = useState(null); // null = checking

  useEffect(() => {
    document.title = "Analytics — Gohar Khan Awan";
    if (!getToken()) {
      setAuthed(false);
      return;
    }
    adminApi
      .me()
      .then(() => setAuthed(true))
      .catch(() => {
        setToken(null);
        setAuthed(false);
      });
  }, []);

  if (authed === null) {
    return <div className="adm-boot">Checking access…</div>;
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Dashboard
      onLogout={() => {
        setToken(null);
        setAuthed(false);
      }}
    />
  );
}
