# Liga Socialista do Catan - LSC Leaderboard v2

Aplicacao self-hosted para ranking de CATAN do LSC (IC/UNICAMP), com moderacao por admin, API para bots, atualizacoes em tempo real e calendario de partidas.

## Stack

- Frontend: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- Backend: NestJS 10 + Prisma ORM
- Banco: PostgreSQL 16 (`postgres:16-alpine`)
- Auth: NextAuth.js v5 (web) + JWT (API)
- Real-time: Socket.io
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

3. Rode migrations:

```bash
docker compose --profile migrate run --rm migrate
```

4. Popule dados demo (admin, bot, jogadores, partidas e calendario):

```bash
docker compose exec api npx ts-node prisma/seed.ts
```

5. Acesse:
- Web: `http://localhost:3000`
- Calendario: `http://localhost:3000/calendar`
- API health: `http://localhost:4000/health`
- Swagger UI: `http://localhost:4000/api/docs`

## Credenciais demo

- Admin: `admin@example.com` / valor de `ADMIN_PASSWORD` no `.env`
- Players demo: `*@lsc.unicamp.br` / `player123`

## Fluxo de pontuacao

1. Jogador ou bot envia resultado (`pending`)
2. Admin aprova/rejeita
3. Apenas resultados `approved` entram no leaderboard

## Funcionalidades principais

- Leaderboard com filtros e ordenacao
- Agenda de partidas (`scheduled_matches`)
- WebSocket para eventos em tempo real
- Login por email/nickname
- Upload de avatar (ou avatar preset)
- Soft delete para usuarios e partidas

## Endpoints principais

Publicos:
- `GET /health`
- `GET /leaderboard`
- `GET /matches`
- `GET /matches/:id`
- `POST /auth/register`
- `POST /auth/login`

Protegidos (JWT):
- `GET /users/me`
- `PUT /users/me`
- `POST /matches`
- `POST /scheduled-matches`
- `POST /scheduled-matches/:id/join`
- `DELETE /scheduled-matches/:id/leave`

Admin:
- `GET /admin/submissions`
- `POST /admin/submissions/:id/approve`
- `POST /admin/submissions/:id/reject`
- `GET /admin/users`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`

Bot:
- `GET /bot/leaderboard`
- `GET /bot/players`
- `POST /bot/matches`
- `GET /bot/matches/:id`

## Comandos uteis

```bash
# subir stack
docker compose up -d --build

# logs
docker compose logs -f

# derrubar stack
docker compose down

# derrubar com volumes (apaga dados)
docker compose down -v

# abrir psql
docker compose exec db psql -U catan -d catan

# rerun seed
docker compose exec api npx ts-node prisma/seed.ts
```

## Troubleshooting rapido

- API sobe e cai com `Cannot find module '/app/dist/main.js'`:

```bash
docker compose build --no-cache api
docker compose up -d api
```

- Conflito de portas:
  ajuste mapeamentos no `docker-compose.yml`.
