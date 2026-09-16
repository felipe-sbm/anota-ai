import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

import Image from "next/image";

import type { ComponentType } from "react";
import { ArrowRight, CheckCircle2, Mic, Zap } from "lucide-react";
import {
  ChromeIcon,
  FirefoxIcon,
  EdgeIcon,
  GithubIcon,
} from "@/components/icons";

type Feature = {
  title: string;
  description: string;
  tag: string;
  tagClassName: string;
  iconContainerClassName: string;
  Icon: ComponentType<{ className?: string }>;
};

const features: Feature[] = [
  {
    title: "Transcreve até batata",
    description:
      "Gravação leve na aba do seu navegador com processamento veloz de transcrição por IA. Ele tenta transcrever até audio abafado!",
    tag: "Extensão para navegadores",
    tagClassName: "text-brand bg-brand-light",
    iconContainerClassName: "bg-purple-100 text-brand",
    Icon: Mic,
  },
  {
    title: "Regido pelo LangGraph",
    description:
      "Algorítimo que divide o áudio em tópicos, identifica decisões técnicas e sugere os membros responsáveis.",
    tag: "Usando LangChain",
    tagClassName: "text-brand bg-brand-light",
    iconContainerClassName: "bg-purple-100 text-brand",
    Icon: Zap,
  },
  {
    title: "Você no comando, boy",
    description:
      "Nenhuma issue é enviada sem seu aval: revise, edite, ajuste responsáveis e aprove cada item de forma individual.",
    tag: "Tipo uma revisão interativa",
    tagClassName: "text-brand bg-brand-light",
    iconContainerClassName: "bg-purple-100 text-brand",
    Icon: CheckCircle2,
  },
  {
    title: "Cai como uma luva!",
    description:
      "Publicação direta no repositório escolhido com labels, markdown padronizado e referências às decisões tomadas.",
    tag: "Feito para o GitHub",
    tagClassName: "text-brand bg-brand-light",
    iconContainerClassName: "bg-purple-100 text-brand",
    Icon: GithubIcon,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main>
        <section className="relative border-b-16 border-brand bg-brand-navy pb-20 pt-16 text-center text-white">
          <div className="mx-auto max-w-4xl px-6">
            <h1 className="mb-4 text-4xl tracking-tight sm:text-5xl">
              O Tal do <span className="font-extrabold">Anota Aí</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-normal text-gray-300 sm:text-xl">
              Transforme reuniões de desenvolvimento em resumos estruturados e
              tarefas no GitHub.
            </p>
          </div>
        </section>

        <section className="border-b border-gray-100 bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1360px] px-6">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-6">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 shadow-xl">
                  <Image
                    src="/pexels-cottonbro-5486096.webp"
                    alt="Equipe de software em reunião de sprint"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-[50%_15%]"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center lg:col-span-6">
                <h2 className="mb-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Anota Aí para Equipes de Software
                </h2>
                <p className="mb-2 text-base font-semibold font-mono text-brand">
                  Versão 0.0.12 (Extensão de Navegador)
                </p>
                <p className="mb-8 text-base leading-relaxed text-gray-600 sm:text-lg">
                  O Anota Aí utiliza inteligência artificial para capturar o
                  áudio das reuniões, gerar transcrições e organizar decisões,
                  resumos e tarefas automaticamente antes do envio ao GitHub.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <a className="inline-flex cursor-pointer items-center rounded-full bg-brand px-7 py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-brand-hover">
                    Acessar Dashboard da equipe
                    {/** redireciona para a pagina do navegador que o usuário está usando :) */}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="border-b border-blue-100/60 bg-mist py-16 md:py-24"
        >
          <div className="mx-auto max-w-[1360px] px-6">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-6">
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Fluxo Simples: Da Reunião ao GitHub
                </h2>
                <p className="mb-8 text-base leading-relaxed text-gray-600 sm:text-lg">
                  Ative a extensão com dois cliques durante sua <i>Daily</i>. A
                  inteligência artificial resume os pontos-chave e você apenas
                  revisa as tarefas sugeridas antes de criar as issues.
                </p>
                <div className="mb-8 flex flex-wrap items-center gap-3">
                  <a
                    className="inline-flex cursor-pointer items-center rounded-lg bg-black px-4 py-2 text-white transition-opacity hover:opacity-90"
                    href="https://chromewebstore.google.com/"
                  >
                    <ChromeIcon className={"mr-3 h-6 w-6"} />
                    <span className="text-left">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-gray-300">
                        Disponível na
                      </span>
                      <span className="block text-xs font-bold">
                        Chrome Web Store
                      </span>
                    </span>
                  </a>
                  <a
                    className="inline-flex cursor-pointer items-center rounded-lg bg-black px-4 py-2 text-white transition-opacity hover:opacity-90"
                    href="https://addons.mozilla.org/"
                  >
                    <FirefoxIcon className={"mr-3 h-6 w-6"} />
                    <span className="text-left">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-gray-300">
                        Compatível com
                      </span>
                      <span className="block text-xs font-bold">
                        Firefox Add-ons
                      </span>
                    </span>
                  </a>
                  <a
                    className="inline-flex cursor-pointer items-center rounded-lg bg-black px-4 py-2 text-white transition-opacity hover:opacity-90"
                    href="https://microsoftedge.microsoft.com/"
                  >
                    <EdgeIcon className={"mr-3 h-6 w-6"} />
                    <span className="text-left">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-gray-300">
                        Preparado para
                      </span>
                      <span className="block text-xs font-bold">
                        Edge Add-ons
                      </span>
                    </span>
                  </a>
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-blue-200/50 bg-white shadow-2xl">
                  <Image
                    src="/pexels-shuki-harel-361328-4463588.webp"
                    alt="Revisão das anotações e issues geradas"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="vantagens" className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1360px] px-6">
            <h2 className="mb-10 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Vantagens e Componentes do Sistema
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(
                ({
                  title,
                  description,
                  tag,
                  tagClassName,
                  iconContainerClassName,
                  Icon,
                }) => (
                  <div
                    key={title}
                    className="flex flex-col justify-between rounded-3xl border border-gray-200/90 bg-white p-7 transition-shadow hover:shadow-lg"
                  >
                    <div>
                      <div
                        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${iconContainerClassName}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-2 text-lg font-bold text-gray-900">
                        {title}
                      </h3>
                      <p className="mb-6 text-sm leading-relaxed text-gray-600">
                        {description}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tagClassName}`}
                      >
                        {tag}
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 bg-white py-24 text-center">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Quer contribuir com o desenvolvimento do projeto?
            </h2>
            <p className="mb-8 text-base text-gray-600 sm:text-lg">
              Acesse o repositório no GitHub ou consulte a documentação técnica.
            </p>
            <div>
              <a
                className="group inline-flex cursor-pointer items-center text-lg font-semibold text-brand transition-colors hover:text-brand-hover"
                href="http://github.com/felipe-sbm/anota-ai"
              >
                <span>Acessar agora! 🤩</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
