-- Phase 5b.4 — Add process media columns to images + videos tables.
-- The hover preview system: when hovering over an image or video cell,
-- the public site shows a floating card with (in user-defined order):
--   1. The description text
--   2. A "how I did it" process video (heavily compressed, autoplay muted loop)
--   3. A "how I did it" process image (e.g., Photoshop layers timeline)
--
-- The preview_order JSONB array stores the user's preferred order, e.g.:
--   ["description", "video", "image"]  (default)
--   ["image", "description", "video"]  (image first, then text, then video)
--
-- The hover card renders ONLY the items that have data — if process_video_url
-- is null, the "video" item is skipped regardless of preview_order.
--
-- Run this in the Supabase SQL Editor (Dashboard > SQL > New Query).

-- Images table (Selected Frames + Visual Lab uploads)
ALTER TABLE images ADD COLUMN IF NOT EXISTS process_video_url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS process_image_url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS preview_order JSONB DEFAULT '["description","video","image"]';

-- Videos table (Video section uploads)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS process_video_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS process_image_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS preview_order JSONB DEFAULT '["description","video","image"]';
