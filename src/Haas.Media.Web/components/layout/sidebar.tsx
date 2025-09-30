"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  LayoutDashboard,
  CloudDownload,
  Settings2,
  Folder,
  Library,
  Clapperboard,
  TvMinimalPlay,
  Menu,
  LogIn,
  LogOut,
  ChevronDown,
  Activity,
} from "lucide-react";

import { useLayout } from "./layout-provider";
import { useAuth } from "../../lib/hooks/useAuth";
import ActiveBackgroundTasks from "../background-tasks/active-background-tasks";
import ThemeSwitch from "../ui/theme-switch";
import { Button } from "../ui/button";
import { Sheet, SheetContent } from "../ui/sheet";
import { ScrollArea } from "../ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  children?: React.ReactNode;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Torrents",
    href: "/torrent",
    icon: CloudDownload,
  },
  {
    name: "Encodings",
    href: "/encodings",
    icon: Settings2,
  },
  {
    name: "Files",
    href: "/files",
    icon: Folder,
  },
  {
    name: "Libraries",
    href: "/libraries",
    icon: Library,
  },
  {
    name: "Movies",
    href: "/movies",
    icon: Clapperboard,
  },
  {
    name: "TV Shows",
    href: "/tvshows",
    icon: TvMinimalPlay,
  },
];

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function NavigationList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="grid gap-1 px-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")}
            />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

interface UserMenuProps {
  variant?: "sidebar" | "header";
}

function UserMenu({ variant = "sidebar" }: UserMenuProps) {
  const { user } = useAuth();
  const displayName = user?.name || user?.email || "Guest";
  const initials = getInitials(displayName);

  if (!user) {
    if (variant === "sidebar") {
      return (
        <Button variant="outline" className="w-full" asChild>
          <Link href="/api/auth/login">
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        </Button>
      );
    }

    return (
      <Button variant="outline" asChild>
        <Link href="/api/auth/login">
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="gap-2 px-1"
          >
            <Avatar className="h-9 w-9">
              {user.picture ? (
                <AvatarImage src={user.picture} alt={displayName} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {displayName}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
          <div className="px-2 pb-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{displayName}</div>
            {user.email && <div className="truncate text-xs">{user.email}</div>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/api/auth/logout">
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-2 py-2 text-left"
        >
          <Avatar className="h-9 w-9">
            {user.picture ? (
              <AvatarImage src={user.picture} alt={displayName} />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            {user.email && (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">{displayName}</div>
          {user.email && <div className="truncate text-xs">{user.email}</div>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/api/auth/logout">
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-4 pt-6">
        <Link href="/" onClick={onNavigate} className="flex flex-col">
          <span className="text-sm font-semibold uppercase text-muted-foreground">
            Haas Media Server
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Control Center
          </span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <NavigationList pathname={pathname} onNavigate={onNavigate} />
        {user && (
          <div className="px-4 py-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Background Tasks
            </div>
            <div className="mt-3">
              <ActiveBackgroundTasks enabled={Boolean(user)} />
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="mt-auto space-y-4 border-t border-border px-6 py-5">
        <ThemeSwitch variant="dropdown" className="w-full" />
        <UserMenu variant="sidebar" />
      </div>
    </div>
  );
}

export default function Sidebar({ children }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, pageTitle } = useLayout();

  return (
    <Fragment>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[18rem] border-r p-0">
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:border-r lg:bg-background">
        <SidebarContent />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold text-foreground">
              {pageTitle}
            </span>
          </div>
        </header>
        <main className="flex-1 pb-10">
          {children}
        </main>
      </div>
    </Fragment>
  );
}
