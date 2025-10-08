"use client";

import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { LayoutProvider } from "./layout-provider";
import { NotificationsProvider } from "../../lib/notifications";
import { LocalAuthProvider } from "../../features/auth/local-auth-context";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <LocalAuthProvider>
      <NotificationsProvider>
        <LayoutProvider>
          <div className="min-h-screen bg-background text-foreground antialiased">
            <Sidebar>{children}</Sidebar>
          </div>
        </LayoutProvider>
      </NotificationsProvider>
    </LocalAuthProvider>
  );
}
