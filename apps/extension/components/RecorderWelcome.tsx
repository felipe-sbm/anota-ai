import { SquareArrowOutUpRight } from "lucide-react"
import React from "react"

const iconImg = new URL("../assets/icon.png", import.meta.url).toString()

type Props = {
  onOpenInTab: () => void
}

export default function RecorderWelcome({ onOpenInTab }: Props) {
  return (
    <div className="recorder-welcome">
      <div className="recorder-welcome-shell">
        <div className="recorder-welcome-body">
          <div className="recorder-welcome-icon-wrap" aria-hidden="true">
            <img
              src={iconImg}
              alt="Anota Aí Logo"
              className="recorder-welcome-icon"
            />
          </div>

          <div className="recorder-welcome-text">
            <h1 className="recorder-welcome-title">Anota Aí!</h1>
            <p className="recorder-welcome-desc">
              Para começar a facilitar a suas reuniões, abra o app em uma nova aba, pressionando o botão abaixo.
            </p>
          </div>
        </div>

        <button onClick={onOpenInTab} className="btn-open-recorder">
          <SquareArrowOutUpRight size={16} />
          Abrir Gravador
        </button>
      </div>
    </div>
  )
}
