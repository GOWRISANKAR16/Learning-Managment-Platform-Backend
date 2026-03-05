-- Add is_published to Course (handout: subjects.is_published)
ALTER TABLE `Course` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true;
