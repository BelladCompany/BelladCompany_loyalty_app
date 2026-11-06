-- Migration 070: Add Canvas Blocks Schema for Visual App Builder
-- Allows users to build, arrange, and customize loyalty app screens from a plain canvas

ALTER TABLE app_builder_configs 
ADD COLUMN IF NOT EXISTS canvas_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_blueprint VARCHAR(100) DEFAULT 'bellad_blueprint';
