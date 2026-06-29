const iconImg = new URL("../assets/icon.png", import.meta.url).toString()

export default function RecorderWelcome() {
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
              Abra a página para ver os resultados. Esta janela fica só para gravação.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
