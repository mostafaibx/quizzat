-- Migration: Video Pipeline - Cloudflare Stream → R2 + GCP Encoding
-- This migration updates the videos table and adds new tables for encoding workflow

-- Drop the old stream_video_id unique index
DROP INDEX IF EXISTS `videos_stream_video_id_unique`;
--> statement-breakpoint

-- Create new videos table with R2 fields (SQLite doesn't support DROP COLUMN well, so we recreate)
CREATE TABLE `videos_new` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text,
	`title` text NOT NULL,
	`description` text,
	`r2_raw_path` text,
	`r2_thumbnail_path` text,
	`source_width` integer,
	`source_height` integer,
	`file_size` integer,
	`mime_type` text,
	`source_metadata` text,
	`duration` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`available_days` integer DEFAULT 3 NOT NULL,
	`available_until` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Copy data from old videos table to new (excluding stream_video_id, thumbnail becomes r2_thumbnail_path)
INSERT INTO `videos_new` (
	`id`, `user_id`, `lesson_id`, `title`, `description`,
	`r2_thumbnail_path`, `duration`, `status`, `visibility`,
	`available_days`, `available_until`, `created_at`, `updated_at`
)
SELECT
	`id`, `user_id`, `lesson_id`, `title`, `description`,
	`thumbnail`, `duration`, `status`, `visibility`,
	`available_days`, `available_until`, `created_at`, `updated_at`
FROM `videos`;
--> statement-breakpoint

-- Drop old videos table
DROP TABLE `videos`;
--> statement-breakpoint

-- Rename new table to videos
ALTER TABLE `videos_new` RENAME TO `videos`;
--> statement-breakpoint

-- Create video_variants table for encoded versions
CREATE TABLE `video_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`quality` text NOT NULL,
	`width` integer,
	`height` integer,
	`bitrate` integer,
	`r2_path` text,
	`file_size` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Create encoding_jobs table for GCP job tracking
CREATE TABLE `encoding_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`external_job_id` text,
	`job_type` text NOT NULL,
	`target_quality` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0,
	`progress_message` text,
	`queued_at` text,
	`started_at` text,
	`completed_at` text,
	`error_code` text,
	`error_message` text,
	`error_details` text,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Create indexes for common queries
CREATE INDEX `video_variants_video_id_idx` ON `video_variants` (`video_id`);
--> statement-breakpoint
CREATE INDEX `encoding_jobs_video_id_idx` ON `encoding_jobs` (`video_id`);
--> statement-breakpoint
CREATE INDEX `encoding_jobs_status_idx` ON `encoding_jobs` (`status`);
