import type { ComponentType } from 'react';
import { FacebookIcon, LinkedinIcon, TelegramIcon, WhatsAppIcon, XIcon } from '@/components/icons';
import Image from 'next/image';
import { facebookShareUrl, linkedinShareUrl, telegramShareUrl, whatsappShareUrl, xShareUrl } from '@/lib/share';
import Link from 'next/link';

type LinkItem = {
	label: string;
	href: string;
	enabled?: boolean;
};

type Link = {
	section: string;
	links: LinkItem[];
};

const footerLinks: Link[] = [
	{
		section: 'Documentações de Ferramentas Utilizadas no Produto',
		links: [
			{ label: 'Extensão Chrome', href: 'https://developer.chrome.com/docs/extensions/get-started?hl=pt-br', enabled: true },
			{ label: 'Extensão Edge', href: 'https://learn.microsoft.com/pt-br/microsoft-edge/extensions/landing/', enabled: true },
			{ label: 'Extensão Firefox', href: 'https://developer.mozilla.org/pt-BR/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension', enabled: true },
			{ label: 'API Fastapi', href: 'https://fastapi.tiangolo.com/pt/', enabled: true },
			{ label: 'Fluxo LangGraph', href: 'https://www.langchain.com/langgraph', enabled: true },
			{ label: 'Integração GitHub', href: 'https://docs.github.com/pt/rest/issues?apiVersion=2026-03-10', enabled: true },
		],
	},
	{
		section: 'Docs & Ajuda',
		links: [
			{ label: 'Documentação', href: '/docs', enabled: false },
			{ label: 'Guia de Instalação', href: '/docs/instalacao', enabled: false },
			{ label: 'Arquitetura Técnica', href: '/docs/arquitetura', enabled: false },
			{ label: 'Status do Sistema', href: '/docs/status', enabled: false },
			{ label: 'Casos de Uso', href: '/use-cases', enabled: false },
			{ label: 'FAQs', href: '/docs/faq', enabled: false },
		],
	},
	{
		section: 'Sobre o Projeto',
		links: [
			{ label: 'Sobre o Anota Aí', href: '/sobre', enabled: false },
			{ label: 'Pesquisa & TCC', href: '/pesquisa', enabled: false },
			{ label: 'Felipe Samuel (Autor)', href: '/autor', enabled: false },
			{ label: 'Motivacional Academico', href: '/motivacional-academico', enabled: false },
			{ label: 'Licença MIT', href: 'https://github.com/felipe-sbm/anota-ai/blob/main/LICENSE', enabled: true },
		],
	},
	{
		section: 'Contato',
		links: [
			{ label: 'Reportar Problemas', href: 'https://github.com/felipe-sbm/anota-ai/issues/new', enabled: true },
			{ label: 'Contribuir no GitHub', href: 'https://github.com/felipe-sbm/anota-ai/fork', enabled: true },
			{ label: 'Discussões', href: 'https://github.com/felipe-sbm/anota-ai/discussions', enabled: true },
		],
	},
	{
		section: 'Legal',
		links: [
			{ label: 'Termos de Uso', href: '/legal/termos', enabled: false },
			{ label: 'Privacidade', href: '/legal/privacidade', enabled: false },
			{ label: 'Segurança', href: '/legal/seguranca', enabled: false },
			{ label: 'Declaração de Acessibilidade', href: '/legal/acessibilidade', enabled: false },
			{ label: 'Mapa do Site', href: '/legal/mapa-do-site', enabled: false },
			{ label: 'Preferências de Cookies', href: '/legal/cookies', enabled: false },
		],
	},
];

const socialLinks: {
	label: string;
	href: string;
	Icon: ComponentType<{ className?: string }>;
}[] = [
	{ label: 'WhatsApp', Icon: WhatsAppIcon, href: whatsappShareUrl() },
	{ label: 'Telegram', Icon: TelegramIcon, href: telegramShareUrl() },
	{ label: 'X / Twitter', Icon: XIcon, href: xShareUrl() },
	{ label: 'LinkedIn', Icon: LinkedinIcon, href: linkedinShareUrl() },
	{ label: 'Facebook', Icon: FacebookIcon, href: facebookShareUrl() },
];

function FooterColumn({ title, links }: { title: string; links: LinkItem[] }) {
	return (
		<div>
			<h4 className="mb-4 text-sm font-medium tracking-tight text-stone-900">{title}</h4>
			<ul className="space-y-3 text-[13px] text-stone-600">
				{links.map(({ label, href, enabled }) => (
					<li key={label}>
						<Link
							href={enabled ? href : ""}
							passHref
							className={enabled ? "flex flex-row items-center gap-1.5 cursor-pointer font-normal text-stone-700 hover:text-brand underline underline-offset-2 decoration-dotted decoration-transparent hover:decoration-brand transition-colors duration-200" : 'cursor-not-allowed text-stone-400 transition-colors hover:text-stone-400'}
							aria-disabled={!enabled}
						>
							{label}
						</Link>
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
					{footerLinks.filter(({ section }) => section !== 'Legal').map(({ section, links }) => (
							<FooterColumn key={section} title={section} links={links} />
						))}
					<div>
						<h4 className="mb-4 text-sm font-medium tracking-tight text-stone-900">Compartilhe o projeto!</h4>
						<div className="flex flex-row items-center gap-0.5">
							{socialLinks.map(({ label, href, Icon }) => (
								<Link key={label} aria-label={label} title={`Compartilhar o projeto no ${label}`} href={href} target="_blank" rel="noopener noreferrer" className="cursor-pointer p-2 rounded-full text-stone-700 hover:text-brand hover:bg-brand-light transition-colors duration-500">
									<Icon className="h-5 w-5" />
								</Link>
							))}
						</div>
					</div>
				</div>
				<div className="flex flex-col items-center justify-between gap-6 border-t border-stone-100 pt-8 text-xs text-stone-500 lg:flex-row">
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
						{footerLinks.filter(({ section }) => section === 'Legal').flatMap(({ section, links }) =>
								links.map(({ label, href }) => (
									<Link key={`${section}-${label}`} href={href} className="flex flex-row items-center gap-1.5 cursor-pointer font-normal text-stone-700 underline underline-offset-2 decoration-dotted decoration-transparent hover:decoration-brand hover:text-brand transition-colors duration-200" >
										{label}
									</Link>
								)),
							)}
					</div>
					<div className="flex items-center gap-3">
						<Image src="/icons/theme/icon.svg" alt="Logo" width={96} height={32} className="h-6 w-auto" loading="eager" />
					</div>
				</div>
				<p className="pt-4 text-left font-mono text-xs text-stone-400">© 2026 Anota Aí. Todos os direitos reservados.</p>
			</div>
		</footer>
	);
}
