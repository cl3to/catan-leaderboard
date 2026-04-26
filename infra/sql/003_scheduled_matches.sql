CREATE TABLE IF NOT EXISTS scheduled_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  min_players INT NOT NULL DEFAULT 3 CHECK (min_players >= 2 AND min_players <= 6),
  max_players INT NOT NULL DEFAULT 4 CHECK (max_players >= 3 AND max_players <= 6),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_match_players (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES scheduled_matches(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_matches_scheduled_date ON scheduled_matches(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_matches_status ON scheduled_matches(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_match_players_match_id ON scheduled_match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_match_players_user_id ON scheduled_match_players(user_id);