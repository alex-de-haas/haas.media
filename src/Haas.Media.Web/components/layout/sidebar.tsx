"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type MouseEventHandler } from "react";
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
  CalendarDays,
  UserRound,
} from "lucide-react";

import { useLayout } from "./layout-provider";
import { useLocalAuth } from "../../features/auth/local-auth-context";
import { useRouter } from "next/navigation";
import ThemeSwitch from "../ui/theme-switch";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet";
import { ScrollArea } from "../ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
  {
    name: "Releases Calendar",
    href: "/releases",
    icon: CalendarDays,
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

function NavigationList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1 px-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const handleClick: MouseEventHandler<HTMLAnchorElement> | undefined = onNavigate
          ? () => {
              onNavigate();
            }
          : undefined;

        return (
          <Link
            key={item.name}
            href={item.href}
            {...(handleClick ? { onClick: handleClick } : {})}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
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
  const router = useRouter();

  // Local auth state
  const { user: localUser, isLoading: localLoading, isAuthenticated: localAuthenticated, logout: localLogout } = useLocalAuth();

  const isLoading = localLoading;
  const isAuthenticated = localAuthenticated;

  const handleLogout = () => {
    localLogout();
    router.push("/login");
  };

  if (isLoading) return null;

  const displayName = localUser?.username || localUser?.email || "Guest";
  const initials = getInitials(displayName);
  const email = localUser?.email;

  if (!isAuthenticated) {
    if (variant === "sidebar") {
      return (
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        </Button>
      );
    }

    return (
      <Button variant="outline" asChild>
        <Link href="/login">
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
          <Button variant="ghost" className="gap-2 px-1">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
          <div className="px-2 pb-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{displayName}</div>
            {email && <div className="truncate text-xs">{email}</div>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              router.push("/profile");
            }}
          >
            <UserRound className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-2 text-left">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
          </div>
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">{displayName}</div>
          {email && <div className="truncate text-xs">{email}</div>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            router.push("/profile");
          }}
        >
          <UserRound className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const homeClick: MouseEventHandler<HTMLAnchorElement> | undefined = onNavigate
    ? () => {
        onNavigate();
      }
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-4 pt-6">
  <Link href="/" {...(homeClick ? { onClick: homeClick } : {})} className="flex flex-col">
          <span className="text-sm font-semibold uppercase text-muted-foreground">Haas Media Server</span>
          <span className="text-lg font-bold tracking-tight text-foreground">Control Center</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
  <NavigationList pathname={pathname} {...(onNavigate ? { onNavigate } : {})} />
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
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:border-r lg:bg-background">
        <SidebarContent />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
          <div className="flex flex-1 items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold text-foreground">{pageTitle}</span>
          </div>
        </header>
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </Fragment>
  );
}
