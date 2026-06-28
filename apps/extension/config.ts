// Configurações centralizadas da extensão
// Variáveis de ambiente com prefixo PLASMO_PUBLIC_ são expostas ao frontend

export const AUTH_TOKEN_KEY = "anota_ai_access_token"

export const API_BASE = process.env.PLASMO_PUBLIC_API_BASE || "http://localhost:8000"

export const AUTH_LOGIN_URL = `${API_BASE}/api/auth/github/login`

export const AUTH_SUCCESS_URL_PREFIX = `${API_BASE}/api/auth/github/success`