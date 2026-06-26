import React from "react"

type Status = "idle" | "recording" | "recorded" | "uploading" | "success" | "error"

type Props = {
  status: Status
  errorMessage: string
}

export default function RecorderStatus({ status, errorMessage }: Props) {
  if (status === "idle") {
    return <span className="status-badge idle">Pronto para gravar</span>
  }

  if (status === "recording") {
    return <span className="status-badge recording">Gravando...</span>
  }

  if (status === "recorded") {
    return <span className="status-badge idle">Gravação concluída</span>
  }

  if (status === "uploading") {
    return <span className="status-badge uploading">Enviando para o backend...</span>
  }

  if (status === "success") {
    return <span className="status-badge success">Enviado com sucesso!</span>
  }

  if (status === "error") {
    return <span className="status-badge error">Erro: {errorMessage}</span>
  }

  return null
}

