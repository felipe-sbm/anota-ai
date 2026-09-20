# Anota aí

![Logo do Anota aí](/apps/extension/assets/logo.png)

## Sobre o projeto

Anota aí é uma aplicação de anotações que utiliza inteligência artificial para facilitar a organização e o acesso às tarefas de equipes de desenvolvimento. O projeto é dividido em três partes principais: ui, api e ia.

## Estrutura

Esta é a estrutura do projeto:

```text
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
│   ├── api/                # FastAPI
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── ai/
│   │   │   └── utils/
│   │   │
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   │
│   └── ui/                 # Next
│       ├── app/
│       │   ├── page.tsx
│       │   ├── layout.tsx
│       │   ├── globals.scss
│       │   ├── login/
│       │   └── dashboard/
│       ├── components/
│       ├── public/
│       └── lib/
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

## Como iniciar

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

    A API estará rodando localmente em `http://localhost:8000`.

3. Inicie a extensão:

    ```bash
    cd apps/extension

    npm install

    npm run dev
    ```

    A extensão estará disponível no navegador para ser testada.

4. Inicie o painel de trabalho:

    ```bash
    cd apps/ui

    npm install

    npm run dev
    ```

    A dashboard fica no `http://localhost:3000` para poder ser acessada e testada.

## 🚧 Estado do projeto

O projeto está em desenvolvimento (🚧), com previsão para terminar em outubro.

### Implementado (versão v0)

* [x] Estrutura inicial do projeto
* [x] Extensão de navegador utilizando Plasmo
* [x] Interface inicial da extensão
* [x] Captura de áudio
* [x] Comunicação com a API
* [x] Autenticação com GitHub
* [x] Estrutura inicial da API
* [x] Organização em monorepo
* [x] Tipos compartilhados
* [x] Documentação inicial

### Desenvolvimento da versão v1

* [x] Página inicial e apresentação do produto
* [x] Pipeline principal utilizando LangGraph
* [ ] Processamento da transcrição
* [ ] Geração estruturada de resumos
* [ ] Identificação de decisões
* [ ] Extração de tarefas
* [ ] Identificação de responsáveis
* [ ] Fluxo de revisão das informações
* [ ] Criação de GitHub Issues
* [ ] Dashboard para visualização dos resultados
* [ ] Escrever o TCC...

### Trabalhos futuros

Algumas funcionalidades poderão ser investigadas posteriormente (depois da apresentaçåo do TCC):

* [ ] Identificação automática dos participantes da reunião
* [ ] Diarização de áudio
* [ ] Integração com outras plataformas de gerenciamento de projetos (talvez, bem talvez mesmo)
* [ ] Recursos relacionados a Scrum
* [ ] Métricas e acompanhamento do trabalho
* [ ] Suporte aprimorado a diferentes navegadores (como o safari)
