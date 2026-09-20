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
  iconClassName,
}: {
  label: string;
  value: string;
  Icon: ComponentType<{ className?: string }>;
  iconClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // rotas da dashboard são protegidas: sem sessão, volta para o login.
  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [loading, token, router]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-400">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Resumo das suas gravações, issues e equipes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStat
              label="Gravações"
              value="—"
              Icon={AudioLines}
              iconClassName="bg-brand-light text-brand"
            />
            <DashboardStat
              label="Issues criadas"
              value="—"
              Icon={FolderKanban}
              iconClassName="bg-emerald-50 text-emerald-600"
            />
            <DashboardStat
              label="Equipes"
              value="—"
              Icon={Users}
              iconClassName="bg-amber-50 text-amber-600"
            />
            <DashboardStat
              label="Tarefas pendentes"
              value="—"
              Icon={ClipboardList}
              iconClassName="bg-blue-50 text-blue-600"
            />
          </div>

          <div className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-gray-600">
              A dashboard completa chega em breve 🚧
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}