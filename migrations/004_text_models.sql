-- Migration 004: Seed known Pollinations text models
INSERT OR IGNORE INTO enabled_models (model_id, model_type, display_name, description, sort_order, enabled) VALUES
  ('llama-scout',      'text', 'Llama Scout',        'Fast · used for prompt refactoring',   10, 1),
  ('llama-maverick',   'text', 'Llama Maverick',     'Balanced capability',                  20, 0),
  ('openai',           'text', 'GPT-5.5',            'OpenAI flagship',                      30, 0),
  ('openai-fast',      'text', 'GPT-5',              'OpenAI fast',                          40, 0),
  ('claude-fast',      'text', 'Claude Fast',        'Anthropic fast',                       50, 0),
  ('claude',           'text', 'Claude',             'Anthropic flagship',                   60, 0),
  ('gemini',           'text', 'Gemini 3',           'Google flagship',                      70, 0),
  ('gemini-3.5-flash', 'text', 'Gemini 3.5 Flash',   'Google fast',                          80, 0),
  ('deepseek-pro',     'text', 'DeepSeek Pro',       'DeepSeek flagship',                    90, 0),
  ('grok',             'text', 'Grok 4.3',           'xAI flagship',                        100, 0),
  ('mistral',          'text', 'Mistral',            'Mistral balanced',                    110, 0),
  ('qwen-coder',       'text', 'Qwen Coder',         'Code-optimised',                      120, 0),
  ('qwen-large',       'text', 'Qwen Large',         'Qwen flagship',                       130, 0),
  ('minimax',          'text', 'MiniMax',            'MiniMax model',                       140, 0);
