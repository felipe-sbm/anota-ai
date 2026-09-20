"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { CircleUser, LogOut, Menu } from "lucide-react";

import { useAuth } from "@/lib/auth";

export function DashboardHeader({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  function handleLogout() {
    signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-900">Anota Aí</p>
          <p className="text-xs text-gray-500">Painel do usuário</p>
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
            <p className="text-sm font-semibold leading-tight text-gray-900">
              {user?.name || user?.github_login || "Usuário"}
            </p>
            {user ? (
              <p className="text-xs leading-tight text-gray-500">
                @{user.github_login}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}