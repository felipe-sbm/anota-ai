import { useState, useRef, useEffect } from "react"

import "./styles/recorder.css"
import "./styles/dashboard.css"
const Logo = new URL("./assets/logo.png", import.meta.url).toString()

import RecorderControls from "./components/RecorderControls"
import RecorderStatus from "./components/RecorderStatus"
import RecorderVisualizer from "./components/RecorderVisualizer"
import RecorderWelcome from "./components/RecorderWelcome"
import RecordingDetail from "./components/RecordingDetail"
import Sidebar from "./components/Sidebar"
import HistoryDashboard from "./components/HistoryDashboard"

import { AUTH_TOKEN_KEY, API_BASE, AUTH_LOGIN_URL, AUTH_SUCCESS_URL_PREFIX } from "./config"

type Status = "idle" | "recording" | "recorded" | "uploading" | "success" | "error"

type AuthState = "unknown" | "authenticated" | "unauthenticated"

type Tab = "recorder" | "history"

type Recording = {
  id: string
  file_id: string
  filename: string
  original_filename: string
  created_at: string
  status: string
  transcript: string | null
  summary: string | null
  tasks: { title: string; body: string; assignees: string[] }[] | null
  created_issues: { number: number; html_url: string }[] | null
  repo_full_name: string | null
  error_message: string | null
}

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
  const [activeTab, setActiveTab] = useState<Tab>("recorder")
  const [selectedRecord, setSelectedRecord] = useState<Recording | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [recordingCount, setRecordingCount] = useState(0)
  const [githubLogin, setGithubLogin] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const isTab = window.location.hash === "#tab" || window.innerWidth > 360
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
        url: chromeAny.runtime.getURL("popup.html#tab")
      })
      window.close()
    } else {
      window.open(window.location.href + "#tab", "_blank")
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

      const response = await fetch(`${API_BASE}/api/audio/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error("Erro na resposta do servidor")
      }

      await response.json()
      setStatus("success")
    } catch (err: any) {
      console.error("Upload error:", err)
      setStatus("error")
      setErrorMessage("Erro ao enviar o áudio para o backend.")
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
        if (data && data[AUTH_TOKEN_KEY]) setAuthState("authenticated")
        else setAuthState("unauthenticated")
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
    <div className="app-layout">
      {isInsideTab ? (
        <>
          {authState === "unknown" && (
            <div className="auth-loading" style={{ minHeight: "100vh" }}>
              <div className="auth-loading-spinner" />
              <p>Verificando autenticação...</p>
            </div>
          )}

          {authState === "unauthenticated" && (
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Entrar com GitHub
                </button>
              </div>
            </div>
          )}

          {authState === "authenticated" && (
            <div className="app-dashboard">
              <Sidebar
                activeTab={activeTab}
                onTabChange={(tab) => { setActiveTab(tab); setSelectedRecord(null) }}
                userName={githubLogin || undefined}
                recordingCount={recordingCount}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
              <main className="app-content">
                {selectedRecord ? (
                  <RecordingDetail record={selectedRecord} onBack={() => setSelectedRecord(null)} />
                ) : activeTab === "recorder" ? (
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
                ) : (
                  <div className="history-panel">
                    <HistoryDashboard
                      onViewDetail={(record) => setSelectedRecord(record)}
                      onRecordsLoaded={(count) => {
                        setRecordingCount(count)
                        if (!githubLogin) {
                          const chromeAny = (window as any).chrome
                          chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY, (data: any) => {
                            try {
                              const token = data?.[AUTH_TOKEN_KEY]
                              if (token) {
                                const payload = JSON.parse(atob(token.split(".")[1]))
                                if (payload.github_login) setGithubLogin(payload.github_login)
                              }
                            } catch {}
                          })
                        }
                      }}
                    />
                  </div>
                )}
              </main>
            </div>
          )}
        </>
      ) : (
        <RecorderWelcome onOpenInTab={openInTab} />
      )}
    </div>
  )
}

export default IndexPopup