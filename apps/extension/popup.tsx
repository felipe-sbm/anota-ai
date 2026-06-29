import { useState, useRef, useEffect } from "react"

import "./styles/recorder.css"
const Logo = new URL("./assets/logo.png", import.meta.url).toString()

import RecorderControls from "./components/RecorderControls"
import RecorderStatus from "./components/RecorderStatus"
import RecorderVisualizer from "./components/RecorderVisualizer"
import RecorderWelcome from "./components/RecorderWelcome"
import { AUTH_TOKEN_KEY, API_BASE, AUTH_LOGIN_URL, AUTH_SUCCESS_URL_PREFIX } from "./config"
import { GithubIcon, SquareArrowOutUpRight } from "lucide-react"

type Status = "idle" | "recording" | "recorded" | "uploading" | "success" | "error"

type AuthState = "unknown" | "authenticated" | "unauthenticated"

function IndexPopup() {
  const [authState, setAuthState] = useState<AuthState>("unknown")
  const [isInsideTab, setIsInsideTab] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const isTab =
      window.location.hash === "#tab" ||
      window.location.pathname.endsWith("/tabs/dashboard.html")
    setIsInsideTab(isTab)
  }, [])

  const loginWithGithub = () => {
    const chromeAny = (window as any).chrome
    if (!chromeAny?.tabs?.create) {
      window.location.href = AUTH_LOGIN_URL
      return
    }

    chromeAny.tabs.create({ url: AUTH_LOGIN_URL }, (tab: any) => {
      if (!tab) return

      const listener = (tabId: number, changeInfo: any) => {
        if (tabId !== tab.id) return
        if (changeInfo.url?.startsWith(AUTH_SUCCESS_URL_PREFIX)) {
          const url = new URL(changeInfo.url)
          const token = url.searchParams.get("token")
          if (token) {
            chromeAny.storage.local.set({ [AUTH_TOKEN_KEY]: token }, () => {
              setAuthState("authenticated")
              chromeAny.tabs.remove(tabId)
            })
          }
        }
      }

      chromeAny.tabs.onUpdated.addListener(listener)

      const removeListener = (closedTabId: number) => {
        if (closedTabId === tab.id) {
          chromeAny.tabs.onUpdated.removeListener(listener)
          chromeAny.tabs.onRemoved.removeListener(removeListener)
        }
      }
      chromeAny.tabs.onRemoved.addListener(removeListener)
    })
  }

  const openInTab = () => {
    const chromeAny = (window as any).chrome
    if (chromeAny && chromeAny.tabs && chromeAny.runtime) {
      chromeAny.tabs.create({
        url: chromeAny.runtime.getURL("tabs/dashboard.html")
      })
      window.close()
    } else {
      window.open(new URL("/tabs/dashboard.html", window.location.href).toString(), "_blank")
    }
  }

  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const defaultMimeType = "audio/webm"
      const fallbackMimeType = "audio/ogg"
      const options = { mimeType: MediaRecorder.isTypeSupported(defaultMimeType) ? defaultMimeType : fallbackMimeType }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: options.mimeType })
        setAudioBlob(recordedBlob)
        const url = URL.createObjectURL(recordedBlob)
        setAudioUrl(url)
        setStatus("recorded")

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

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

  const resetRecorder = () => {
    setAudioBlob(null)
    setAudioUrl("")
    setRecordingTime(0)
    setStatus("idle")
    setIsPlaying(false)
    setErrorMessage("")
  }

  const uploadAudio = async () => {
    if (!audioBlob) return
    if (authState !== "authenticated") {
      loginWithGithub()
      return
    }

    setStatus("uploading")

    const formData = new FormData()
    const filename = `gravacao_${Date.now()}.webm`
    formData.append("file", audioBlob, filename)

    try {
      const chromeAny = (window as any).chrome
      const tokenResp = await chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY)
      const token = tokenResp?.[AUTH_TOKEN_KEY] as string | undefined

      if (!token) {
        setStatus("error")
        setErrorMessage("Sessão expirada. Faça login com GitHub para gravar/enviar.")
        return
      }

      // 1. Upload do áudio
      const uploadResponse = await fetch(`${API_BASE}/api/audio/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text()
        throw new Error(`Upload falhou: ${uploadResponse.status} - ${errText}`)
      }

      const uploadData = await uploadResponse.json()
      const fileId = uploadData.file_id

      // 2. Dispara o processamento automaticamente
      setStatus("uploading")
      setErrorMessage("Transcrevendo áudio...")

      const processResponse = await fetch(`${API_BASE}/api/process-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          file_id: fileId,
          repo_full_name: null,
          assignees: []
        })
      })

      if (!processResponse.ok) {
        const errText = await processResponse.text()
        console.warn("Processamento falhou, mas upload foi concluído:", errText)
        // Não falha totalmente - o upload já foi feito e o registro criado
      } else {
        await processResponse.json()
      }

      setStatus("success")
    } catch (err: any) {
      console.error("Upload error:", err)
      setStatus("error")
      setErrorMessage(err.message || "Erro ao enviar o áudio para o backend.")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    const chromeAny = (window as any).chrome
    const loadToken = async () => {
      try {
        if (!chromeAny?.storage?.local) {
          setAuthState("unauthenticated")
          return
        }
        const data = await chromeAny.storage.local.get(AUTH_TOKEN_KEY)
        const token = data?.[AUTH_TOKEN_KEY] as string | undefined
        if (!token) {
          setAuthState("unauthenticated")
          return
        }

        setAuthState("authenticated")
      } catch {
        setAuthState("unauthenticated")
      }
    }
    loadToken()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])


  return (
    <div className={`app-layout ${!isInsideTab ? "popup-shell" : ""}`}>
      {authState === "unknown" && (
        <div className="auth-loading" style={{ minHeight: !isInsideTab ? "420px" : "100vh" }}>
          <div className="auth-loading-spinner" />
          <p>Verificando autenticação...</p>
        </div>
      )}

      {authState === "unauthenticated" && (
        !isInsideTab ? (
          <div className="popup-shell-content">
            <RecorderWelcome />
            <footer className="popup-footer">
              <button onClick={openInTab} className="btn-open-recorder">
                <SquareArrowOutUpRight size={16} />
                Abrir o painel de controle
              </button>
            </footer>
          </div>
        ) : (
          <div className="auth-page">
            <div className="auth-card">
              <div className="auth-card-icon">
                <img src={Logo} alt="Anota AI" className="w-10 h-10" /> 
              </div>
              <h1 className="auth-card-title">Anota aí</h1>
              <p className="auth-card-desc">
                Faça login com GitHub para gravar áudios, transcrever e criar tasks automaticamente nos seus repositórios.
              </p>
              <button onClick={loginWithGithub} className="btn-github-login">
                <GithubIcon size={16} />
                Entrar com GitHub
              </button>
            </div>
          </div>
        )
      )}

      {authState === "authenticated" && (
        <div className="popup-shell-content">
          <main className="popup-recorder-main">
            <div className="recorder-panel">
              <RecorderStatus status={status} errorMessage={errorMessage} />
              <RecorderVisualizer
                isRecording={isRecording}
                recordingTime={recordingTime}
                audioBlob={audioBlob}
                formatTime={formatTime}
              />
              <RecorderControls
                audioBlob={audioBlob}
                isRecording={isRecording}
                isPlaying={isPlaying}
                audioUrl={audioUrl}
                audioRef={audioRef}
                status={status}
                errorMessage={errorMessage}
                onStartStop={() => {
                  if (!isRecording) { startRecording() }
                  else { stopRecording() }
                }}
                onTogglePlayback={togglePlayback}
                onReset={resetRecorder}
                onUpload={uploadAudio}
              />
            </div>
          </main>

          <footer className="popup-footer">
            {!isInsideTab && (
              <button onClick={openInTab} className="btn-open-recorder">
                <SquareArrowOutUpRight size={16} />
                Abrir o painel de controle
              </button>
            )}
          </footer>
        </div>
      )}
    </div>
  )
}

export default IndexPopup
