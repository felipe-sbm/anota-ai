"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-2rem)] h-full w-full bg-stone-100">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div className="m-2 flex min-h-[calc(100vh-2rem)] min-w-0 flex-1 flex-col gap-4 lg:m-4 lg:ml-0">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70">
          <DashboardHeader
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
            sidebarCollapsed={sidebarCollapsed}
          />

          <div className="mx-auto w-full max-w-7xl flex-1 p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
