import React from "react"

type Props = {
  isRecording: boolean
  recordingTime: number
  audioBlob: Blob | null
  formatTime: (seconds: number) => string
}

export default function RecorderVisualizer({
  isRecording,
  recordingTime,
  audioBlob,
  formatTime
}: Props) {
  return (
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
  )
}

