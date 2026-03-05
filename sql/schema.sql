-- LMS Backend Schema (run once in Aiven MySQL)
-- All IDs are VARCHAR so no integer/CUID mismatch. No Prisma required.

SET FOREIGN_KEY_CHECKS = 0;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('student','instructor','admin') NOT NULL DEFAULT 'student',
  `status` ENUM('active','blocked') NOT NULL DEFAULT 'active',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

-- Refresh tokens (for logout / 30-day refresh)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_refresh_user` (`user_id`, `token_hash`)
);

-- Courses (frontend: "courses")
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `category` VARCHAR(64) NOT NULL DEFAULT 'Other',
  `difficulty` VARCHAR(32) NOT NULL DEFAULT 'Beginner',
  `description` TEXT,
  `instructor` VARCHAR(255) NOT NULL DEFAULT '',
  `thumbnail_url` VARCHAR(512) NOT NULL DEFAULT '',
  `total_minutes` INT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

-- Sections (per course)
CREATE TABLE IF NOT EXISTS `sections` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `course_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_section_order` (`course_id`, `order_index`)
);

-- Lessons (videos; frontend: "lessons")
CREATE TABLE IF NOT EXISTS `lessons` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `section_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `youtube_url` VARCHAR(512) NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `duration_minutes` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_lesson_order` (`section_id`, `order_index`)
);

-- Lesson progress (per user per lesson)
CREATE TABLE IF NOT EXISTS `lesson_progress` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `course_id` VARCHAR(36) NOT NULL,
  `lesson_id` VARCHAR(36) NOT NULL,
  `last_position_seconds` INT NOT NULL DEFAULT 0,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `uq_user_lesson` (`user_id`, `lesson_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;

-- Optional: one admin user (password: admin123) – change in production
-- INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `status`) VALUES
-- ('admin-1', 'admin@lms.test', '$2a$10$rQnM1xJZ8YqH8K9ZqK9ZqOqK9ZqK9ZqK9ZqK9ZqK9ZqK9ZqK9ZqK9', 'Admin', 'admin', 'active')
-- ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP(3);
