-- Migration 003: Operator-controlled model allow-list
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

-- Enabled by default (currently in use)
INSERT OR IGNORE INTO enabled_models (model_id, model_type, display_name, description, sort_order, enabled) VALUES
  ('zimage',        'image', 'Z-Image Turbo',   'SOTA fast diffusion · fixed params',    10, 1),
  ('flux',          'image', 'Flux Schnell',     'Realistic details · supports negative', 20, 1),
  ('nanobanana-pro','image', 'Nano Banana Pro',  'Stylized art · experimental',           30, 1),
  ('grok-imagine',  'image', 'Grok Imagine',     'Vivid scenes · atmosphere',             40, 1);

-- Available but disabled by default (unlock via admin)
INSERT OR IGNORE INTO enabled_models (model_id, model_type, display_name, description, sort_order, enabled) VALUES
  ('kontext',          'image', 'Kontext',          'img2img editing',           50, 0),
  ('nanobanana',       'image', 'Nano Banana',       'Stylized art lite',         60, 0),
  ('nanobanana-2',     'image', 'Nano Banana 2',     'Stylized art v2',           70, 0),
  ('seedream5',        'image', 'Seedream 5',        'High quality generation',   80, 0),
  ('seedream',         'image', 'Seedream',          'Quality generation',        90, 0),
  ('seedream-pro',     'image', 'Seedream Pro',      'Quality generation pro',   100, 0),
  ('gptimage',         'image', 'GPT Image',         'OpenAI image generation',  110, 0),
  ('gptimage-large',   'image', 'GPT Image Large',   'OpenAI large image',       120, 0),
  ('gpt-image-2',      'image', 'GPT Image 2',       'OpenAI image v2',          130, 0),
  ('wan-image',        'image', 'Wan Image',         'Wan generation',           140, 0),
  ('wan-image-pro',    'image', 'Wan Image Pro',     'Wan generation pro',       150, 0),
  ('qwen-image',       'image', 'Qwen Image',        'Qwen generation',          160, 0),
  ('grok-imagine-pro', 'image', 'Grok Imagine Pro',  'Vivid scenes pro',         170, 0),
  ('klein',            'image', 'Klein',             'Experimental · img2img',   180, 0),
  ('p-image',          'image', 'P-Image',           'Experimental generation',  190, 0),
  ('p-image-edit',     'image', 'P-Image Edit',      'Experimental img editing', 200, 0),
  ('nova-canvas',      'image', 'Nova Canvas',       'Canvas generation',        210, 0);
