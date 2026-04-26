ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS avatar_mode TEXT NOT NULL DEFAULT 'preset' CHECK (avatar_mode IN ('preset', 'upload')),
  ADD COLUMN IF NOT EXISTS avatar_key TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE player_profiles
SET avatar_key = COALESCE(avatar_key, 'wood')
WHERE avatar_key IS NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

ALTER TABLE match_submissions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_mode ON player_profiles(avatar_mode);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_key ON player_profiles(avatar_key);
CREATE INDEX IF NOT EXISTS idx_match_submissions_deleted_at ON match_submissions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_nickname_lower ON player_profiles(LOWER(nickname));
