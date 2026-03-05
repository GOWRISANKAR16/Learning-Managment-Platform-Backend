# Frontend API instructions

Use this document to wire the React frontend to the backend API. All routes live under `/api`. The backend uses **subject** and **video**; the frontend can keep **course** and **lesson** in the UI and map between them.

---

## 2.1 API base URL

- Set **`VITE_API_BASE_URL`** to the backend origin only, e.g.  
  `https://learning-managment-platform-backend.onrender.com`  
  (or `http://localhost:4000` for local dev.)
- All API requests must use base + path, including the `/api` prefix, e.g.  
  `fetch(\`${API_BASE_URL}/api/subjects\`)`,  
  `fetch(\`${API_BASE_URL}/api/auth/login\`, { ... })`.

---

## 2.2 Terminology mapping (backend → frontend)

| Backend   | Frontend (blueprint) |
|----------|------------------------|
| subject  | course                 |
| subjectId| courseId               |
| video    | lesson                 |
| videoId  | lessonId               |

- **Course list**: Call **GET /api/subjects**; map each subject to your `Course` type (`id`, `title`, `slug`, `description`, etc.). If the backend does not return `category`, `difficulty`, `instructor`, `thumbnailUrl`, the frontend can use defaults or optional fields.
- **Learning sidebar**: Call **GET /api/subjects/:subjectId/tree**; map sections to `Section` and videos to `Lesson`; use `locked` and `is_completed` for UI (lock icon, completion check).
- Use **subjectId** in URLs and payloads where the frontend currently uses **courseId**, and **videoId** where it uses **lessonId**.

---

## 2.3 Auth

- **Register**: `POST /api/auth/register` with body `{ name, email, password }`. On 200, store the returned `token` (access) in memory or Zustand and treat the user as logged in. Send cookies with subsequent requests (`credentials: 'include'`).
- **Login**: `POST /api/auth/login` with body `{ email, password }`. Same as register for storing token and user.
- **Refresh**: On any **401**, call `POST /api/auth/refresh` with `credentials: 'include'` so the refresh cookie is sent. If 200, use the new token and retry the failed request; if 401, clear auth and redirect to login.
- **Logout**: `POST /api/auth/logout` with credentials; then clear local token and user state.
- Send the access token in the header for all authenticated requests:  
  `Authorization: Bearer <token>`.

---

## 2.4 Data fetching and routes

| Purpose              | Method | Endpoint | Auth | Notes |
|----------------------|--------|----------|------|--------|
| Home / course list    | GET    | `/api/subjects?page=1&pageSize=20` (optional `q`) | No  | Map response to `Course[]` (e.g. from `items`) |
| Subject/course detail | GET    | `/api/subjects/:subjectId` | No  | Map to `Course` |
| Learning tree (sidebar) | GET  | `/api/subjects/:subjectId/tree` | Yes | Sections/videos with `locked`, `is_completed` |
| First video (redirect)| GET    | `/api/subjects/:subjectId/first-video` | Yes | Use returned `video_id` to navigate to e.g. `/learn/:courseId/lesson/:lessonId` |
| Video page meta      | GET    | `/api/videos/:videoId` | Yes | Meta, prev/next, locked; if locked show “Complete previous video” and do not mount player |
| Resume position      | GET    | `/api/progress/videos/:videoId` | Yes | Use `last_position_seconds` to start player |
| Progress update      | POST   | `/api/progress/videos/:videoId` | Yes | Body: `{ last_position_seconds, is_completed? }` (debounced) |
| Subject progress     | GET    | `/api/progress/subjects/:subjectId` | Yes | `percent_complete`, etc. |

---

## 2.5 Error handling (required for “no raw errors” in deployed frontend)

- **Fetch failure** (network, CORS, etc.): Do **not** show “Failed to fetch” or `error.message` to the user. Show a generic message such as “Something went wrong. Please try again.” or “Service temporarily unavailable.” Log the real error in the console or to a logging service.
- **5xx (500/503)**: Same generic message; never display response body or words like “Prisma”, “SQL”, “database connection failed”.
- **4xx**: Show the backend `error.message` or `message` if present and safe (e.g. “Invalid email or password”); avoid exposing stack traces or internal codes.

---

## 2.6 Checklist for frontend

- [ ] `VITE_API_BASE_URL` set to backend origin; all requests use `/api/...` path.
- [ ] Auth: register, login, logout, refresh on 401 with credentials and Bearer token.
- [ ] Subject list and tree use `/api/subjects` and `/api/subjects/:id/tree`; map to Course/Section/Lesson.
- [ ] Video meta and prev/next from `/api/videos/:videoId`; first video from `/api/subjects/:subjectId/first-video`.
- [ ] Progress: GET/POST `/api/progress/videos/:videoId`, GET `/api/progress/subjects/:subjectId`.
- [ ] No raw DB/Prisma/SQL or “failed to fetch” shown to user; use friendly messages and log details only in dev/logging.
