"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coursesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
exports.coursesRouter = (0, express_1.Router)();
function toTitleCase(s) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function mapCourse(course, sections, lessonsBySection) {
    return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        category: toTitleCase(course.category),
        difficulty: toTitleCase(course.difficulty),
        description: course.description || "",
        instructor: course.instructor,
        thumbnailUrl: course.thumbnail_url,
        totalMinutes: course.total_minutes ?? undefined,
        sections: sections
            .sort((a, b) => a.order_index - b.order_index)
            .map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order_index,
            lessons: (lessonsBySection[s.id] || [])
                .sort((a, b) => a.order_index - b.order_index)
                .map((l) => ({
                id: l.id,
                title: l.title,
                order: l.order_index,
                youtubeUrl: l.youtube_url,
                durationMinutes: l.duration_minutes ?? undefined,
            })),
        })),
    };
}
exports.coursesRouter.get("/", async (_req, res) => {
    try {
        const courses = await (0, db_1.query)("SELECT * FROM courses WHERE is_published = 1 ORDER BY created_at DESC");
        if (!courses || courses.length === 0) {
            return res.status(200).json([]);
        }
        const courseIds = courses.map((c) => c.id);
        const placeholders = courseIds.map(() => "?").join(",");
        const sections = await (0, db_1.query)(`SELECT * FROM sections WHERE course_id IN (${placeholders}) ORDER BY course_id, order_index`, courseIds);
        const sectionIds = sections.map((s) => s.id);
        const secPlaceholders = sectionIds.map(() => "?").join(",");
        const lessons = await (0, db_1.query)(`SELECT * FROM lessons WHERE section_id IN (${secPlaceholders}) ORDER BY section_id, order_index`, sectionIds);
        const lessonsBySection = {};
        for (const l of lessons) {
            if (!lessonsBySection[l.section_id])
                lessonsBySection[l.section_id] = [];
            lessonsBySection[l.section_id].push(l);
        }
        const sectionsByCourse = {};
        for (const s of sections) {
            if (!sectionsByCourse[s.course_id])
                sectionsByCourse[s.course_id] = [];
            sectionsByCourse[s.course_id].push(s);
        }
        const payload = courses.map((c) => mapCourse(c, sectionsByCourse[c.id] || [], lessonsBySection));
        res.status(200).json(payload);
    }
    catch (err) {
        console.error("GET /courses error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to load courses" } });
    }
});
exports.coursesRouter.get("/:courseId", async (req, res) => {
    try {
        const course = await (0, db_1.queryOne)("SELECT * FROM courses WHERE id = ?", [req.params.courseId]);
        if (!course) {
            return res.status(404).json({ error: { message: "Course not found" } });
        }
        const sections = await (0, db_1.query)("SELECT * FROM sections WHERE course_id = ? ORDER BY order_index", [course.id]);
        const sectionIds = sections.map((s) => s.id);
        if (sectionIds.length === 0) {
            return res.status(200).json(mapCourse(course, [], {}));
        }
        const placeholders = sectionIds.map(() => "?").join(",");
        const lessons = await (0, db_1.query)(`SELECT * FROM lessons WHERE section_id IN (${placeholders}) ORDER BY order_index`, sectionIds);
        const lessonsBySection = {};
        for (const l of lessons) {
            if (!lessonsBySection[l.section_id])
                lessonsBySection[l.section_id] = [];
            lessonsBySection[l.section_id].push(l);
        }
        res.status(200).json(mapCourse(course, sections, lessonsBySection));
    }
    catch (err) {
        console.error("GET /courses/:courseId error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to load course" } });
    }
});
exports.coursesRouter.get("/:courseId/lessons", async (req, res) => {
    try {
        const course = await (0, db_1.queryOne)("SELECT * FROM courses WHERE id = ?", [
            req.params.courseId,
        ]);
        if (!course) {
            return res.status(404).json({ error: { message: "Course not found" } });
        }
        const sections = await (0, db_1.query)("SELECT * FROM sections WHERE course_id = ? ORDER BY order_index", [course.id]);
        const sectionIds = sections.map((s) => s.id);
        let lessons = [];
        if (sectionIds.length > 0) {
            const placeholders = sectionIds.map(() => "?").join(",");
            lessons = await (0, db_1.query)(`SELECT * FROM lessons WHERE section_id IN (${placeholders}) ORDER BY order_index`, sectionIds);
        }
        const lessonsBySection = {};
        for (const l of lessons) {
            if (!lessonsBySection[l.section_id])
                lessonsBySection[l.section_id] = [];
            lessonsBySection[l.section_id].push(l);
        }
        const courseMapped = mapCourse(course, sections, lessonsBySection);
        const flatLessons = lessons
            .sort((a, b) => a.order_index - b.order_index)
            .map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order_index,
            youtubeUrl: l.youtube_url,
            durationMinutes: l.duration_minutes ?? undefined,
        }));
        res.status(200).json({ course: courseMapped, lessons: flatLessons });
    }
    catch (err) {
        console.error("GET /courses/:courseId/lessons error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to load lessons" } });
    }
});
exports.coursesRouter.get("/:courseId/lessons/:lessonId", async (req, res) => {
    try {
        const course = await (0, db_1.queryOne)("SELECT * FROM courses WHERE id = ?", [
            req.params.courseId,
        ]);
        if (!course) {
            return res.status(404).json({ error: { message: "Course not found" } });
        }
        const sections = await (0, db_1.query)("SELECT * FROM sections WHERE course_id = ? ORDER BY order_index", [course.id]);
        const sectionIds = sections.map((s) => s.id);
        let lessons = [];
        if (sectionIds.length > 0) {
            const placeholders = sectionIds.map(() => "?").join(",");
            lessons = await (0, db_1.query)(`SELECT * FROM lessons WHERE section_id IN (${placeholders}) ORDER BY order_index`, sectionIds);
        }
        const lesson = lessons.find((l) => l.id === req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: { message: "Lesson not found" } });
        }
        const lessonsBySection = {};
        for (const l of lessons) {
            if (!lessonsBySection[l.section_id])
                lessonsBySection[l.section_id] = [];
            lessonsBySection[l.section_id].push(l);
        }
        const courseMapped = mapCourse(course, sections, lessonsBySection);
        const flatLessons = lessons
            .sort((a, b) => a.order_index - b.order_index)
            .map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order_index,
            youtubeUrl: l.youtube_url,
            durationMinutes: l.duration_minutes ?? undefined,
        }));
        res.status(200).json({
            course: courseMapped,
            lesson: {
                id: lesson.id,
                title: lesson.title,
                order: lesson.order_index,
                youtubeUrl: lesson.youtube_url,
                durationMinutes: lesson.duration_minutes ?? undefined,
            },
            lessons: flatLessons,
        });
    }
    catch (err) {
        console.error("GET /courses/:courseId/lessons/:lessonId error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to load lesson" } });
    }
});
