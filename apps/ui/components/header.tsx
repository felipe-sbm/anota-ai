import { Search } from "lucide-react";
import Link from "next/link";

import Image from "next/image";

// depois irei colocar links funcionais de verdade, por enquanto será só mock
const docsLinks = ["Documentação", "Suporte", "Ver Demonstração"];
const accountLinks: { label: string; href: string | null }[] = [
  { label: "Como usar o GitHub Issues", href: null },
  { label: "Entrar", href: "/login" },
];
const navLinks = ["Como Funciona", "Recursos", "Documentação", "Sobre o TCC"];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-100 bg-white">
      {/** atalhos úteis */}
      <div className="border-b border-stone-100 bg-white text-[13px] text-stone-500">
        <div className="mx-auto flex h-9 max-w-[1360px] items-center justify-end gap-6 px-6">
          <a className="flex cursor-pointer items-center gap-1.5 font-normal text-stone-700 transition-colors hover:text-brand">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar</span>
          </a>
          {docsLinks.map((label) => (
            <a
              key={label}
              className="cursor-pointer font-normal text-stone-700 transition-colors hover:text-brand"
            >
              {label}
            </a>
          ))}
          <span className="text-stone-300">|</span>
          {accountLinks.map((link) =>
            link.href ? (
              <Link
                key={link.label}
                href={link.href}
                className="cursor-pointer font-normal text-stone-700 transition-colors hover:text-brand"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                className="cursor-pointer font-normal text-stone-700 transition-colors hover:text-brand"
              >
                {link.label}
              </a>
            ),
          )}
        </div>
      </div>

      {/** cabeçalho */}
      <div className="mx-auto flex h-20  items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <a className="cursor-pointer">
            <Image
              src="/icons/theme/logo.webp"
              alt="Logo"
              width={150}
              height={50}
              className="h-12 w-auto"
            />
          </a>
          <nav className="hidden items-center gap-8 text-[15px] font-medium text-stone-700 lg:flex">
            {navLinks.map((label) => (
              <a
                key={label}
                className="cursor-pointer transition-colors hover:text-brand"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a
            className="hidden cursor-pointer rounded-full border border-brand px-5 py-2.5 text-sm font-medium text-brand transition-all hover:bg-brand-light sm:inline-flex"
            href="http://github.com/felipe-sbm/anota-ai"
          >
            Instalar Extensão
          </a>
          <Link
            href="/login"
            className="cursor-pointer rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-hover"
          >
            Entrar no Painel
          </Link>
        </div>
      </div>
    </header>
  );
}
