# Anota aí
Anota aí é uma aplicação de anotações que utiliza inteligência artificial para facilitar a organização e o acesso às tarefas de equipes de desenvolvimento. O projeto é dividido em três partes principais: ui, api e ia.

Esta é a estrutura do projeto:
```
sprint-notes-ai/
│
├── apps/
│   │
│   ├── extension/          # Plasmo
│   │   ├── popup.tsx
│   │   ├── background.ts
│   │   ├── content.ts
│   │   ├── package.json
│   │   └── ...
│   │
│   └── api/                # FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── routes/
│       │   ├── services/
│       │   ├── models/
│       │   ├── ai/
│       │   └── utils/
│       │
│       ├── requirements.txt
│       └── pyproject.toml
│
├── packages/
│   │
│   ├── shared-types/
│   │   ├── sprint.ts
│   │   └── api.ts
│   │
│   └── prompts/
│       ├── summarize.py
│       └── sprint_report.py
│
├── docs/
│   ├── architecture.md
│   └── api.md
│
├── docker/
│   ├── api.Dockerfile
│   └── nginx.conf
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

Como iniciar o projeto:

1. Clone o repositório:
```bash
git clone https://github.com/felipe-sbm/anota-ai.git

cd anota-ai
```

2. Inicie a API:
```bash
cd apps/api

python3 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

3. Inicie a extensão:
```bash
cd apps/extension

npm install

npm run dev
```

A extensão estará disponível no navegador para ser testada. A API estará rodando localmente em `http://localhost:8000`.