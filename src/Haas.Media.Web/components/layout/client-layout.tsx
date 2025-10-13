"use client";

import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { LayoutProvider } from "./layout-provider";
import { NotificationsProvider } from "../../lib/notifications";
import { LocalAuthProvider } from "../../features/auth/local-auth-context";
import BackgroundTaskNotifications from "../../features/background-tasks/components/background-task-notifications";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
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
