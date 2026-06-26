import React from "react"

type Props = {
  onOpenInTab: () => void
}

export default function RecorderWelcome({ onOpenInTab }: Props) {
  return (
    <>
      <div className="header" style={{ marginBottom: "20px" }}>
        <h1>Anota aí</h1>
        <p>Para gravar com segurança e garantir acesso total ao microfone, abra o gravador em uma nova aba.</p>
      </div>

      <button
        onClick={onOpenInTab}
        className="btn-send"
        style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Abrir Gravador
      </button>
    </>
  )
}

