"use client";

import { useMemo, type ComponentType } from "react";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";

import { useTheme } from "../../lib/hooks/useTheme";
import { Button, type ButtonProps } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeSwitchProps {
  variant?: "dropdown" | "toggle" | "buttons";
  size?: "sm" | "md" | "lg";
  className?: string;
}

type ThemeMode = "light" | "dark" | "system";

type ButtonSize = ButtonProps["size"];

const buttonSizeMap: Record<NonNullable<ThemeSwitchProps["size"]>, ButtonSize> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

const modes: { value: ThemeMode; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeSwitch({ variant = "toggle", size = "md", className }: ThemeSwitchProps) {
  const { theme, resolvedTheme, setThemeMode } = useTheme();

  const activeLabel = useMemo(() => {
    if (theme === "system") {
      return `System (${resolvedTheme === "dark" ? "Dark" : "Light"})`;
    }
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }, [resolvedTheme, theme]);

  const buttonSize = buttonSizeMap[size];

  if (variant === "buttons") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {modes.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size={buttonSize}
            variant={theme === value ? "secondary" : "ghost"}
            className="gap-2"
            onClick={() => setThemeMode(value)}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{label}</span>
          </Button>
        ))}
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size={buttonSize} className={cn("min-w-[10rem] justify-between", className)}>
            <span className="flex items-center gap-2">
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm font-medium">{activeLabel}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {modes.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem key={value} onSelect={() => setThemeMode(value)}>
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={buttonSize === "default" ? "icon" : buttonSize}
      className={cn("relative", className)}
      onClick={() => setThemeMode(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className={cn("h-4 w-4 rotate-0 scale-100 transition-all", resolvedTheme === "dark" && "-rotate-90 scale-0")} />
      <Moon className={cn("absolute h-4 w-4 rotate-90 scale-0 transition-all", resolvedTheme === "dark" && "rotate-0 scale-100")} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
