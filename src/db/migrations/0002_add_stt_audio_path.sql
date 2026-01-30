-- Migration: Add stt_audio_path column to videos table
-- This column stores the R2 path for extracted audio files used for speech-to-text

ALTER TABLE videos ADD COLUMN stt_audio_path TEXT;
