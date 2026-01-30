-- Migration: Add moduleId to videos table
-- Videos must belong to a module (required relationship)

-- Add module_id column to videos table
ALTER TABLE `videos` ADD COLUMN `module_id` text REFERENCES `modules`(`id`) ON DELETE CASCADE;
--> statement-breakpoint

-- Create index for module_id queries
CREATE INDEX `videos_module_id_idx` ON `videos` (`module_id`);
--> statement-breakpoint

-- Note: Existing videos will have NULL module_id
-- You may need to manually assign them to modules or delete them
