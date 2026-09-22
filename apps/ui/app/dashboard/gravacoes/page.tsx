"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, Clock3, FileAudio } from "lucide-react";

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

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    UPLOADED: "Enviado",
    PROCESSING: "Processando...",
    PROCESSED: "Processado",
    REVIEWED: "Revisado",
    ERROR: "Erro",
  };
  return map[status] || status;
};

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
        const data = await fetchAudioRecords(authToken, 50);
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
            Histórico de áudios enviados e processados.
          </p>
        </div>
        <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
          {records.length} registros
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
        <div className="space-y-4">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-3xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 text-brand shadow-sm ring-1 ring-stone-200">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-stone-900">
                      {record.original_filename || record.filename}
                    </h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs font-mono tracking-tighter text-stone-500">
                      <p className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span className="mt-0.5">
                          {formatDate(record.created_at)}
                        </span>
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <AudioLines className="h-3.5 w-3.5" />
                        <span className="mt-0.5">{record.file_id}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <span className="inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-700 ring-1 ring-stone-200">
                  {getStatusLabel(record.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-stone-600 md:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">
                    Tarefas extraídas
                  </p>
                  <p className="mt-2 text-lg font-medium text-stone-900">
                    {Array.isArray(record.tasks) ? record.tasks.length : 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">
                    Decisões
                  </p>
                  <p className="mt-2 text-lg font-medium text-stone-900">
                    {Array.isArray(record.decisions)
                      ? record.decisions.length
                      : 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">
                    Tarefas criadas
                  </p>
                  <p className="mt-2 text-lg font-medium text-stone-900">
                    {Array.isArray(record.created_issues)
                      ? record.created_issues.length
                      : 0}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
