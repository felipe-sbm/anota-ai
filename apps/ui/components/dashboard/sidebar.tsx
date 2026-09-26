"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import Image from "next/image";
import {
  AudioLines,
  CircleUser,
  FolderGit2,
  CircleDot,
  LayoutDashboard,
  Settings,
  Users,
  X
} from "lucide-react";

import { useAuth } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
  {
    label: "Gravações",
    href: "/dashboard/gravacoes",
    Icon: AudioLines,
  },
  {
    label: "Equipes",
    href: "/dashboard/equipes",
    Icon: Users,
  },
  {
    label: "Repositórios",
    href: "/dashboard/repositorios",
    Icon: FolderGit2,
  },
  {
    label: "Issues",
    href: "/dashboard/issues",
    Icon: CircleDot,
  },
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    Icon: Settings,
    disabled: true,
  },
];

export function DashboardSidebar({
  open,
  onClose,
  collapsed,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden transition-[width,transform] duration-300 ease-in-out lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:shrink-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-[4.5rem]" : "lg:w-64"}`}
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/10 transition-[padding] duration-300 ease-in-out ${
            collapsed ? "justify-center px-2" : "justify-between px-3"
          }`}
        >
          <Link
            href="/dashboard"
            title="Voltar para a dashboard"
            className="flex items-center hover:bg-stone-200 rounded-lg w-full transition-colors"
          >
            {!collapsed ? (
              <Image
                src="/icons/theme/logo.webp"
                alt="Logo"
                width={120}
                height={40}
                className="h-9 w-auto ml-2"
              />
            ) : (
              <Image
                src="/icons/theme/icon.webp"
                alt="Logo"
                width={40}
                height={40}
                className="h-9 w-auto mx-2"
              />
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          className={`flex-1 space-y-1 overflow-y-auto py-4 transition-[padding] duration-300 ease-in-out ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          {navItems.map((item) => {
            const active = pathname === item.href;

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex h-8 cursor-not-allowed items-center rounded-md p-2 text-sm ${
                    collapsed ? "justify-center" : "gap-2"
                  }`}
                >
                  <item.Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={`truncate transition-[max-width,opacity] duration-200 ease-in-out ${
                      collapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex h-8 items-center rounded-md p-2 text-sm transition-colors ${
                  collapsed ? "justify-center" : "gap-2"
                } ${
                  active
                    ? "bg-stone-200/75 text-stone-900 font-medium hover:bg-stone-300/75"
                    : "text-stone-700 hover:bg-stone-200 hover:text-stone-950"
                }`}
              >
                <item.Icon className="h-4 w-4 shrink-0" />
                <span
                  className={`truncate transition-[max-width,opacity] duration-200 ease-in-out ${
                    collapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={`border-t border-white/10 transition-[padding] duration-300 ease-in-out ${
            collapsed ? "p-2" : "p-4"
          }`}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <CircleUser className="h-5 w-5" />
            </span>
            <div
              className={`min-w-0 overflow-hidden transition-[max-width,opacity] duration-200 ease-in-out ${
                collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
              }`}
            >
              <p className="truncate text-sm font-medium">
                {user?.name || user?.github_login || "Usuário"}
              </p>
              {user ? (
                <p className="truncate text-xs">@{user.github_login}</p>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
