import { useState, useRef, useEffect } from "react"

import "./styles/recorder.css"

import RecorderControls from "./components/RecorderControls"
import RecorderStatus from "./components/RecorderStatus"
import RecorderVisualizer from "./components/RecorderVisualizer"
import RecorderWelcome from "./components/RecorderWelcome"

type Status = "idle" | "recording" | "recorded" | "uploading" | "success" | "error"

function IndexPopup() {
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
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const isTab = window.location.hash === "#tab" || window.innerWidth > 360
    setIsInsideTab(isTab)
  }, [])

  const openInTab = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({
        url: chrome.runtime.getURL("popup.html#tab")
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

      // Escolhe um formato de mídia que o navegador realmente suporta.
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
        const recordedBlob = new Blob(audioChunksRef.current, { type: options.mimeType })
        setAudioBlob(recordedBlob)
        const url = URL.createObjectURL(recordedBlob)
        setAudioUrl(url)
        setStatus("recorded")

        // Libera o microfone encerrando todas as tracks do stream.
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
    setStatus("uploading")

    const formData = new FormData()
    const filename = `gravacao_${Date.now()}.webm`
    formData.append("file", audioBlob, filename)

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])


  return (
    <div
      className="recorder-container"
      style={{ width: isInsideTab ? "450px" : "300px", margin: isInsideTab ? "40px auto" : "0" }}>
      {isInsideTab ? (
        <>
          <div className="header">
            <h1>Anota aí - Gravador</h1>
            <p>Grave seus pensamentos e envie diretamente para o backend</p>
          </div>

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
            onStartStop={() => (isRecording ? stopRecording() : startRecording())}
            onTogglePlayback={togglePlayback}
            onReset={resetRecorder}
            onUpload={uploadAudio}
          />
        </>
      ) : (
        <RecorderWelcome onOpenInTab={openInTab} />
      )}
    </div>
  )
}

export default IndexPopup

