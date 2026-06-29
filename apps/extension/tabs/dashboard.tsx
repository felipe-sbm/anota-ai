import { useEffect, useRef, useState } from "react"

import "../styles/recorder.scss"
import "../styles/dashboard.scss"
import "../styles/dashboard-page.scss"

import Header from "../components/Header"
import HistoryDashboard from "../components/HistoryDashboard"

import RecorderControls from "../components/RecorderControls"

import RecorderStatus from "../components/RecorderStatus"
import RecorderVisualizer from "../components/RecorderVisualizer"
import RecordingDetail from "../components/RecordingDetail"
import Sidebar from "../components/Sidebar"
import { API_BASE, AUTH_LOGIN_URL, AUTH_SUCCESS_URL_PREFIX, AUTH_TOKEN_KEY } from "../config"
import { GithubIcon } from "lucide-react";

import TeamsTab from "./teams"

type Status = "idle" | "recording" | "recorded" | "uploading" | "success" | "error"
type AuthState = "unknown" | "authenticated" | "unauthenticated"
type Tab = "recorder" | "history" | "teams"

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

const Logo = new URL("../assets/logo.png", import.meta.url).toString()

export default function DashboardPage() {
  const [authState, setAuthState] = useState<AuthState>("unknown")
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("recorder")
  const [selectedRecord, setSelectedRecord] = useState<Recording | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [recordingCount, setRecordingCount] = useState<number>(0)

  useEffect(() => {
    const chromeAny = (window as any).chrome
    const loadCount = async () => {
      try {
        const tokenResp = await chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY)
        const token = tokenResp?.[AUTH_TOKEN_KEY] as string | undefined
        if (!token) return

        const resp = await fetch(`${API_BASE}/api/audio/records/count`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) return
        const data = await resp.json()
        const c = typeof data?.count === "number" ? data.count : 0
        setRecordingCount(c)
      } catch {
        // noop
      }
    }

    loadCount()
  }, [])

  const [githubLogin, setGithubLogin] = useState("")
  const [githubAvatarUrl, setGithubAvatarUrl] = useState<string | undefined>(undefined)


  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const chromeAny = (window as any).chrome
    const loadToken = async () => {
      try {
        const data = await chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY)
        const token = data?.[AUTH_TOKEN_KEY] as string | undefined

        if (!token) {
          setAuthState("unauthenticated")
          return
        }

        setAuthState("authenticated")
        hydrateUserFromToken(token)
        hydrateAvatarFromBackend(token)


      } catch {
        setAuthState("unauthenticated")
      }
    }

    loadToken()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  const hydrateUserFromToken = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      if (payload.github_login) setGithubLogin(payload.github_login)
    } catch {}
  }

  const hydrateAvatarFromBackend = (token: string) => {
    fetch(`${API_BASE}/api/auth/github/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((resp) => {
        if (!resp.ok) return null
        return resp.json()
      })
      .then((data) => {
        if (data?.avatar_url) setGithubAvatarUrl(data.avatar_url)
      })
      .catch(() => {})
  }



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
              hydrateUserFromToken(token)
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

  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const defaultMimeType = "audio/webm"
      const fallbackMimeType = "audio/ogg"
      const options = {
        mimeType: MediaRecorder.isTypeSupported(defaultMimeType) ? defaultMimeType : fallbackMimeType
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: options.mimeType })
        setAudioBlob(recordedBlob)
        setAudioUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl)
          return URL.createObjectURL(recordedBlob)
        })
        setStatus("recorded")
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setStatus("recording")
      setRecordingTime(0)
      setErrorMessage("")

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
      if (timerRef.current) clearInterval(timerRef.current)
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
    setAudioUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return ""
    })
    setRecordingTime(0)
    setStatus("idle")
    setIsPlaying(false)
    setErrorMessage("")
  }

  const uploadAudio = async () => {
    if (!audioBlob) return
    setStatus("uploading")

    const formData = new FormData()
    formData.append("file", audioBlob, `gravacao_${Date.now()}.webm`)

    try {
      const chromeAny = (window as any).chrome
      const tokenResp = await chromeAny?.storage?.local?.get(AUTH_TOKEN_KEY)
      const token = tokenResp?.[AUTH_TOKEN_KEY] as string | undefined

      if (!token) {
        setStatus("error")
        setErrorMessage("Sessão expirada. Faça login novamente.")
        return
      }

      const uploadResponse = await fetch(`${API_BASE}/api/audio/upload`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text()
        throw new Error(`Upload falhou: ${uploadResponse.status} - ${errText}`)
      }

      const uploadData = await uploadResponse.json()
      const processResponse = await fetch(`${API_BASE}/api/process-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          file_id: uploadData.file_id,
          repo_full_name: null,
          assignees: []
        })
      })

      if (!processResponse.ok) {
        const errText = await processResponse.text()
      console.warn("Processamento falhou, mas upload foi concluído:", errText)
      }

      setStatus("success")
      setRecordingCount((count) => count + 1)
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

  if (authState === "unknown") {
    return (
      <div className="dashboard-page">
        <div className="auth-loading">
          <div className="auth-loading-spinner" />
          <p>Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (authState === "unauthenticated") {
    return (
      <div className="dashboard-page">
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-card-icon">
              <img src={Logo} alt="Anota AI" className="auth-logo" />
            </div>
            <h1 className="auth-card-title">Anota aí</h1>
            <p className="auth-card-desc">
              Faça login com GitHub para gravar áudios, transcrever e criar tasks automaticamente nos seus repositórios.
            </p>
            <button onClick={loginWithGithub} className="btn-login">
              <GithubIcon size={16} />
              Entrar com GitHub
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="app-dashboard">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setSelectedRecord(null)
          }}
          userName={githubLogin || undefined}
          recordingCount={recordingCount}
          isCollapsed={sidebarCollapsed}
          isInsideTab
        />
        <div className="dashboard-shell">
          <Header
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
            userName={githubLogin || undefined}
            userAvatarUrl={githubAvatarUrl}
            recordingCount={recordingCount}
          />

          <main className="app-content">
            {selectedRecord ? (
              <RecordingDetail record={selectedRecord} onBack={() => setSelectedRecord(null)} />
            ) : (
              <>
                <div className="tab-content" style={{ display: activeTab === "recorder" ? "block" : "none" }}>
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
                        if (isRecording) stopRecording()
                        else startRecording()
                      }}
                      onTogglePlayback={togglePlayback}
                      onReset={resetRecorder}
                      onUpload={uploadAudio}
                    />
                  </div>
                </div>
                <div className="tab-content" style={{ display: activeTab === "history" ? "block" : "none" }}>
                  <div className="history-panel">
                    <HistoryDashboard
                      onViewDetail={(record) => setSelectedRecord(record)}
                    />
                  </div>
                </div>
                <div className="tab-content" style={{ display: activeTab === "teams" ? "block" : "none" }}>
                  <div className="teams-panel">
                    <TeamsTab />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
