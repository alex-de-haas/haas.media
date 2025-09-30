"use client";

import { ReactNode, useEffect } from "react";

import { useLayout } from "./layout-provider";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Separator } from "../ui/separator";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{
    name: string;
    href?: string;
    current?: boolean;
  }>;
}

export default function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  const { setPageTitle } = useLayout();

  useEffect(() => {
    setPageTitle(title);
  }, [setPageTitle, title]);

  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 0);

  return (
    <div className="space-y-6">
      {hasBreadcrumbs && breadcrumbs && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={crumb.name}>
                {crumb.href && !crumb.current ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.name}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                )}
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            {description && (
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        <Separator />
      </div>
    </div>
  );
}
