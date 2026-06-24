import { useState, useRef, useEffect } from "react"

function IndexPopup() {
  const [isInsideTab, setIsInsideTab] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [status, setStatus] = useState<"idle" | "recording" | "recorded" | "uploading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Detect if running inside a full tab or the small popup
  useEffect(() => {
    const isTab = window.location.hash === "#tab" || window.innerWidth > 360
    setIsInsideTab(isTab)
  }, [])

  // Open the recorder in a full tab
  const openInTab = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({
        url: chrome.runtime.getURL("popup.html#tab")
      })
      window.close()
    } else {
      // Fallback for testing in normal browser
      window.open(window.location.href + "#tab", "_blank")
    }
  }

  // Start voice recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Select MIME type support
      let options = { mimeType: "audio/webm" }
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/ogg" }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        setStatus("recorded")
        
        // Stop all tracks in the stream to release microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setStatus("recording")
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

    } catch (err: any) {
      console.error("Error accessing microphone:", err)
      setStatus("error")
      setErrorMessage("Permissão negada ou microfone indisponível.")
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Handle Play/Pause
  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Reset recorder
  const resetRecorder = () => {
    setAudioBlob(null)
    setAudioUrl("")
    setRecordingTime(0)
    setStatus("idle")
    setIsPlaying(false)
    setErrorMessage("")
  }

  // Send audio file to FastAPI backend
  const uploadAudio = async () => {
    if (!audioBlob) return
    setStatus("uploading")
    
    const formData = new FormData()
    const filename = `gravacao_${Date.now()}.webm`
    formData.append("file", audioBlob, filename)

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Erro na resposta do servidor")
      }

      const data = await response.json()
      console.log("Upload response:", data)
      setStatus("success")
    } catch (err: any) {
      console.error("Upload error:", err)
      setStatus("error")
      setErrorMessage("Erro ao enviar o áudio para o backend.")
    }
  }

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="recorder-container" style={{ width: isInsideTab ? "450px" : "300px", margin: isInsideTab ? "40px auto" : "0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
        
        .recorder-container {
          padding: 24px;
          background: linear-gradient(135deg, #0f0c20 0%, #15102a 100%);
          color: #f3f4f6;
          font-family: 'Outfit', sans-serif;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .recorder-container::before {
          content: '';
          position: absolute;
          top: -50px;
          left: -50px;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
          z-index: 1;
        }

        .header {
          position: relative;
          z-index: 2;
          margin-bottom: 24px;
        }

        .header h1 {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header p {
          font-size: 12px;
          color: #9ca3af;
          margin: 6px 0 0 0;
          line-height: 1.4;
        }

        .visualizer-box {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 24px;
          z-index: 2;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        .timer {
          font-size: 36px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.5px;
          color: #f3f4f6;
        }

        .wave-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 40px;
          margin-top: 8px;
        }

        .wave-bar {
          width: 3px;
          background: #8b5cf6;
          border-radius: 2px;
          animation: wave 1.2s ease-in-out infinite alternate;
        }

        .wave-bar:nth-child(2) { animation-delay: 0.1s; height: 15px; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; height: 25px; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; height: 35px; }
        .wave-bar:nth-child(5) { animation-delay: 0.4s; height: 20px; }
        .wave-bar:nth-child(6) { animation-delay: 0.5s; height: 10px; }

        @keyframes wave {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }

        .control-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 2;
          position: relative;
        }

        .control-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.6);
        }

        .control-btn.recording {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
          animation: pulse 1.5s infinite;
        }

        .control-btn.recording:hover {
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.6);
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .preview-box {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          z-index: 2;
          position: relative;
        }

        .action-row {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-action {
          flex: 1;
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .btn-play {
          background: rgba(255, 255, 255, 0.1);
          color: #f3f4f6;
        }

        .btn-play:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-trash {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }

        .btn-trash:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .btn-send {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .btn-send:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }

        .status-badge {
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 16px;
          font-weight: 600;
        }

        .status-badge.idle { background: rgba(255, 255, 255, 0.08); color: #9ca3af; }
        .status-badge.recording { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .status-badge.success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .status-badge.error { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .status-badge.uploading { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
      `}</style>

      {isInsideTab ? (
        <>
          <div className="header">
            <h1>Anota aí - Gravador</h1>
            <p>Grave seus pensamentos e envie diretamente para o backend</p>
          </div>

          <div>
            {status === "idle" && (
              <span className="status-badge idle">Pronto para gravar</span>
            )}
            {status === "recording" && (
              <span className="status-badge recording">Gravando...</span>
            )}
            {status === "recorded" && (
              <span className="status-badge idle">Gravação concluída</span>
            )}
            {status === "uploading" && (
              <span className="status-badge uploading">Enviando para o backend...</span>
            )}
            {status === "success" && (
              <span className="status-badge success">Enviado com sucesso!</span>
            )}
            {status === "error" && (
              <span className="status-badge error">Erro: {errorMessage}</span>
            )}
          </div>

          <div className="visualizer-box">
            {isRecording ? (
              <div>
                <div className="timer">{formatTime(recordingTime)}</div>
                <div className="wave-container">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              </div>
            ) : (
              <div className="timer">{formatTime(audioBlob ? recordingTime : 0)}</div>
            )}
          </div>

          {!audioBlob ? (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`control-btn ${isRecording ? "recording" : ""}`}
              aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}>
              {isRecording ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor" />
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
                onEnded={() => setIsPlaying(false)}
                style={{ display: "none" }}
              />
              <div className="action-row" style={{ marginBottom: "16px" }}>
                <button onClick={togglePlayback} className="btn-action btn-play">
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
                <button onClick={resetRecorder} className="btn-action btn-trash">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Limpar
                </button>
              </div>

              {status !== "success" && (
                <button
                  onClick={uploadAudio}
                  disabled={status === "uploading"}
                  className="btn-send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {status === "uploading" ? "Enviando..." : "Enviar ao Backend"}
                </button>
              )}

              {status === "success" && (
                <button onClick={resetRecorder} className="btn-send" style={{ background: "#8b5cf6", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)" }}>
                  Nova Gravação
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="header" style={{ marginBottom: "20px" }}>
            <h1>Anota aí</h1>
            <p>Para gravar com segurança e garantir acesso total ao microfone, abra o gravador em uma nova aba.</p>
          </div>
          <button onClick={openInTab} className="btn-send" style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Abrir Gravador
          </button>
        </>
      )}
    </div>
  )
}

export default IndexPopup
