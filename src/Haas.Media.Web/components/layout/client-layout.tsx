"use client";

import { ReactNode, useEffect } from "react";
import Sidebar from "./sidebar";
import { LayoutProvider } from "./layout-provider";
import { NotificationsProvider } from "../../lib/notifications";
import { LocalAuthProvider } from "../../features/auth/local-auth-context";
import BackgroundTaskNotifications from "../../features/background-tasks/components/background-task-notifications";
import { getApiUrl } from "../../lib/env";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    try {
      const apiUrl = getApiUrl();
      console.info("[Haas Media] API base URL:", apiUrl);
    } catch (error) {
      console.warn("[Haas Media] Failed to resolve API base URL", error);
    }
  }, []);

  return (
    <LocalAuthProvider>
      <NotificationsProvider>
        <BackgroundTaskNotifications />
        <LayoutProvider>
          <div className="min-h-screen bg-background text-foreground antialiased">
            <Sidebar>{children}</Sidebar>
          </div>
        </LayoutProvider>
      </NotificationsProvider>
    </LocalAuthProvider>
  );
}
