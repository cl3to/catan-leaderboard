CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('player', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('graduacao', 'pos')),
  program TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_tokens (
  id BIGSERIAL PRIMARY KEY,
  bot_client_id BIGINT NOT NULL REFERENCES bot_clients(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS match_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_user_id BIGINT REFERENCES users(id),
  submitted_by_bot_client_id BIGINT REFERENCES bot_clients(id),
  external_match_id TEXT,
  match_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_user_id BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (submitted_by_user_id IS NOT NULL OR submitted_by_bot_client_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_external_by_bot
ON match_submissions(submitted_by_bot_client_id, external_match_id)
WHERE submitted_by_bot_client_id IS NOT NULL AND external_match_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS match_submission_players (
  id BIGSERIAL PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES match_submissions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  placement INT NOT NULL CHECK (placement >= 1 AND placement <= 6),
  victory_points INT NOT NULL CHECK (victory_points >= 0 AND victory_points <= 30),
  is_winner BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_user
ON match_submission_players(submission_id, user_id);

CREATE TABLE IF NOT EXISTS score_events (
  id BIGSERIAL PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES match_submissions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  points_delta INT NOT NULL,
  is_win BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_score_event_submission_user
ON score_events(submission_id, user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id),
  actor_bot_client_id BIGINT REFERENCES bot_clients(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON player_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_profiles_category ON player_profiles(category);
CREATE INDEX IF NOT EXISTS idx_match_submissions_status ON match_submissions(status);
CREATE INDEX IF NOT EXISTS idx_match_submissions_date ON match_submissions(match_date);
CREATE INDEX IF NOT EXISTS idx_score_events_user ON score_events(user_id);
