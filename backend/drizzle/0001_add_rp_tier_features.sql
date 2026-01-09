-- Migration: Add RP Tier Features
-- Adds prompts, tropes, and daily prompt scheduling tables
-- All features require 'rp' subscription tier

-- Update users table to clarify tier usage
COMMENT ON COLUMN users.subscription_tier IS 'Subscription tier: free (basic features) or rp (includes RP tools, prompts, and tropes)';

-- Update bot_settings to support daily prompts
ALTER TABLE bot_settings
ADD COLUMN IF NOT EXISTS daily_prompt_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_prompt_channel_id TEXT,
ADD COLUMN IF NOT EXISTS daily_prompt_time TEXT DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS last_prompt_posted TIMESTAMP;

-- Create prompts table (RP tier feature)
CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('character', 'world', 'combat', 'social', 'plot')),
  prompt_text TEXT NOT NULL,
  use_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_use_count ON prompts(use_count DESC);

-- Create tropes table (RP tier feature)
CREATE TABLE IF NOT EXISTS tropes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('archetype', 'dynamic', 'situation', 'plot')),
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tropes_category ON tropes(category);
CREATE INDEX IF NOT EXISTS idx_tropes_use_count ON tropes(use_count DESC);

-- Create prompt_schedule table (RP tier feature)
CREATE TABLE IF NOT EXISTS prompt_schedule (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  time TEXT NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prompt_schedule_guild ON prompt_schedule(guild_id);
CREATE INDEX IF NOT EXISTS idx_prompt_schedule_active ON prompt_schedule(active);

-- Add default prompts
INSERT INTO prompts (category, prompt_text) VALUES
  ('character', 'Your character discovers a hidden talent they never knew they had. What is it, and how do they react?'),
  ('character', 'Describe a moment when your character had to choose between loyalty and self-preservation.'),
  ('character', 'What is your character''s greatest fear, and how do they hide it from others?'),
  ('world', 'A mysterious phenomenon affects the weather in your region. How does it impact daily life?'),
  ('world', 'Describe a local festival or celebration unique to your character''s homeland.'),
  ('combat', 'Your character faces an opponent who knows all their tricks. How do they adapt?'),
  ('combat', 'A battle goes wrong. Describe how your character reacts when the plan falls apart.'),
  ('social', 'Your character must convince someone who deeply mistrusts them. How do they approach it?'),
  ('social', 'Describe an awkward social situation your character finds themselves in.'),
  ('plot', 'A mysterious stranger offers your character something they desperately need. What''s the catch?'),
  ('plot', 'Your character receives a cryptic message. What does it say, and what does it mean?')
ON CONFLICT DO NOTHING;

-- Add default tropes
INSERT INTO tropes (category, name, description) VALUES
  ('archetype', 'The Reluctant Hero', 'A character who never wanted responsibility but rises to the occasion when needed most.'),
  ('archetype', 'The Mentor with a Dark Past', 'A wise guide harboring secrets that could change everything the hero believes.'),
  ('archetype', 'The Trickster', 'A chaotic force who disrupts plans but often reveals hidden truths through their actions.'),
  ('dynamic', 'Enemies to Allies', 'Former adversaries must set aside their differences to face a greater threat together.'),
  ('dynamic', 'Redemption Arc', 'A character seeks to atone for past mistakes, facing skepticism and their own guilt.'),
  ('dynamic', 'Forbidden Friendship', 'A bond that society, law, or circumstance forbids, yet endures despite the cost.'),
  ('situation', 'Trapped Together', 'Characters must cooperate to escape confinement, revealing their true selves in the process.'),
  ('situation', 'The Masquerade', 'A social event where hidden identities and secret agendas come to light.'),
  ('situation', 'Against the Clock', 'Time is running out, and every decision becomes critical under mounting pressure.'),
  ('plot', 'The Chosen One Prophecy', 'Destiny marks a character for greatness—or terrible sacrifice.'),
  ('plot', 'Betrayal from Within', 'Someone trusted reveals they were never truly on the heroes'' side.'),
  ('plot', 'The MacGuffin Quest', 'A valuable object drives the story, though its true importance may surprise everyone.')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE prompts IS 'RP prompts for creative inspiration (RP tier feature)';
COMMENT ON TABLE tropes IS 'Story and character tropes for RP inspiration (RP tier feature)';
COMMENT ON TABLE prompt_schedule IS 'Schedule for automated daily prompts (RP tier feature)';
