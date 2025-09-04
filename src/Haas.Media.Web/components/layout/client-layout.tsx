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
          <div className="min-h-screen bg-white text-gray-900 antialiased transition-colors duration-0 dark:bg-gray-950 dark:text-gray-100">
            <Sidebar>
              {/* Main content area */}
              <main className="lg:pl-72">
                  {children}
              </main>
            </Sidebar>
          </div>
        </LayoutProvider>
      </NotificationsProvider>
    </UserProvider>
  );
}
