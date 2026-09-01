# NexChat

Aplicação de chat em tempo real construída com React/Vite no frontend e FastAPI/WebSocket no backend.

## Stack

- Frontend: React 19 + Vite
- Backend: FastAPI + WebSocket
- Banco: PostgreSQL em produção, SQLite como fallback local
- Autenticação: sessões com token hasheado + PBKDF2-HMAC-SHA256
- Validação WebSocket: Pydantic
- Deploy: Vercel (frontend) + Render (backend e PostgreSQL)

## Estrutura

```text
NexChat/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   └── websocket/
│   ├── tests/
│   └── requirements.txt
└── frontend/
    ├── src/
    ├── package.json
    └── package-lock.json
```

## Desenvolvimento local

### Backend

```bash
cd backend
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Para ferramentas de desenvolvimento e testes:

```bash
pip install -r requirements-dev.txt
```

Inicie a API:

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variáveis de ambiente

### Backend

`DATABASE_URL` é usada pelo ambiente de produção para conectar ao PostgreSQL. Sem ela, o backend usa SQLite localmente.

### Frontend

`VITE_API_URL` define a URL da API HTTP e `VITE_WS_URL` define a URL do WebSocket. Sem essas variáveis, os valores padrão de desenvolvimento/produção definidos no código são utilizados.

## Funcionalidades

- Registro e login
- Sessões autenticadas
- Chat em tempo real via WebSocket
- Reconexão automática
- Fila offline e UI otimista
- Edição e exclusão de mensagens
- Respostas (reply)
- Reações em mensagens
- Perfil com avatar e status
- Interface responsiva para desktop e mobile
- Rolagem automática inteligente

## Qualidade

O projeto possui testes automatizados básicos e GitHub Actions para validar o backend e o build do frontend.

## Licença

MIT
