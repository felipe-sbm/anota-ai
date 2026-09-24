"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, FileAudio } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { fetchAudioRecords, type AudioRecord } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function RecordingsPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
      return;
    }

    if (token === null) return;

    const authToken: string = token;

    async function loadRecords() {
      try {
        const data = await fetchAudioRecords(authToken, 200);
        setRecords(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRecords(false);
      }
    }

    loadRecords();
  }, [loading, router, token]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-stone-400">Carregando…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            Gravações
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Lista das gravações com resumo e transcrição em cada detalhe.
          </p>
        </div>
        <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
          {records.length} gravações
        </div>
      </div>

      {loadingRecords ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-sm text-stone-500">
          Carregando gravações…
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-500">
          Nenhuma gravação foi encontrada para este usuário.
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => router.push(`/dashboard/gravacoes/${record.id}`)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left transition hover:border-stone-300 hover:bg-stone-100 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand ring-1 ring-stone-200">
                    <FileAudio className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 truncate">
                    <p className="truncate text-base font-medium text-stone-900">
                      {record.original_filename || record.filename}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{formatDate(record.created_at)}</span>
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
                  Abrir
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
