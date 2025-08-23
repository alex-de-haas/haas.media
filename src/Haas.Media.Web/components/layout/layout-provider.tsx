"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");

  const value = {
    sidebarOpen,
    setSidebarOpen,
    pageTitle,
    setPageTitle,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}

// Hook to set page title from page components
export function usePageTitle(title: string) {
  const { setPageTitle } = useLayout();
  
  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);
}
