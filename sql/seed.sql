-- Optional: run after schema.sql to get one course with one lesson (for testing).
-- Uses fixed ids. Safe to run multiple times (IGNORE skips if row exists).

INSERT IGNORE INTO `courses` (`id`, `title`, `slug`, `category`, `difficulty`, `description`, `instructor`, `thumbnail_url`, `total_minutes`, `is_published`) VALUES
('course-1', 'Getting Started', 'getting-started', 'Other', 'Beginner', 'A short demo course.', 'Demo Instructor', 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 5, 1);

INSERT IGNORE INTO `sections` (`id`, `course_id`, `title`, `order_index`) VALUES
('section-1', 'course-1', 'Intro', 1);

INSERT IGNORE INTO `lessons` (`id`, `section_id`, `title`, `description`, `youtube_url`, `order_index`, `duration_minutes`) VALUES
('lesson-1', 'section-1', 'Welcome', 'First lesson', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, 5);

-- Optional: create admin user (password: admin123). Generate a real hash with: node -e "const b=require('bcryptjs'); b.hash('admin123',10).then(h=>console.log(h))"
-- INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `status`) VALUES
-- ('admin-1', 'admin@lms.test', '$2a$10$...', 'Admin', 'admin', 'active');
