# Anota aí

![Logo do Anota aí](/apps/ui/public/icons/theme/logo.svg)

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

    python3 run.py
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

## Estado do projeto

O escopo funcional da versão experimental está implementado. O projeto inclui captura, transcrição, processamento por IA, revisão de tarefas, integração com GitHub, dashboard, sprints e métricas de desempenho.

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
* [x] Processamento da transcrição
* [x] Geração estruturada de resumos
* [x] Identificação de decisões
* [x] Extração de tarefas
* [x] Identificação de responsáveis
* [x] Fluxo de revisão das informações
* [x] Criação de GitHub Issues
* [x] Página de Sprints (sprint backlog, Story Points, progresso e burndown)
* [x] Dashboard para visualização dos resultados
* [x] Métricas, burnup e burndown
* [x] Testes automatizados da API
* [x] Documentação técnica com MkDocs e mkdocstrings
* [ ] Avaliação experimental e redação do TCC

> O processamento dos áudios utiliza o Whisper. Enquanto a geração estruturada de resumos e a identificação de decisões usam Groq ou Ollama quando `LLM_SUMMARIZATION_ENABLED=true`.

### Trabalhos futuros para a versão v2

Algumas funcionalidades poderão ser investigadas posteriormente (depois da apresentaçåo do TCC):

* [ ] Identificação automática dos participantes da reunião
* [ ] Diarização de áudio
* [ ] Integração com outras plataformas de gerenciamento de projetos (talvez, bem talvez mesmo)
* [ ] Planning Poker, gestão de cerimônias e Kanban (scrum completo)
* [ ] Suporte aprimorado a diferentes navegadores (como o safari)

## Testes e documentação

Para executar os testes da API:

```bash
cd apps/api
.venv/bin/python -m pytest -q
```

Para gerar a documentação técnica:

```bash
cd apps/api
.venv/bin/python -m pip install -r requirements-dev.txt
cd ../..
apps/api/.venv/bin/mkdocs serve
```

A documentação publicada é configurada em [`mkdocs.yml`](mkdocs.yml) e usa
`mkdocstrings` para gerar a referência da API diretamente a partir dos módulos
Python e de suas docstrings no estilo Google.

## Limitações da versão experimental

A versão atual não realiza diarização automática de áudio. A identificação de
responsáveis depende de nomes, aliases e logins disponíveis no contexto do
projeto. As métricas podem indicar histórico parcial quando não existem eventos
registrados para todas as issues.
