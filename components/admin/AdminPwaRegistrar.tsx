"use client";

import { useEffect } from "react";

export default function AdminPwaRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/admin-service-worker.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .catch(() => {
        // The admin must remain fully functional even if PWA registration fails.
      });
  }, []);

  return null;
}
