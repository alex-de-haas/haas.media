"use client";

import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { LayoutProvider } from "./layout-provider";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { NotificationsProvider } from "../../lib/notifications";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <UserProvider>
      <NotificationsProvider>
        <LayoutProvider>
          <div className="min-h-screen bg-background text-foreground antialiased">
            <Sidebar>{children}</Sidebar>
          </div>
        </LayoutProvider>
      </NotificationsProvider>
    </UserProvider>
  );
}
