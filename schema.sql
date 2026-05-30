-- Table to log refactored and compiled prompts (Data Harvesting)
CREATE TABLE IF NOT EXISTS prompt_logs (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  compiled_prompt TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  image_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Table to enforce rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  last_request INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_logs_created ON prompt_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_last ON rate_limits(last_request);

-- Table to harvest parsed prompt tokens (Self-Evolving Loop)
CREATE TABLE IF NOT EXISTS harvested_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_harvested_tokens_name ON harvested_tokens(token);

-- Table for user-saved gallery images (opt-in save from Workspace/Factory)
CREATE TABLE IF NOT EXISTS saved_images (
  id           TEXT PRIMARY KEY,
  prompt_text  TEXT NOT NULL,
  context_json TEXT,
  model        TEXT NOT NULL DEFAULT 'zimage',
  width        INTEGER NOT NULL DEFAULT 1024,
  height       INTEGER NOT NULL DEFAULT 1024,
  r2_key       TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_images_created ON saved_images(created_at DESC);

-- Table for operator-controlled model allow-list
CREATE TABLE IF NOT EXISTS enabled_models (
  model_id     TEXT PRIMARY KEY,
  model_type   TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description  TEXT DEFAULT '',
  sort_order   INTEGER DEFAULT 100,
  enabled      INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_enabled_models_type ON enabled_models(model_type, enabled, sort_order);
