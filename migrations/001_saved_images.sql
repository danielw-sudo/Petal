-- Migration 001: saved_images table
-- Auto-saved generations: R2 key + public URL + prompt context

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
