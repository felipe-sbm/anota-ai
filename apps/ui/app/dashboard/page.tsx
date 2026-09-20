"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { AudioLines, ClipboardList, FolderKanban, Users } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

function DashboardStat({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-100 p-6 shadow-sm">
      <div
        className="mb-4 flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 border border-stone-200 text-stone-500"
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // rotas da dashboard são protegidas: sem sessão, volta para o login.
  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [loading, token, router]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] w-full h-full bg-stone-100">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col min-h-[calc(100vh-2rem)] min-w-0 gap-4 lg:m-4 m-2">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70">
          <DashboardHeader
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
            sidebarCollapsed={sidebarCollapsed}
          />

          <main className="mx-auto w-full max-w-7xl flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Resumo das suas gravações, issues e equipes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStat
              label="Gravações"
              value="—"
              Icon={AudioLines}
            />
            <DashboardStat
              label="Issues criadas"
              value="—"
              Icon={FolderKanban}
            />
            <DashboardStat
              label="Equipes"
              value="—"
              Icon={Users}
            />
            <DashboardStat
              label="Tarefas pendentes"
              value="—"
              Icon={ClipboardList}
            />
          </div>

          <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
            <p className="text-sm font-medium text-stone-600">
              🚧 A dashboard completa chega em breve! :)
            </p>
          </div>
          </main>
        </div>
      </div>
    </div>
  );
}