import { Search } from 'lucide-react';
import Link from 'next/link';

import Image from 'next/image';
import { ComponentType } from 'react';

type headerLink = {
	label: string;
	href: string;
	Icon?: ComponentType<{ className?: string }> | null;
	disabled?: boolean;
};

const docsLinks: headerLink[] = [
	{ label: 'Buscar', href: '/buscar', Icon: Search, disabled: true },
	{ label: 'Documentação', href: '/docs', Icon: null, disabled: true },
	{ label: 'Suporte', href: '/suporte', Icon: null, disabled: true },
	{ label: 'Ver Demonstração', href: '/demo', Icon: null },
];

const accountLinks: headerLink[] = [
	{ label: 'Como usar o GitHub Issues', href: 'https://docs.github.com/pt/issues/tracking-your-work-with-issues/learning-about-issues/about-issues' },
	{ label: 'Criar conta', href: '/login' },
];
const navLinks = ['Como Funciona', 'Recursos', 'Documentação', 'Sobre o TCC'];

export function Header() {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-stone-100 bg-white">
			{/** atalhos úteis */}
			<div className="border-b border-stone-100 bg-white text-[13px] text-stone-500">
				<div className="hidde md:flex mx-auto flex h-9 max-w-full items-center justify-end gap-3 px-6">
					{docsLinks.map((item) => {
						if (item.disabled) {
							return (
								<div key={item.href} className="flex flex-row items-center gap-1.5 h-8 cursor-not-allowed rounded-md p-2 text-sm">
									{item.Icon && <item.Icon className="h-3.5 w-3.5" />}
									<span className="truncate transition-[max-width,opacity] duration-200 ease-in-out">{item.label}</span>
								</div>
							);
						}

						return (
							<Link
								key={item.href}
								href={item.href}
								className="flex flex-row items-center gap-1.5 cursor-pointer font-normal text-stone-700 underline underline-offset-2 decoration-dotted decoration-transparent hover:decoration-brand hover:text-brand transition-colors duration-200"
							>
								{item.Icon && <item.Icon className="h-3.5 w-3.5" />}
								{item.label}
							</Link>
						);
					})}

					<div className="h-4 w-px self-center bg-stone-500 rounded-full mx-4" aria-hidden="true" />

					{accountLinks.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="flex flex-row items-center gap-1.5 cursor-pointer font-normal text-stone-700 underline underline-offset-2 decoration-dotted decoration-transparent hover:decoration-brand hover:text-brand transition-colors duration-200"
						>
							{item.label}
						</Link>
					))}
				</div>
			</div>

			{/** cabeçalho */}
			<div className="mx-auto flex h-20  items-center justify-between px-6">
				<div className="flex items-center gap-10">
					<a className="cursor-pointer">
						<Image src="/icons/theme/logo.svg" alt="Logo" width={150} height={50} className="h-12 w-auto" loading="eager" />
					</a>
					<nav className="hidden items-center gap-8 text-[15px] font-medium text-stone-700 lg:flex">
						{navLinks.map((label) => (
							<Link key={label} href="#" className="flex flex-row items-center gap-1.5 cursor-pointer font-medium text-stone-700 underline underline-offset-2 decoration-wavy decoration-transparent hover:decoration-brand hover:text-brand transition-colors duration-200">
								{label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-4">
					<Link className="hidden cursor-pointer rounded-full sm:inline-flex border border-brand px-5 py-2.5 text-sm font-medium text-brand transition-all underline underline-offset-2 decoration-wavy decoration-transparent hover:decoration-brand hover:bg-brand-light hover:border-dashed hover:border-1.5" href="http://github.com/felipe-sbm/anota-ai">
						Instalar Extensão
					</Link>
					<Link href="/login" className="cursor-pointer rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-hover">
						Entrar no Painel
					</Link>
				</div>
			</div>
		</header>
	);
}
