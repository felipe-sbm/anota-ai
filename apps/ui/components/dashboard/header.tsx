"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  CircleUser,
  LogOut,
  Menu,
  MonitorSmartphone,
  // MoonStar,
  PanelLeft,
  Settings,
  SunMedium,
} from "lucide-react";

import { Transition } from "@/components/transition";
import { useAuth } from "@/lib/auth";

type ThemeOption = "light" | "dark" | "auto";

const THEME_STORAGE_KEY = "anota_ai_theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeOption>(() => {
    if (typeof window === "undefined") return "auto";

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "auto"
    ) {
      return savedTheme;
    }

    return "auto";
  });
  const ref = useRef<HTMLDivElement | null>(null);

  const displayName = user?.name || user?.github_login || "Usuário";
  const githubHandle = user?.github_login
    ? user.github_login.replace(/^@+/, "")
    : null;
  const githubLabel = githubHandle ? `@${githubHandle}` : null;
  // só anima quando existe um nome distinto do login; senão mantém o alias visível embaixo
  const canRoll = Boolean(
    user?.name && githubHandle && user.name !== githubHandle,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolvedTheme = theme === "auto" ? getSystemTheme() : theme;
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    signOut();
    router.replace("/login");
  }

  function handleSettings() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 text-stone-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden cursor-pointer rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 lg:block"
          aria-label={
            sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"
          }
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
          className="cursor-pointer rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-2 hidden flex-col lg:flex">
          <p className="text-sm font-medium text-stone-900">Anota Aí</p>
          <p className="text-xs text-stone-500">Painel do usuário</p>
        </div>
      </div>

      <div className="relative flex items-center gap-4" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="group flex items-center gap-3 rounded-full border border-stone-200 bg-stone-50 px-2 py-1.5 text-left transition-colors hover:border-stone-300 hover:bg-stone-100 cursor-pointer"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt="Avatar do usuário"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand">
              <CircleUser className="h-5 w-5" />
            </span>
          )}

          <div className="hidden min-w-0 text-left sm:block">
            <p className="text-sm font-medium leading-tight text-stone-900">
              {canRoll && githubLabel ? (
                <Transition first={displayName} second={githubLabel} />
              ) : (
                displayName
              )}
            </p>
            {githubLabel && !canRoll ? (
              <p className="text-xs leading-tight text-stone-500">
                {githubLabel}
              </p>
            ) : null}
          </div>

          <ChevronDown
            className={`h-4 w-4 text-stone-500 transition-transform duration-500 ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-14 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl ring-1 ring-stone-200/80">
            <div className="border-b border-stone-200 p-3">
              <button
                type="button"
                onClick={handleSettings}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 cursor-pointer"
              >
                <Settings className="h-4 w-4 text-stone-500" />
                Configurações
              </button>
            </div>

            <div className="p-3">
              <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                Tema
              </p>

              <div className="space-y-1">
                {[
                  { value: "light", label: "Claro", icon: SunMedium },
                  /** depois que eu fizer vou deixar visível: { value: "dark", label: "Escuro", icon: MoonStar }, */
                  {
                    value: "auto",
                    label: "Automático",
                    icon: MonitorSmartphone,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected = theme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setTheme(option.value as ThemeOption);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors cursor-pointer ${
                        selected
                          ? "bg-brand-light text-brand"
                          : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </span>

                      {selected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-stone-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
