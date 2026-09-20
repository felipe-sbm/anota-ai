"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { CircleUser, LogOut, Menu, PanelLeft } from "lucide-react";

import { useAuth } from "@/lib/auth";

export function DashboardHeader({
  onOpenSidebar,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  function handleLogout() {
    signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 lg:block cursor-pointer"
          aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          aria-pressed={sidebarCollapsed}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div
          className="hidden h-4 w-px self-center bg-stone-200 lg:block"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 lg:hidden cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden flex-col ml-2 lg:flex">
          <p className="text-sm font-semibold text-stone-900">Anota Aí</p>
          <p className="text-xs text-stone-500">Painel do usuário</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt="Avatar do usuário"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand">
              <CircleUser className="h-5 w-5" />
            </span>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-stone-900">
              {user?.name || user?.github_login || "Usuário"}
            </p>
            {user ? (
              <p className="text-xs leading-tight text-stone-500">
                @{user.github_login}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}