-- Migration: Add transcription fields to videos table
-- Tracks transcription status, transcript location, and errors

ALTER TABLE videos ADD COLUMN transcript_path TEXT;
ALTER TABLE videos ADD COLUMN transcription_status TEXT DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN transcription_error TEXT;
