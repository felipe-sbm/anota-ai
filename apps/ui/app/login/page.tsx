"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { GithubIcon } from "@/components/icons";
import { buildGithubLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { token, user, loading, signIn } = useAuth();

  // se o usuário já estiver autenticado, manda direto para o dashboard
  useEffect(() => {
    if (!loading && token && user) {
      router.replace("/dashboard");
    }
  }, [loading, token, user, router]);

  // pega o token que a API envia via redirect após a autenticação
  useEffect(() => {
    if (loading || token) return;

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (!tokenFromUrl) return;

    // limpa a URL para não deixar o token exposto em texto puro
    window.history.replaceState({}, "", "/login");
    signIn(tokenFromUrl);
    router.replace("/dashboard");
  }, [loading, token, router, signIn]);

  function handleGithubLogin() {
    const next = `${window.location.origin}/login`;
    window.location.href = buildGithubLoginUrl(next);
  }

  if (loading || token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-light px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-stone-100 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/icons/theme/logo.webp"
              alt="Logo"
              width={180}
              height={60}
              className="mb-6 h-14 w-auto"
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Bem-vindo(a) de volta!
            </h1>
            <p className="mt-2 max-w-xs text-sm text-stone-500">
              Entre com sua conta GitHub para acessar o seu painel de gravações
              e equipes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGithubLogin}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-brand px-6 py-3.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-hover cursor-pointer"
          >
            <GithubIcon className="h-5 w-5" />
            Entrar com GitHub
          </button>

          <p className="mt-6 text-center text-xs text-stone-400">
            O login usa o OAuth do GitHub e é protegido por JWT.
          </p>
        </div>
      </div>
    </main>
  );
}
