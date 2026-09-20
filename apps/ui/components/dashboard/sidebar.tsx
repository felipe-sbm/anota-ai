"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  AudioLines,
  CircleUser,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
  X,
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
    disabled: true,
  },
  {
    label: "Equipes",
    href: "/dashboard/equipes",
    Icon: Users,
    disabled: true,
  },
  {
    label: "Issues",
    href: "/dashboard/issues",
    Icon: FolderKanban,
    disabled: true,
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-navy text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.webp"
              alt="Logotipo do Anota Aí!"
              width={120}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-300 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400"
                >
                  <item.Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                    em breve
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <CircleUser className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name || user?.github_login || "Usuário"}
              </p>
              {user ? (
                <p className="truncate text-xs text-gray-400">
                  @{user.github_login}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}