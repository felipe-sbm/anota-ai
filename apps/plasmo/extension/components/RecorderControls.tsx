import React from "react"

type Props = {
  audioBlob: Blob | null
  isRecording: boolean
  isPlaying: boolean
  audioUrl: string
  audioRef: React.RefObject<HTMLAudioElement | null>
  status: "idle" | "recording" | "recorded" | "uploading" | "success" | "error"
  errorMessage: string
  onStartStop: () => void
  onTogglePlayback: () => void
  onReset: () => void
  onUpload: () => void
}

export default function RecorderControls({
  audioBlob,
  isRecording,
  isPlaying,
  audioRef,
  audioUrl,
  status,
  onStartStop,
  onTogglePlayback,
  onReset,
  onUpload
}: Props) {
  return (
    <>
      {!audioBlob ? (
        <button
          onClick={onStartStop}
          className={`control-btn ${isRecording ? "recording" : ""}`}
          aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}>
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path
                d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                fill="currentColor" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>
      ) : (
        <div className="preview-box">
          <audio
            ref={audioRef}
            src={audioUrl}
            style={{ display: "none" }}
          />

          <div className="action-row" style={{ marginBottom: "16px" }}>
            <button onClick={onTogglePlayback} className="btn-action btn-play">
              {isPlaying ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Pausar
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Ouvir
                </>
              )}
            </button>

            <button onClick={onReset} className="btn-action btn-trash">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Limpar
            </button>
          </div>

          {status !== "success" && (
            <button
              onClick={onUpload}
              disabled={status === "uploading"}
              className="btn-send">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {status === "uploading" ? "Enviando..." : "Enviar ao Backend"}
            </button>
          )}

          {status === "success" && (
            <button
              onClick={onReset}
              className="btn-send"
              style={{ background: "#8b5cf6", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)" }}>
              Nova Gravação
            </button>
          )}
        </div>
      )}
    </>
  )
}

