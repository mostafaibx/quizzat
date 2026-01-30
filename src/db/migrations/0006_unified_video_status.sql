-- Migration: Unify video status columns
-- Consolidates transcription_status and transcription_error into the main status and error_message columns

-- Step 1: Rename last_error to error_message
ALTER TABLE videos RENAME COLUMN last_error TO error_message;
--> statement-breakpoint

-- Step 2: Migrate transcription errors to error_message (where status is not already in error state)
UPDATE videos
SET error_message = transcription_error
WHERE transcription_error IS NOT NULL
  AND error_message IS NULL;
--> statement-breakpoint

-- Step 3: Update status based on old transcription_status
-- Convert 'error' to 'failed_encoding'
UPDATE videos
SET status = 'failed_encoding'
WHERE status = 'error';
--> statement-breakpoint

-- Convert transcription failures to failed_transcription (only if not already failed_encoding)
UPDATE videos
SET status = 'failed_transcription'
WHERE transcription_status = 'failed'
  AND status NOT IN ('failed_encoding');
--> statement-breakpoint

-- Videos that completed transcription but are 'ready' stay as 'ready' (no action needed)
-- Videos that are 'ready' with transcription 'completed' stay 'ready'

-- Step 4: Drop the old transcription columns
ALTER TABLE videos DROP COLUMN transcription_status;
--> statement-breakpoint
ALTER TABLE videos DROP COLUMN transcription_error;
