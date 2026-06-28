import { Play, Square, Send, Pause, Eraser } from "lucide-react"

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
          {isRecording ? <Square size={24} /> : <Play size={24} />}
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
                  <Pause size={16} />
                  Pausar
                </>
              ) : (
                <>
                  <Play size={16} />
                  Ouvir
                </>
              )}
            </button>

            <button onClick={onReset} className="btn-action btn-trash">
              <Eraser size={16} />
              Limpar
            </button>
          </div>

          {status !== "success" && (
            <button
              onClick={onUpload}
              disabled={status === "uploading"}
              className="btn-send">
              <Send size={16} />
              {status === "uploading" ? "Enviando..." : "Enviar"}
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