import type { ComponentType } from "react";
import Image from "next/image";
import {
  FacebookIcon,
  GithubIcon,
  LinkedinIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/icons";
import {
  facebookShareUrl,
  linkedinShareUrl,
  projectUrl,
  telegramShareUrl,
  whatsappShareUrl,
  xShareUrl,
} from "@/lib/share";

const productLinks = [
  "Extensão Chrome",
  "API Fastapi",
  "Fluxo LangGraph",
  "Integração GitHub",
  "Casos de Uso",
];

const docsLinks = [
  "Documentação",
  "Guia de Instalação",
  "Arquitetura Técnica",
  "Status do Sistema",
  "FAQs",
];

const aboutLinks = [
  "Sobre o Anota Aí",
  "Pesquisa & TCC",
  "Felipe Samuel (Autor)",
  "Orientação Acadêmica",
  "Licença MIT",
];

const contactLinks = [
  "Reportar Problemas",
  "Contribuir no GitHub",
  "Suporte Acadêmico",
  "Discussões",
];

const legalLinks = [
  "Termos de Uso",
  "Privacidade",
  "Segurança",
  "Declaração de Acessibilidade",
  "Mapa do Site",
  "Preferências de Cookies",
];

const socialLinks: {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { label: "GitHub", Icon: GithubIcon, href: projectUrl() },
  { label: "WhatsApp", Icon: WhatsAppIcon, href: whatsappShareUrl() },
  { label: "Telegram", Icon: TelegramIcon, href: telegramShareUrl() },
  { label: "X / Twitter", Icon: XIcon, href: xShareUrl() },
  { label: "LinkedIn", Icon: LinkedinIcon, href: linkedinShareUrl() },
  { label: "Facebook", Icon: FacebookIcon, href: facebookShareUrl() },
];

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-semibold tracking-tight text-stone-900">
        {title}
      </h4>
      <ul className="space-y-3 text-[13px] text-stone-600">
        {links.map((label) => (
          <li key={label}>
            <a className="cursor-pointer transition-colors hover:text-black">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-stone-200 bg-white pb-12 pt-16 text-stone-700">
      <div className="mx-auto max-w-[1360px] px-6">
        <div className="mb-14 grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-12">
          <FooterColumn title="Produtos & Soluções" links={productLinks} />
          <FooterColumn title="Docs & Ajuda" links={docsLinks} />
          <FooterColumn title="Sobre o Projeto" links={aboutLinks} />
          <FooterColumn title="Contato" links={contactLinks} />
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-tight text-stone-900">
              Compartilhe o projeto!
            </h4>
            <div className="flex items-center gap-4 text-stone-700">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  aria-label={label}
                  title={`Compartilhar o projeto no ${label}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer transition-colors hover:text-black"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-6 border-t border-stone-100 pt-8 text-xs text-stone-500 lg:flex-row">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((label) => (
              <a
                key={label}
                className="cursor-pointer transition-colors hover:text-stone-900"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Logotipo do Anota Aí!"
              width={96}
              height={32}
              className="h-6 w-auto"
            />
          </div>
        </div>
        <p className="pt-4 text-left text-xs text-stone-400">
          © 2026 Anota Aí. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
