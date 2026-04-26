# Liga Socialista do Catan - LSC Leaderboard

Aplicacao self-hosted para ranking de CATAN do LSC (IC/UNICAMP), com moderacao de pontuacao por admin e API para bots.

## Stack

- Web: React + Vite (container Nginx)
- API: Node.js + Express + PostgreSQL
- Banco: PostgreSQL 18 (`postgres:18-alpine`)
- Orquestracao: Docker Compose

## Subir localmente

1. Copie variaveis de ambiente:

```bash
cp .env.example .env
```

2. Suba a stack:

```bash
docker compose up -d --build
```

3. Acesse:
- Web: `http://localhost:3000`
- API health: `http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/api/v1/docs`

## Fluxo de pontuacao

1. Jogador ou bot envia resultado estruturado de partida (`pending`)
2. Admin aprova/rejeita
3. Apenas resultados `approved` entram no ranking

## Regras principais

- Leaderboard ordena por padrao por `vitorias` (com filtros e ordenacao customizavel)
- Usuarios podem usar avatar preset CATAN ou upload de imagem
- Login aceita email ou nickname
- Admin pode editar/excluir partidas passadas
- Exclusoes de usuarios e partidas sao logicas (historico preservado)

## API para bot

Autenticacao por bearer token (hash guardado no banco).

Token padrao inicial: valor de `BOT_DEFAULT_TOKEN` no `.env`.

Endpoints:
- `GET /api/v1/bot/leaderboard`
- `POST /api/v1/bot/matches`
- `GET /api/v1/bot/matches/:id`
- `GET /api/v1/bot/players?query=...`

## Endpoints de administracao adicionados

- `GET /api/v1/admin/users`
- `PUT /api/v1/admin/users/:id`
- `DELETE /api/v1/admin/users/:id` (remocao logica)
- `PUT /api/v1/admin/matches/:id`
- `DELETE /api/v1/admin/matches/:id` (remocao logica)

## Observacoes de deploy com Nginx Proxy Manager

- Exponha apenas o container `web` (porta 80 interna / 3000 host)
- `api` e `db` devem permanecer internos na rede do compose
- O frontend usa `/api/*` e o Nginx interno do `web` faz proxy para `api:4000`
