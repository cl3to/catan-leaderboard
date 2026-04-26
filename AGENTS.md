# Repository Context: LSC Catan Leaderboard v2.0

## Overview
Full-stack Catan leaderboard application for LSC (Laboratório de Sistemas de Computação/IC/UNICAMP). Migrated from Express + React to **NestJS + Next.js + TypeScript** with WebSocket real-time updates, calendar scheduling, and Docker-first development.

## Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Backend**: NestJS 10 + TypeScript + Prisma ORM
- **Database**: PostgreSQL 16
- **Authentication**: NextAuth.js v5 + JWT (NestJS)
- **Real-time**: Socket.io (WebSockets)
- **API Documentation**: Swagger/OpenAPI (NestJS built-in)
- **Package Manager**: pnpm workspaces (monorepo)
- **Containerization**: Docker + Docker Compose

## Project Structure

```
/home/cl3t0/workspace/catan/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # JWT authentication
│   │   │   ├── users/          # User management
│   │   │   ├── matches/        # Match submissions
│   │   │   ├── leaderboard/    # Score calculations
│   │   │   ├── admin/          # Admin operations
│   │   │   ├── bot/            # Bot API
│   │   │   ├── scheduled-matches/ # Calendar API
│   │   │   ├── gateway/        # WebSocket gateway
│   │   │   ├── prisma/         # Database service
│   │   │   ├── common/         # Guards, decorators, interceptors
│   │   │   └── main.ts         # Bootstrap
│   │   ├── prisma/             # Prisma schema + seed script
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router
│       │   ├── api/auth/       # NextAuth handlers
│       │   ├── page.tsx        # Home/Leaderboard
│       │   ├── login/page.tsx  # Login page
│       │   ├── calendar/page.tsx # Scheduled matches page
│       │   └── ...
│       ├── components/         # React components
│       ├── lib/                # Utilities, API client
│       ├── hooks/              # Custom React hooks
│       ├── Dockerfile
│       └── package.json
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose
- No local Node.js needed (everything runs in containers)

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
# Edit .env with your values
```

2. Start all services:
```bash
docker compose up -d --build
```

3. Run database migrations:
```bash
docker compose --profile migrate run --rm migrate
```

4. Seed admin + demo data (players, matches, scheduled matches):
```bash
docker compose exec api npx ts-node prisma/seed.ts
```

5. Access the application:
- Web App: http://localhost:3000
- API: http://localhost:4000
- Swagger Docs: http://localhost:4000/api/docs
- API Health: http://localhost:4000/health

### Environment Variables (Required in .env)

```bash
# Database
POSTGRES_DB=catan
POSTGRES_USER=catan
POSTGRES_PASSWORD=<secure-password>

# Authentication
JWT_SECRET=<32-char-random-string>
NEXTAUTH_SECRET=<another-32-char-random-string>

# Admin (auto-created)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<secure-password>
ADMIN_FULL_NAME=Administrator
ADMIN_NICKNAME=admin

# Bot API
BOT_DEFAULT_TOKEN=<bot-token>
```

Generate secrets:
```bash
openssl rand -base64 32
```

## Key Commands

```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (data loss!)
docker compose down -v

# Run database migrations
docker compose --profile migrate run --rm migrate

# Seed database (admin, bot, demo users/matches/calendar)
docker compose exec api npx ts-node prisma/seed.ts

# Access database
docker compose exec db psql -U catan -d catan

# Backup database manually
docker compose --profile backup run --rm backup pg_dump -h db -U catan -d catan > backup.sql

# View specific service logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db
```

## Database Schema

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Accounts | id, email, password_hash, role, is_active, deleted_at (soft delete) |
| `player_profiles` | Extended info | user_id, nickname, category, avatar |
| `match_submissions` | Match results | UUID pk, status (pending/approved/rejected) |
| `match_submission_players` | Participants | placement, victory_points, is_winner |
| `score_events` | Computed scores | points_delta, is_win |
| `audit_logs` | Admin actions | actor, action, target, meta (JSONB) |
| `bot_clients` | Bot apps | id, name |
| `bot_tokens` | Bot auth | token_hash, scopes[], is_active |
| `scheduled_matches` | Future games | UUID pk, scheduled_date, min/max_players |
| `scheduled_match_players` | Joined players | match_id, user_id |

### Soft Delete Pattern
- `deleted_at`, `deleted_by_user_id`, `delete_reason` on users and matches
- Prisma middleware automatically filters deleted records
- Use explicit `{ deletedAt: { not: null } }` to query deleted

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /leaderboard` - Get rankings (with filters)
- `GET /matches` - List matches
- `GET /matches/:id` - Get match details
- `POST /auth/register` - Register
- `POST /auth/login` - Login

### Protected (requires JWT Bearer token)
- `GET /auth/me` - Current user
- `GET /users/me` - My profile
- `PUT /users/me` - Update profile
- `POST /matches` - Submit match
- `POST /scheduled-matches` - Create scheduled match
- `POST /scheduled-matches/:id/join` - Join match
- `DELETE /scheduled-matches/:id/leave` - Leave match

### Admin (requires admin role)
- `GET /admin/submissions` - Pending submissions
- `POST /admin/submissions/:id/approve` - Approve match
- `POST /admin/submissions/:id/reject` - Reject match
- `GET /admin/users` - List users
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Soft delete user
- `PUT /admin/matches/:id` - Update match
- `DELETE /admin/matches/:id` - Soft delete match

### Bot API (requires bot token)
- `GET /bot/leaderboard` - Get leaderboard
- `GET /bot/players` - List players
- `POST /bot/matches` - Submit match via bot
- `GET /bot/matches/:id` - Get match details

## WebSocket Events

### Client → Server
- `leaderboard:subscribe` - Subscribe to updates

### Server → Client
- `leaderboard:update` - Score changes
- `match:approved` - Match approved
- `match:submitted` - New submission
- `scheduled-match:created` - New scheduled match
- `scheduled-match:updated` - Players joined/left
- `scheduled-match:cancelled` - Match cancelled
- `presence:online` - User came online
- `presence:offline` - User went offline

## Authentication Flow

1. User submits credentials to `/auth/login`
2. NestJS validates and returns JWT access token
3. NextAuth stores token in session
4. Client includes token in `Authorization: Bearer <token>` header
5. NestJS validates token via JWT strategy

## Security Features

- Helmet for security headers
- Rate limiting (100 req/min)
- CORS configured
- JWT with 12h expiration
- bcrypt password hashing (12 rounds)
- Soft deletes (no data loss)
- Input validation via class-validator
- Audit logging for admin actions
- Bot token authentication with scopes

## Development Notes

### No Local Development Required
All development and testing should be done through Docker Compose. No need to install Node.js locally.

### Database Seeding
Demo data is managed in `apps/api/prisma/seed.ts`.

Seed includes:
- Admin user (from `.env` values)
- Default bot client/token (if `BOT_DEFAULT_TOKEN` is set)
- 8 demo players with profiles
- 6 approved matches with score events
- 3 scheduled matches with joined players

Default demo credentials:
- Admin: `admin@example.com` / value from `ADMIN_PASSWORD`
- Players: `*@lsc.unicamp.br` / `player123`

### Database Migrations
Migrations are handled via Prisma Migrate:
```bash
# Run migrations (inside container)
docker compose exec api npx prisma migrate deploy

# Create new migration (requires source changes)
docker compose exec api npx prisma migrate dev --name migration_name
```

### File Uploads
- Avatars stored in `/app/uploads` (Docker volume)
- Max file size: 2MB
- Allowed types: images only
- Accessible via `/uploads/<filename>`

### Troubleshooting

**Database connection issues:**
```bash
docker compose down -v  # Remove volumes
docker compose up -d --build  # Rebuild fresh
```

**Migration failures:**
```bash
docker compose exec db psql -U catan -d catan
# Then manually fix or reset
```

**API container starts but exits (`Cannot find module '/app/dist/main.js'`):**
The API runs from `dist/src/main.js` in this repository.
Rebuild the API image:
```bash
docker compose build --no-cache api
docker compose up -d api
```

**Port conflicts:**
Change ports in `.env` or `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Different host port
```

## Testing with Docker

```bash
# Test API health
curl http://localhost:4000/health

# Test leaderboard
curl http://localhost:4000/leaderboard

# Test scheduled matches API
curl http://localhost:4000/scheduled-matches

# Test calendar page
curl -I http://localhost:3000/calendar

# Test with authentication
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"admin123"}'
```

## Production Deployment

1. Update all secrets in `.env`
2. Change `NEXTAUTH_URL` to production domain
3. Use external PostgreSQL or managed service
4. Set up reverse proxy (nginx/traefik)
5. Enable HTTPS
6. Configure backup strategy

## Migration from v1 (Express)

This is a complete rewrite:
- Express → NestJS (modular architecture)
- React SPA → Next.js (App Router, SSR)
- Raw SQL → Prisma ORM
- REST polling → WebSocket real-time
- Single container → Multi-service Docker Compose
