const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const { Pool } = require("pg");
const { z } = require("zod");

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "change-this-secret";
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const avatarPresets = [
  { key: "wood", label: "Madeira", url: "/avatars/wood.svg" },
  { key: "brick", label: "Tijolo", url: "/avatars/brick.svg" },
  { key: "wheat", label: "Trigo", url: "/avatars/wheat.svg" },
  { key: "sheep", label: "Ovelha", url: "/avatars/sheep.svg" },
  { key: "ore", label: "Minerio", url: "/avatars/ore.svg" },
  { key: "knight", label: "Cavaleiro", url: "/avatars/knight.svg" },
];
const avatarPresetKeys = new Set(avatarPresets.map((item) => item.key));

const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "LSC Catan API",
    version: "1.1.0",
    description: "API da leaderboard do CATAN no LSC.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        summary: "Healthcheck",
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/v1/auth/register": {
      post: {
        summary: "Cadastro de usuario",
        responses: { "201": { description: "Criado" } },
      },
    },
    "/api/v1/auth/login": {
      post: {
        summary: "Login por email ou nickname",
        responses: { "200": { description: "Autenticado" } },
      },
    },
    "/api/v1/auth/me": {
      get: {
        summary: "Perfil autenticado",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Perfil" } },
      },
    },
    "/api/v1/leaderboard": {
      get: {
        summary: "Leaderboard publica",
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/matches": {
      get: {
        summary: "Historico de partidas aprovadas",
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/matches/{id}": {
      get: {
        summary: "Detalhes da partida",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Detalhe" } },
      },
    },
    "/api/v1/submissions": {
      post: {
        summary: "Submete partida para moderacao",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Criado" } },
      },
    },
    "/api/v1/me/profile": {
      get: {
        summary: "Perfil do usuario",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Perfil" } },
      },
      put: {
        summary: "Atualiza perfil do usuario",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Atualizado" } },
      },
    },
    "/api/v1/avatars/presets": {
      get: {
        summary: "Lista avatares predefinidos",
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/me/avatar/preset": {
      put: {
        summary: "Seleciona avatar preset",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Atualizado" } },
      },
    },
    "/api/v1/me/avatar/upload": {
      post: {
        summary: "Upload de avatar",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Atualizado" } },
      },
    },
    "/api/v1/admin/submissions": {
      get: {
        summary: "Fila de moderacao",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/admin/submissions/{id}/approve": {
      post: {
        summary: "Aprova submissao",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Aprovado" } },
      },
    },
    "/api/v1/admin/submissions/{id}/reject": {
      post: {
        summary: "Rejeita submissao",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Rejeitado" } },
      },
    },
    "/api/v1/admin/matches/{id}": {
      put: {
        summary: "Edita partida passada",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Editada" } },
      },
      delete: {
        summary: "Remove partida (logica)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Removida" } },
      },
    },
    "/api/v1/admin/users": {
      get: {
        summary: "Lista usuarios",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/admin/users/{id}": {
      put: {
        summary: "Edita usuario",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Atualizado" } },
      },
      delete: {
        summary: "Remove usuario (logica)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Removido" } },
      },
    },
    "/api/v1/bot/leaderboard": {
      get: {
        summary: "Leaderboard para bot",
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/bot/players": {
      get: {
        summary: "Busca de jogadores para bot",
        responses: { "200": { description: "Lista" } },
      },
    },
    "/api/v1/bot/matches": {
      post: {
        summary: "Submissao de partida por bot",
        responses: { "201": { description: "Criada" } },
      },
    },
    "/api/v1/bot/matches/{id}": {
      get: {
        summary: "Status de submissao do bot",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Status" } },
      },
    },
    "/api/v1/scheduled-matches": {
      get: {
        summary: "Lista partidas agendadas",
        responses: { "200": { description: "Lista" } },
      },
      post: {
        summary: "Cria partida agendada",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Criada" } },
      },
    },
    "/api/v1/scheduled-matches/{id}": {
      delete: {
        summary: "Cancela partida agendada",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Cancelada" } },
      },
    },
    "/api/v1/scheduled-matches/{id}/join": {
      post: {
        summary: "Entra na partida agendada",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Entrou" } },
      },
    },
    "/api/v1/scheduled-matches/{id}/leave": {
      delete: {
        summary: "Sai da partida agendada",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Saiu" } },
      },
    },
  },
};

function tokenHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function getAvatarUrl(profile) {
  if (profile.avatar_mode === "upload" && profile.avatar_url) return profile.avatar_url;
  return `/avatars/${profile.avatar_key || "wood"}.svg`;
}

function isAvatarPreset(key) {
  return avatarPresetKeys.has(String(key || ""));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("invalid_avatar_file_type"));
    return cb(null, true);
  },
});

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());
app.use("/api/v1/uploads", express.static(uploadDir, { maxAge: "30d" }));

app.get("/api/v1/openapi.json", (_req, res) => {
  res.json(swaggerSpec);
});
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

async function waitForDatabase(retries = 30, delayMs = 2000) {
  for (let i = 0; i < retries; i += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (_error) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Database not reachable");
}

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || "Admin LSC";
  const nickname = process.env.ADMIN_NICKNAME || "admin_lsc";
  if (!email || !password) return;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount > 0) return;

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userInsert = await client.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') RETURNING id",
      [email, passwordHash]
    );
    const userId = userInsert.rows[0].id;
    await client.query(
      `INSERT INTO player_profiles
       (user_id, full_name, nickname, category, program, bio, avatar_mode, avatar_key)
       VALUES ($1, $2, $3, 'pos', 'LSC', 'Administrador inicial do sistema', 'preset', 'knight')`,
      [userId, fullName, nickname]
    );
    await client.query("COMMIT");
    console.log("Default admin created:", email);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureDefaultBot() {
  const defaultToken = process.env.BOT_DEFAULT_TOKEN;
  if (!defaultToken) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const botName = "lsc-bot";
    const botRes = await client.query(
      "INSERT INTO bot_clients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [botName]
    );
    const botId = botRes.rows[0].id;
    const hash = tokenHash(defaultToken);
    await client.query(
      `INSERT INTO bot_tokens (bot_client_id, token_hash, scopes, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (token_hash) DO NOTHING`,
      [botId, hash, ["leaderboard:read", "matches:write", "matches:read", "players:read"]]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function signUserToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: "12h" });
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

const activeUserRequired = asyncHandler(async (req, res, next) => {
  const userId = Number(req.user.sub);
  const result = await pool.query("SELECT is_active, deleted_at FROM users WHERE id = $1", [userId]);
  if (result.rowCount === 0) return res.status(401).json({ error: "user_not_found" });
  const row = result.rows[0];
  if (!row.is_active || row.deleted_at) return res.status(403).json({ error: "user_inactive" });
  return next();
});

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "admin_required" });
  return next();
}

function botAuth(requiredScope) {
  return asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing_bot_token" });

    const hash = tokenHash(token);
    const result = await pool.query(
      `SELECT bt.id, bt.bot_client_id, bt.scopes, bt.is_active, bc.name
       FROM bot_tokens bt
       JOIN bot_clients bc ON bc.id = bt.bot_client_id
       WHERE bt.token_hash = $1`,
      [hash]
    );
    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: "invalid_bot_token" });
    }
    const botToken = result.rows[0];
    if (requiredScope && !botToken.scopes.includes(requiredScope)) {
      return res.status(403).json({ error: "insufficient_scope" });
    }
    req.bot = {
      tokenId: botToken.id,
      botClientId: botToken.bot_client_id,
      name: botToken.name,
      scopes: botToken.scopes,
    };
    await pool.query("UPDATE bot_tokens SET last_used_at = NOW() WHERE id = $1", [botToken.id]);
    return next();
  });
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  nickname: z.string().min(2).max(40),
  category: z.enum(["graduacao", "pos"]),
  program: z.string().max(120).optional().default(""),
  bio: z.string().max(300).optional().default(""),
  avatarKey: z.string().optional().default("wood"),
});

const loginSchema = z.object({
  identifier: z.string().min(2),
  password: z.string().min(1),
});

const profileSchema = z.object({
  fullName: z.string().min(2),
  nickname: z.string().min(2).max(40),
  category: z.enum(["graduacao", "pos"]),
  program: z.string().max(120).optional().default(""),
  bio: z.string().max(300).optional().default(""),
});

const matchSchema = z.object({
  externalMatchId: z.string().max(120).optional(),
  matchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().default(""),
  players: z.array(
    z.object({
      nickname: z.string().min(2).max(40),
      placement: z.number().int().min(1).max(6),
      victoryPoints: z.number().int().min(0).max(30),
    })
  ).min(3).max(6),
});

const adminUserUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["player", "admin"]).optional(),
  isActive: z.boolean().optional(),
  deleteReason: z.string().max(300).optional(),
  fullName: z.string().min(2).optional(),
  nickname: z.string().min(2).max(40).optional(),
  category: z.enum(["graduacao", "pos"]).optional(),
  program: z.string().max(120).optional(),
  bio: z.string().max(300).optional(),
  avatarMode: z.enum(["preset", "upload"]).optional(),
  avatarKey: z.string().optional(),
});

const scheduledMatchSchema = z.object({
  title: z.string().max(100).optional().default(""),
  scheduledDate: z.string().datetime(),
  minPlayers: z.number().int().min(2).max(6).optional().default(3),
  maxPlayers: z.number().int().min(3).max(6).optional().default(4),
});

function validateMatchPayload(payload) {
  const parsed = matchSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() };
  const players = parsed.data.players;
  const nicknames = players.map((p) => p.nickname.toLowerCase());
  const placements = players.map((p) => p.placement);
  if (new Set(nicknames).size !== nicknames.length) return { ok: false, error: "duplicate_nicknames" };
  if (new Set(placements).size !== placements.length) return { ok: false, error: "duplicate_placements" };
  return { ok: true, data: parsed.data };
}

async function resolvePlayersByNickname(nicknames, activeOnly = true) {
  const params = [nicknames];
  let sql = `
    SELECT pp.user_id, pp.nickname
    FROM player_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.nickname = ANY($1::text[])
  `;
  if (activeOnly) sql += " AND u.is_active = true AND u.deleted_at IS NULL";
  const usersRes = await pool.query(sql, params);
  const map = new Map(usersRes.rows.map((r) => [r.nickname, Number(r.user_id)]));
  return map;
}

async function rebuildScoreEventsForSubmission(client, submissionId) {
  await client.query("DELETE FROM score_events WHERE submission_id = $1", [submissionId]);
  const playersRes = await client.query(
    `SELECT user_id, victory_points, is_winner
     FROM match_submission_players
     WHERE submission_id = $1`,
    [submissionId]
  );
  for (const p of playersRes.rows) {
    await client.query(
      `INSERT INTO score_events (submission_id, user_id, points_delta, is_win)
       VALUES ($1, $2, $3, $4)`,
      [submissionId, p.user_id, p.victory_points, p.is_winner]
    );
  }
}

async function createSubmission({ actorUserId, actorBotClientId, payload, activeOnlyPlayers = true }) {
  const nicknames = payload.players.map((p) => p.nickname);
  const nicknameMap = await resolvePlayersByNickname(nicknames, activeOnlyPlayers);
  const missing = nicknames.filter((n) => !nicknameMap.has(n));
  if (missing.length > 0) {
    const error = new Error("unknown_players");
    error.statusCode = 400;
    error.details = { missing };
    throw error;
  }

  if (actorBotClientId && payload.externalMatchId) {
    const existing = await pool.query(
      `SELECT id, status
       FROM match_submissions
       WHERE submitted_by_bot_client_id = $1 AND external_match_id = $2`,
      [actorBotClientId, payload.externalMatchId]
    );
    if (existing.rowCount > 0) return { existing: true, submission: existing.rows[0] };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subRes = await client.query(
      `INSERT INTO match_submissions
       (submitted_by_user_id, submitted_by_bot_client_id, external_match_id, match_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, status, match_date, created_at`,
      [
        actorUserId || null,
        actorBotClientId || null,
        payload.externalMatchId || null,
        payload.matchDate,
        payload.notes || "",
      ]
    );
    const submission = subRes.rows[0];

    for (const player of payload.players) {
      const userId = nicknameMap.get(player.nickname);
      await client.query(
        `INSERT INTO match_submission_players (submission_id, user_id, placement, victory_points, is_winner)
         VALUES ($1, $2, $3, $4, $5)`,
        [submission.id, userId, player.placement, player.victoryPoints, player.placement === 1]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, actor_bot_client_id, action, target_type, target_id, meta)
       VALUES ($1, $2, 'submission_created', 'match_submission', $3, $4)`,
      [actorUserId || null, actorBotClientId || null, submission.id, JSON.stringify({ players: payload.players.length })]
    );

    await client.query("COMMIT");
    return { existing: false, submission };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function fetchLeaderboard(params, includeInactive = false) {
  const {
    category,
    query,
    minMatches,
    sort = "wins",
    order = "desc",
    period = "all",
    limit = "50",
    offset = "0",
  } = params;

  const limitN = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const offsetN = Math.max(Number(offset) || 0, 0);
  const minMatchesN = Math.max(Number(minMatches) || 0, 0);
  const orderDir = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

  const orderMap = {
    wins: "wins",
    total: "total_points",
    average: "avg_points",
    matches: "matches_played",
    last: "last_match_date",
    category: "category",
    winrate: "win_rate",
  };
  const orderBy = orderMap[String(sort || "wins")] || orderMap.wins;

  let periodSql = "";
  if (period === "30d") periodSql = "AND ms.match_date >= CURRENT_DATE - INTERVAL '30 days'";
  else if (period === "semester") periodSql = "AND ms.match_date >= CURRENT_DATE - INTERVAL '180 days'";

  const values = [];
  let index = 1;
  let whereSql = "WHERE 1=1";
  if (!includeInactive) whereSql += " AND u.is_active = true AND u.deleted_at IS NULL";
  if (category === "graduacao" || category === "pos") {
    whereSql += ` AND pp.category = $${index}`;
    values.push(category);
    index += 1;
  }
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery) {
    whereSql += ` AND (pp.nickname ILIKE $${index} OR pp.full_name ILIKE $${index})`;
    values.push(`%${normalizedQuery}%`);
    index += 1;
  }

  values.push(minMatchesN);
  const minMatchesParam = `$${index}`;
  index += 1;
  values.push(limitN);
  const limitParam = `$${index}`;
  index += 1;
  values.push(offsetN);
  const offsetParam = `$${index}`;

  const sql = `
    WITH agg AS (
      SELECT
        se.user_id,
        COALESCE(SUM(se.points_delta), 0)::INT AS total_points,
        COUNT(DISTINCT se.submission_id)::INT AS matches_played,
        COALESCE(SUM(CASE WHEN se.is_win THEN 1 ELSE 0 END), 0)::INT AS wins,
        ROUND(COALESCE(AVG(se.points_delta), 0)::numeric, 2) AS avg_points,
        MAX(ms.match_date) AS last_match_date,
        CASE
          WHEN COUNT(DISTINCT se.submission_id) > 0
          THEN ROUND((COALESCE(SUM(CASE WHEN se.is_win THEN 1 ELSE 0 END), 0)::numeric / COUNT(DISTINCT se.submission_id))::numeric, 4)
          ELSE 0
        END AS win_rate
      FROM score_events se
      JOIN match_submissions ms ON ms.id = se.submission_id
      WHERE ms.status = 'approved' AND ms.deleted_at IS NULL ${periodSql}
      GROUP BY se.user_id
    ), base AS (
      SELECT
        u.id,
        u.role,
        pp.full_name,
        pp.nickname,
        pp.category,
        pp.program,
        pp.avatar_mode,
        pp.avatar_key,
        pp.avatar_url,
        COALESCE(agg.total_points, 0)::INT AS total_points,
        COALESCE(agg.matches_played, 0)::INT AS matches_played,
        COALESCE(agg.wins, 0)::INT AS wins,
        COALESCE(agg.avg_points, 0)::NUMERIC AS avg_points,
        COALESCE(agg.win_rate, 0)::NUMERIC AS win_rate,
        agg.last_match_date
      FROM users u
      JOIN player_profiles pp ON pp.user_id = u.id
      LEFT JOIN agg ON agg.user_id = u.id
      ${whereSql}
    )
    SELECT *
    FROM base
    WHERE matches_played >= ${minMatchesParam}
    ORDER BY ${orderBy} ${orderDir}, wins DESC, total_points DESC, avg_points DESC, last_match_date DESC NULLS LAST, nickname ASC
    LIMIT ${limitParam}
    OFFSET ${offsetParam}
  `;
  const result = await pool.query(sql, values);
  return result.rows.map((row) => ({
    ...row,
    avatar_url: getAvatarUrl(row),
  }));
}

app.get("/api/v1/health", asyncHandler(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
}));

app.get("/api/v1/avatars/presets", (_req, res) => {
  res.json({ items: avatarPresets });
});

app.post("/api/v1/auth/register", asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const avatarKey = isAvatarPreset(data.avatarKey) ? data.avatarKey : "wood";

  const existingEmail = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [data.email]);
  if (existingEmail.rowCount > 0) return res.status(409).json({ error: "email_already_exists" });
  const existingNick = await pool.query("SELECT user_id FROM player_profiles WHERE LOWER(nickname) = LOWER($1)", [data.nickname]);
  if (existingNick.rowCount > 0) return res.status(409).json({ error: "nickname_already_exists" });

  const passwordHash = await bcrypt.hash(data.password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'player')
       RETURNING id, email, role`,
      [data.email, passwordHash]
    );
    const user = userRes.rows[0];
    await client.query(
      `INSERT INTO player_profiles
       (user_id, full_name, nickname, category, program, bio, avatar_mode, avatar_key)
       VALUES ($1, $2, $3, $4, $5, $6, 'preset', $7)`,
      [user.id, data.fullName, data.nickname, data.category, data.program, data.bio, avatarKey]
    );
    await client.query("COMMIT");
    const token = signUserToken(user);
    return res.status(201).json({ token, user: { ...user, nickname: data.nickname } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/v1/auth/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const identifier = normalizeText(parsed.data.identifier);

  const userRes = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.is_active, u.deleted_at, pp.nickname
     FROM users u
     JOIN player_profiles pp ON pp.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1) OR LOWER(pp.nickname) = LOWER($1)
     LIMIT 1`,
    [identifier]
  );
  if (userRes.rowCount === 0) return res.status(401).json({ error: "invalid_credentials" });
  const user = userRes.rows[0];
  if (!user.is_active || user.deleted_at) return res.status(403).json({ error: "user_inactive" });

  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = signUserToken(user);
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role, nickname: user.nickname } });
}));

app.get("/api/v1/auth/me", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const userId = Number(req.user.sub);
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.is_active,
       u.deleted_at,
       pp.full_name,
       pp.nickname,
       pp.category,
       pp.program,
       pp.bio,
       pp.avatar_mode,
       pp.avatar_key,
       pp.avatar_url
     FROM users u
     JOIN player_profiles pp ON pp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "profile_not_found" });
  const row = result.rows[0];
  row.avatar_url = getAvatarUrl(row);
  return res.json(row);
}));

app.get("/api/v1/leaderboard", asyncHandler(async (req, res) => {
  const items = await fetchLeaderboard(req.query, false);
  return res.json({ items });
}));

app.get("/api/v1/matches", asyncHandler(async (req, res) => {
  const status = normalizeText(req.query.status) || "approved";
  const period = normalizeText(req.query.period) || "all";
  const query = normalizeText(req.query.query);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  let periodSql = "";
  if (period === "30d") periodSql = "AND ms.match_date >= CURRENT_DATE - INTERVAL '30 days'";
  else if (period === "semester") periodSql = "AND ms.match_date >= CURRENT_DATE - INTERVAL '180 days'";

  const values = [status, limit, offset];
  let querySql = "";
  if (query) {
    values.splice(1, 0, `%${query}%`);
    querySql = "AND EXISTS (SELECT 1 FROM match_submission_players xmsp JOIN player_profiles xpp ON xpp.user_id = xmsp.user_id WHERE xmsp.submission_id = ms.id AND (xpp.nickname ILIKE $2 OR xpp.full_name ILIKE $2))";
  }

  const statusParam = "$1";
  const limitParam = query ? "$3" : "$2";
  const offsetParam = query ? "$4" : "$3";

  const rows = await pool.query(
    `SELECT
       ms.id,
       ms.match_date,
       ms.notes,
       ms.status,
       ms.created_at,
       ms.reviewed_at,
       json_agg(json_build_object(
         'nickname', pp.nickname,
         'fullName', pp.full_name,
         'placement', msp.placement,
         'victoryPoints', msp.victory_points,
         'avatarUrl', CASE
           WHEN pp.avatar_mode = 'upload' AND pp.avatar_url IS NOT NULL THEN pp.avatar_url
           ELSE '/avatars/' || COALESCE(pp.avatar_key, 'wood') || '.svg'
         END
       ) ORDER BY msp.placement ASC) AS players
     FROM match_submissions ms
     JOIN match_submission_players msp ON msp.submission_id = ms.id
     JOIN player_profiles pp ON pp.user_id = msp.user_id
     WHERE ms.deleted_at IS NULL
       AND ms.status = ${statusParam}
       ${periodSql}
       ${querySql}
     GROUP BY ms.id
     ORDER BY ms.match_date DESC, ms.created_at DESC
     LIMIT ${limitParam}
     OFFSET ${offsetParam}`,
    values
  );
  return res.json({ items: rows.rows });
}));

app.get("/api/v1/matches/:id", asyncHandler(async (req, res) => {
  const rows = await pool.query(
    `SELECT
       ms.id,
       ms.match_date,
       ms.notes,
       ms.status,
       ms.created_at,
       ms.reviewed_at,
       ms.reject_reason,
       json_agg(json_build_object(
         'nickname', pp.nickname,
         'fullName', pp.full_name,
         'placement', msp.placement,
         'victoryPoints', msp.victory_points,
         'avatarUrl', CASE
           WHEN pp.avatar_mode = 'upload' AND pp.avatar_url IS NOT NULL THEN pp.avatar_url
           ELSE '/avatars/' || COALESCE(pp.avatar_key, 'wood') || '.svg'
         END
       ) ORDER BY msp.placement ASC) AS players
     FROM match_submissions ms
     JOIN match_submission_players msp ON msp.submission_id = ms.id
     JOIN player_profiles pp ON pp.user_id = msp.user_id
     WHERE ms.id = $1 AND ms.deleted_at IS NULL
     GROUP BY ms.id`,
    [req.params.id]
  );
  if (rows.rowCount === 0) return res.status(404).json({ error: "match_not_found" });
  return res.json(rows.rows[0]);
}));

app.get("/api/v1/me/profile", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const userId = Number(req.user.sub);
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.is_active,
       pp.full_name,
       pp.nickname,
       pp.category,
       pp.program,
       pp.bio,
       pp.avatar_mode,
       pp.avatar_key,
       pp.avatar_url
     FROM users u
     JOIN player_profiles pp ON pp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "profile_not_found" });
  const row = result.rows[0];
  row.avatar_url = getAvatarUrl(row);
  return res.json(row);
}));

app.put("/api/v1/me/profile", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = Number(req.user.sub);
  const data = parsed.data;

  const nickConflict = await pool.query(
    "SELECT user_id FROM player_profiles WHERE LOWER(nickname) = LOWER($1) AND user_id <> $2",
    [data.nickname, userId]
  );
  if (nickConflict.rowCount > 0) return res.status(409).json({ error: "nickname_already_exists" });

  await pool.query(
    `UPDATE player_profiles
     SET full_name = $1, nickname = $2, category = $3, program = $4, bio = $5, updated_at = NOW()
     WHERE user_id = $6`,
    [data.fullName, data.nickname, data.category, data.program, data.bio, userId]
  );
  return res.json({ ok: true });
}));

app.put("/api/v1/me/avatar/preset", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const schema = z.object({ avatarKey: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!isAvatarPreset(parsed.data.avatarKey)) return res.status(400).json({ error: "invalid_avatar_preset" });

  await pool.query(
    `UPDATE player_profiles
     SET avatar_mode = 'preset', avatar_key = $1, avatar_url = NULL, updated_at = NOW()
     WHERE user_id = $2`,
    [parsed.data.avatarKey, Number(req.user.sub)]
  );
  return res.json({ ok: true, avatarUrl: `/avatars/${parsed.data.avatarKey}.svg` });
}));

app.post("/api/v1/me/avatar/upload", authRequired, activeUserRequired, upload.single("avatar"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "missing_avatar_file" });
  const avatarUrl = `/api/v1/uploads/${req.file.filename}`;
  await pool.query(
    `UPDATE player_profiles
     SET avatar_mode = 'upload', avatar_url = $1, updated_at = NOW()
     WHERE user_id = $2`,
    [avatarUrl, Number(req.user.sub)]
  );
  return res.json({ ok: true, avatarUrl });
}));

app.post("/api/v1/submissions", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const valid = validateMatchPayload(req.body);
  if (!valid.ok) return res.status(400).json({ error: valid.error });
  const result = await createSubmission({
    actorUserId: Number(req.user.sub),
    actorBotClientId: null,
    payload: valid.data,
    activeOnlyPlayers: true,
  });
  if (result.existing) {
    return res.status(200).json({ id: result.submission.id, status: result.submission.status, duplicated: true });
  }
  return res.status(201).json({ id: result.submission.id, status: result.submission.status });
}));

app.get("/api/v1/admin/submissions", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const status = normalizeText(req.query.status) || "pending";
  const rows = await pool.query(
    `SELECT
       ms.id,
       ms.match_date,
       ms.notes,
       ms.status,
       ms.created_at,
       su.email AS submitted_by_email,
       json_agg(json_build_object(
         'nickname', pp.nickname,
         'fullName', pp.full_name,
         'placement', msp.placement,
         'victoryPoints', msp.victory_points,
         'avatarUrl', CASE
           WHEN pp.avatar_mode = 'upload' AND pp.avatar_url IS NOT NULL THEN pp.avatar_url
           ELSE '/avatars/' || COALESCE(pp.avatar_key, 'wood') || '.svg'
         END
       ) ORDER BY msp.placement ASC) AS players
     FROM match_submissions ms
     LEFT JOIN users su ON su.id = ms.submitted_by_user_id
     JOIN match_submission_players msp ON msp.submission_id = ms.id
     JOIN player_profiles pp ON pp.user_id = msp.user_id
     WHERE ms.status = $1 AND ms.deleted_at IS NULL
     GROUP BY ms.id, su.email
     ORDER BY ms.created_at ASC`,
    [status]
  );
  return res.json({ items: rows.rows });
}));

app.post("/api/v1/admin/submissions/:id/approve", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const adminId = Number(req.user.sub);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subRes = await client.query(
      `SELECT id, status, deleted_at
       FROM match_submissions
       WHERE id = $1
       FOR UPDATE`,
      [submissionId]
    );
    if (subRes.rowCount === 0 || subRes.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "submission_not_found" });
    }
    if (subRes.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "submission_already_reviewed" });
    }

    await rebuildScoreEventsForSubmission(client, submissionId);

    await client.query(
      `UPDATE match_submissions
       SET status = 'approved', reviewed_by_user_id = $1, reviewed_at = NOW(), updated_at = NOW(), reject_reason = NULL
       WHERE id = $2`,
      [adminId, submissionId]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta)
       VALUES ($1, 'submission_approved', 'match_submission', $2, $3)`,
      [adminId, submissionId, JSON.stringify({})]
    );

    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/v1/admin/submissions/:id/reject", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const schema = z.object({ reason: z.string().min(3).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await pool.query(
    `UPDATE match_submissions
     SET status = 'rejected', reviewed_by_user_id = $1, reviewed_at = NOW(), updated_at = NOW(), reject_reason = $2
     WHERE id = $3 AND status = 'pending' AND deleted_at IS NULL`,
    [Number(req.user.sub), parsed.data.reason, req.params.id]
  );
  if (result.rowCount === 0) return res.status(409).json({ error: "submission_not_pending_or_not_found" });

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta)
     VALUES ($1, 'submission_rejected', 'match_submission', $2, $3)`,
    [Number(req.user.sub), req.params.id, JSON.stringify({ reason: parsed.data.reason })]
  );
  return res.json({ ok: true });
}));

app.put("/api/v1/admin/matches/:id", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const valid = validateMatchPayload(req.body);
  if (!valid.ok) return res.status(400).json({ error: valid.error });
  const payload = valid.data;
  const submissionId = req.params.id;
  const adminId = Number(req.user.sub);

  const nicknameMap = await resolvePlayersByNickname(payload.players.map((p) => p.nickname), false);
  const missing = payload.players.map((p) => p.nickname).filter((n) => !nicknameMap.has(n));
  if (missing.length > 0) return res.status(400).json({ error: "unknown_players", details: { missing } });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subRes = await client.query(
      `SELECT id, status, deleted_at
       FROM match_submissions
       WHERE id = $1
       FOR UPDATE`,
      [submissionId]
    );
    if (subRes.rowCount === 0 || subRes.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "match_not_found" });
    }

    await client.query(
      `UPDATE match_submissions
       SET match_date = $1, notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [payload.matchDate, payload.notes || "", submissionId]
    );
    await client.query("DELETE FROM match_submission_players WHERE submission_id = $1", [submissionId]);

    for (const player of payload.players) {
      await client.query(
        `INSERT INTO match_submission_players (submission_id, user_id, placement, victory_points, is_winner)
         VALUES ($1, $2, $3, $4, $5)`,
        [submissionId, nicknameMap.get(player.nickname), player.placement, player.victoryPoints, player.placement === 1]
      );
    }

    if (subRes.rows[0].status === "approved") {
      await rebuildScoreEventsForSubmission(client, submissionId);
    }

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta)
       VALUES ($1, 'match_edited', 'match_submission', $2, $3)`,
      [adminId, submissionId, JSON.stringify({ players: payload.players.length })]
    );
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.delete("/api/v1/admin/matches/:id", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const schema = z.object({ reason: z.string().max(300).optional().default("Remocao administrativa") });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const submissionId = req.params.id;
  const adminId = Number(req.user.sub);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const subRes = await client.query(
      `SELECT id, status, deleted_at
       FROM match_submissions
       WHERE id = $1
       FOR UPDATE`,
      [submissionId]
    );
    if (subRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "match_not_found" });
    }
    if (subRes.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "match_already_deleted" });
    }

    await client.query(
      `UPDATE match_submissions
       SET deleted_at = NOW(), deleted_by_user_id = $1, delete_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [adminId, parsed.data.reason, submissionId]
    );
    if (subRes.rows[0].status === "approved") {
      await client.query("DELETE FROM score_events WHERE submission_id = $1", [submissionId]);
    }
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta)
       VALUES ($1, 'match_deleted', 'match_submission', $2, $3)`,
      [adminId, submissionId, JSON.stringify({ reason: parsed.data.reason })]
    );
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/v1/admin/users", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const query = normalizeText(req.query.query);
  const includeInactive = String(req.query.includeInactive || "true") === "true";

  const values = [];
  let idx = 1;
  let whereSql = "WHERE 1=1";
  if (!includeInactive) {
    whereSql += " AND u.is_active = true AND u.deleted_at IS NULL";
  }
  if (query) {
    whereSql += ` AND (u.email ILIKE $${idx} OR pp.nickname ILIKE $${idx} OR pp.full_name ILIKE $${idx})`;
    values.push(`%${query}%`);
  }

  const rows = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.is_active,
       u.deleted_at,
       u.delete_reason,
       pp.full_name,
       pp.nickname,
       pp.category,
       pp.program,
       pp.bio,
       pp.avatar_mode,
       pp.avatar_key,
       pp.avatar_url
     FROM users u
     JOIN player_profiles pp ON pp.user_id = u.id
     ${whereSql}
     ORDER BY u.created_at DESC`,
    values
  );
  const items = rows.rows.map((row) => ({ ...row, avatar_url: getAvatarUrl(row) }));
  return res.json({ items });
}));

app.put("/api/v1/admin/users/:id", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const parsed = adminUserUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const targetUserId = Number(req.params.id);
  const actorUserId = Number(req.user.sub);

  if (targetUserId === actorUserId && data.role && data.role !== "admin") {
    return res.status(400).json({ error: "self_role_change_forbidden" });
  }
  if (targetUserId === actorUserId && data.isActive === false) {
    return res.status(400).json({ error: "self_disable_forbidden" });
  }
  if (data.avatarMode === "preset" && data.avatarKey && !isAvatarPreset(data.avatarKey)) {
    return res.status(400).json({ error: "invalid_avatar_preset" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT u.id, u.email, u.role, u.is_active, u.deleted_at, u.delete_reason,
              pp.full_name, pp.nickname, pp.category, pp.program, pp.bio,
              pp.avatar_mode, pp.avatar_key, pp.avatar_url
       FROM users u
       JOIN player_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1
       FOR UPDATE`,
      [targetUserId]
    );
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "user_not_found" });
    }
    const current = existing.rows[0];

    const nextEmail = data.email || current.email;
    const nextNickname = data.nickname || current.nickname;

    const emailConflict = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2",
      [nextEmail, targetUserId]
    );
    if (emailConflict.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "email_already_exists" });
    }
    const nickConflict = await client.query(
      "SELECT user_id FROM player_profiles WHERE LOWER(nickname) = LOWER($1) AND user_id <> $2",
      [nextNickname, targetUserId]
    );
    if (nickConflict.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "nickname_already_exists" });
    }

    let isActive = data.isActive;
    if (typeof isActive === "undefined") isActive = current.is_active;
    const role = data.role || current.role;

    let deletedAt = current.deleted_at;
    let deleteReason = current.delete_reason || null;
    let deletedBy = null;
    if (isActive === false) {
      deletedAt = current.deleted_at || new Date().toISOString();
      deleteReason = data.deleteReason || current.delete_reason || "Remocao administrativa";
      deletedBy = actorUserId;
    }
    if (isActive === true) {
      deletedAt = null;
      deleteReason = null;
      deletedBy = null;
    }

    await client.query(
      `UPDATE users
       SET email = $1,
           role = $2,
           is_active = $3,
           deleted_at = $4,
           delete_reason = $5,
           deleted_by_user_id = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [nextEmail, role, isActive, deletedAt, deleteReason, deletedBy, targetUserId]
    );

    const nextAvatarMode = data.avatarMode || current.avatar_mode;
    const nextAvatarKey = data.avatarKey || current.avatar_key;
    const nextAvatarUrl = nextAvatarMode === "preset" ? null : current.avatar_url;

    await client.query(
      `UPDATE player_profiles
       SET full_name = $1,
           nickname = $2,
           category = $3,
           program = $4,
           bio = $5,
           avatar_mode = $6,
           avatar_key = $7,
           avatar_url = $8,
           updated_at = NOW()
       WHERE user_id = $9`,
      [
        data.fullName || current.full_name,
        nextNickname,
        data.category || current.category,
        data.program || current.program,
        data.bio || current.bio,
        nextAvatarMode,
        nextAvatarKey,
        nextAvatarUrl,
        targetUserId,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta)
       VALUES ($1, 'user_updated', 'user', $2, $3)`,
      [actorUserId, String(targetUserId), JSON.stringify(data)]
    );
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.delete("/api/v1/admin/users/:id", authRequired, activeUserRequired, adminRequired, asyncHandler(async (req, res) => {
  const schema = z.object({ reason: z.string().max(300).optional().default("Remocao administrativa") });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const targetUserId = Number(req.params.id);
  const actorUserId = Number(req.user.sub);
  if (targetUserId === actorUserId) return res.status(400).json({ error: "self_disable_forbidden" });

  const result = await pool.query(
    `UPDATE users
     SET is_active = false,
         deleted_at = NOW(),
         delete_reason = $1,
         deleted_by_user_id = $2,
         updated_at = NOW()
     WHERE id = $3 AND (deleted_at IS NULL OR is_active = true)`,
    [parsed.data.reason, actorUserId, targetUserId]
  );
  if (result.rowCount === 0) return res.status(409).json({ error: "user_not_found_or_already_removed" });

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, meta)
     VALUES ($1, 'user_soft_deleted', 'user', $2, $3)`,
    [actorUserId, String(targetUserId), JSON.stringify({ reason: parsed.data.reason })]
  );
  return res.json({ ok: true });
}));

app.get("/api/v1/bot/leaderboard", botAuth("leaderboard:read"), asyncHandler(async (req, res) => {
  const items = await fetchLeaderboard(req.query, false);
  return res.json({ items });
}));

app.get("/api/v1/bot/players", botAuth("players:read"), asyncHandler(async (req, res) => {
  const query = normalizeText(req.query.query);
  const rows = await pool.query(
    `SELECT pp.user_id, pp.nickname, pp.full_name, pp.category, pp.program
     FROM player_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE u.is_active = true AND u.deleted_at IS NULL
       AND (pp.nickname ILIKE $1 OR pp.full_name ILIKE $1)
     ORDER BY pp.nickname ASC
     LIMIT 20`,
    [`%${query}%`]
  );
  return res.json({ items: rows.rows });
}));

app.post("/api/v1/bot/matches", botAuth("matches:write"), asyncHandler(async (req, res) => {
  const valid = validateMatchPayload(req.body);
  if (!valid.ok) return res.status(400).json({ error: valid.error });
  const result = await createSubmission({
    actorUserId: null,
    actorBotClientId: req.bot.botClientId,
    payload: valid.data,
    activeOnlyPlayers: true,
  });
  if (result.existing) {
    return res.status(200).json({ id: result.submission.id, status: result.submission.status, duplicated: true });
  }
  return res.status(201).json({ id: result.submission.id, status: result.submission.status });
}));

app.get("/api/v1/scheduled-matches", asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const rows = await pool.query(
    `SELECT
       sm.id,
       sm.title,
       sm.scheduled_date,
       sm.min_players,
       sm.max_players,
       sm.status,
       sm.created_at,
       sm.creator_user_id,
       pp.nickname AS creator_nickname,
       (SELECT COUNT(*) FROM scheduled_match_players WHERE match_id = sm.id)::INT AS player_count,
       COALESCE(
         json_agg(
           json_build_object(
             'userId', p.user_id,
             'nickname', p.nickname,
             'fullName', p.full_name,
             'avatarUrl', CASE
               WHEN p.avatar_mode = 'upload' AND p.avatar_url IS NOT NULL THEN p.avatar_url
               ELSE '/avatars/' || COALESCE(p.avatar_key, 'wood') || '.svg'
             END
           )
         ) FILTER (WHERE p.user_id IS NOT NULL),
         '[]'::json
       ) AS players
     FROM scheduled_matches sm
     LEFT JOIN player_profiles pp ON pp.user_id = sm.creator_user_id
     LEFT JOIN scheduled_match_players smp ON smp.match_id = sm.id
     LEFT JOIN player_profiles p ON p.user_id = smp.user_id
     WHERE sm.status = 'open' AND sm.scheduled_date >= NOW() - INTERVAL '1 hour'
     GROUP BY sm.id, pp.nickname
     ORDER BY sm.scheduled_date ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.json({ items: rows.rows });
}));

app.post("/api/v1/scheduled-matches", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const parsed = scheduledMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const userId = Number(req.user.sub);

  if (data.minPlayers > data.maxPlayers) {
    return res.status(400).json({ error: "min_players_cannot_exceed_max" });
  }

  const result = await pool.query(
    `INSERT INTO scheduled_matches (creator_user_id, title, scheduled_date, min_players, max_players)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, scheduled_date, min_players, max_players, status`,
    [userId, data.title || "", data.scheduledDate, data.minPlayers, data.maxPlayers]
  );
  const match = result.rows[0];

  await pool.query(
    `INSERT INTO scheduled_match_players (match_id, user_id) VALUES ($1, $2)`,
    [match.id, userId]
  );

  return res.status(201).json(match);
}));

app.delete("/api/v1/scheduled-matches/:id", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const matchId = req.params.id;
  const userId = Number(req.user.sub);

  const existing = await pool.query(
    `SELECT creator_user_id, status FROM scheduled_matches WHERE id = $1`,
    [matchId]
  );
  if (existing.rowCount === 0) return res.status(404).json({ error: "match_not_found" });
  const match = existing.rows[0];

  const isCreator = match.creator_user_id === userId;
  const isAdmin = req.user.role === "admin";
  if (!isCreator && !isAdmin) return res.status(403).json({ error: "not_authorized" });
  if (match.status !== "open") return res.status(409).json({ error: "match_not_open" });

  await pool.query(
    `UPDATE scheduled_matches SET status = 'cancelled' WHERE id = $1`,
    [matchId]
  );
  return res.json({ ok: true });
}));

app.post("/api/v1/scheduled-matches/:id/join", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const matchId = req.params.id;
  const userId = Number(req.user.sub);

  const existing = await pool.query(
    `SELECT id, min_players, max_players, status,
     (SELECT COUNT(*) FROM scheduled_match_players WHERE match_id = scheduled_matches.id)::INT AS player_count
     FROM scheduled_matches WHERE id = $1`,
    [matchId]
  );
  if (existing.rowCount === 0) return res.status(404).json({ error: "match_not_found" });
  const match = existing.rows[0];

  if (match.status !== "open") return res.status(409).json({ error: "match_not_open" });
  if (match.player_count >= match.max_players) return res.status(409).json({ error: "match_full" });

  const alreadyJoined = await pool.query(
    `SELECT 1 FROM scheduled_match_players WHERE match_id = $1 AND user_id = $2`,
    [matchId, userId]
  );
  if (alreadyJoined.rowCount > 0) return res.status(409).json({ error: "already_joined" });

  await pool.query(
    `INSERT INTO scheduled_match_players (match_id, user_id) VALUES ($1, $2)`,
    [matchId, userId]
  );

  return res.json({ ok: true });
}));

app.delete("/api/v1/scheduled-matches/:id/leave", authRequired, activeUserRequired, asyncHandler(async (req, res) => {
  const matchId = req.params.id;
  const userId = Number(req.user.sub);

  const existing = await pool.query(
    `SELECT status FROM scheduled_matches WHERE id = $1`,
    [matchId]
  );
  if (existing.rowCount === 0) return res.status(404).json({ error: "match_not_found" });
  if (existing.rows[0].status !== "open") return res.status(409).json({ error: "match_not_open" });

  const result = await pool.query(
    `DELETE FROM scheduled_match_players WHERE match_id = $1 AND user_id = $2 RETURNING id`,
    [matchId, userId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "not_joined" });

  return res.json({ ok: true });
}));

app.get("/api/v1/bot/matches/:id", botAuth("matches:read"), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, status, match_date, created_at, reviewed_at, reject_reason
     FROM match_submissions
     WHERE id = $1 AND submitted_by_bot_client_id = $2`,
    [req.params.id, req.bot.botClientId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "submission_not_found" });
  return res.json(result.rows[0]);
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.message === "invalid_avatar_file_type") {
    return res.status(400).json({ error: "invalid_avatar_file_type" });
  }
  return res.status(500).json({ error: "internal_error" });
});

async function start() {
  ensureUploadDir();
  await waitForDatabase();
  await ensureDefaultAdmin();
  await ensureDefaultBot();
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Startup failed", error);
  process.exit(1);
});
