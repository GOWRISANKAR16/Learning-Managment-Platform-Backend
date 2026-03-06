# Frontend instructions – match current backend

Use this document to wire your React frontend to the **current** backend (MySQL, no Prisma). Follow each section in order.

---

## 1. API base URL

- In your frontend project set:
  - **Dev:** `VITE_API_BASE_URL=http://localhost:4000`
  - **Production:** `VITE_API_BASE_URL=https://learning-managment-platform-backend.onrender.com` (or your backend URL)
- **No trailing slash** – use `https://learning-managment-platform-backend.onrender.com`, not `https://...com/`. A trailing slash plus paths like `/auth/login` produces `//auth/login` and the backend returns 404.
- When building the request URL, normalize the base so a trailing slash never causes a double slash:  
  `const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');`  
  then use `\`${base}/auth/login\`` etc.
- **Do not add `/api`** – all paths are under the root:
  - Auth: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/refresh`
  - Courses: `/courses`, `/courses/:courseId`, `/courses/:courseId/lessons`, `/courses/:courseId/lessons/:lessonId`
  - Progress: `/users/:userId/progress`, `/users/:userId/progress/:courseId`, `/courses/:courseId/progress-summary`

**Example:**  
`fetch(\`${import.meta.env.VITE_API_BASE_URL}/auth/login\`, { ... })`

---

## 2. Auth – requests and responses

### Register  
**POST** `{API_BASE_URL}/auth/register`

- **Body:** `{ "name": string, "email": string, "password": string }`
- **Success (200):** `{ "token": "<jwt_access_token>", "user": { "id", "name", "email", "role" } }`
- **Error (400):** `{ "error": { "message": "..." } }` (e.g. "Email already in use", "name, email and password are required")

**Frontend:** Store `token` and `user` (e.g. Zustand). Send cookie with requests (`credentials: 'include'`) so refresh works.

### Login  
**POST** `{API_BASE_URL}/auth/login`

- **Body:** `{ "email": string, "password": string }`
- **Success (200):** same as register: `{ "token", "user" }`
- **Error (401):** `{ "error": { "message": "Invalid email or password" } }`
- **Error (400):** `{ "error": { "message": "email and password are required" } }`

**Frontend:** Same as register – store `token` and `user`, use `credentials: 'include'` for fetch.

### Logout  
**POST** `{API_BASE_URL}/auth/logout`

- No body. Send **credentials** so the refresh cookie is sent and cleared.
- **Response (200):** `{ "success": true }`

**Frontend:** Call this, then clear local token and user (always treat as success so UI can reset).

### Current user  
**GET** `{API_BASE_URL}/auth/me`

- **Header:** `Authorization: Bearer <access_token>`
- **Success (200):** `{ "id", "name", "email", "role" }` (role is lowercase: `"student"`, `"admin"`, `"instructor"`)
- **Error (401):** `{ "error": { "message": "Unauthorized" } }`

### Refresh token  
**POST** `{API_BASE_URL}/auth/refresh`

- No body. Send **credentials: 'include'** so the refresh cookie is sent.
- **Success (200):** `{ "token": "<new_access_token>" }`
- **Error (401):** `{ "error": { "message": "Missing refresh token" } }` or `"Invalid refresh token"`

**Frontend:** On any **401** from an authenticated request, call this once. If 200, save the new `token` and retry the failed request. If 401, clear auth and redirect to login.

---

## 3. Courses – requests and responses

### Course list  
**GET** `{API_BASE_URL}/courses`

- No auth required.
- **Success (200):** **Array** of courses (no wrapper):
  ```json
  [
    {
      "id", "title", "slug", "category", "difficulty", "description",
      "instructor", "thumbnailUrl", "totalMinutes",
      "sections": [
        { "id", "title", "order", "lessons": [ { "id", "title", "order", "youtubeUrl", "durationMinutes" } ] }
      ]
    }
  ]
  ```
- **Error (500):** `{ "error": { "message": "Failed to load courses" } }`

**Frontend:** Use this for the home/course list. Map directly to your `Course` type.

### Course detail  
**GET** `{API_BASE_URL}/courses/:courseId`

- **Success (200):** Single course object (same shape as one element above).
- **Error (404):** `{ "error": { "message": "Course not found" } }`

### Course lessons (flattened)  
**GET** `{API_BASE_URL}/courses/:courseId/lessons`

- **Success (200):** `{ "course": { ... }, "lessons": [ { "id", "title", "order", "youtubeUrl", "durationMinutes" }, ... ] }`

### One lesson  
**GET** `{API_BASE_URL}/courses/:courseId/lessons/:lessonId`

- **Success (200):** `{ "course": { ... }, "lesson": { "id", "title", "order", "youtubeUrl", "durationMinutes" }, "lessons": [ ... ] }`
- **Error (404):** `{ "error": { "message": "Lesson not found" } }`

---

## 4. Progress – requests and responses

All progress endpoints require **auth**: header `Authorization: Bearer <token>`.

### Update progress  
**POST** `{API_BASE_URL}/users/:userId/progress`

- **Body:** `{ "courseId": string, "lessonId": string, "lastPositionSeconds": number, "isCompleted"?: boolean }`
- **Success (200):** `{ "success": true }`
- **Error (403):** if `userId` is not the current user (and not admin).

**Frontend:** Call this (e.g. debounced) while the user watches a lesson; on video end send `isCompleted: true`.

### Get progress for a course  
**GET** `{API_BASE_URL}/users/:userId/progress/:courseId`

- **Success (200):** `{ "courseId", "lessons": { "<lessonId>": { "lastPositionSeconds", "isCompleted", "updatedAt" } } }`

**Frontend:** Use for resume (e.g. start player at `lastPositionSeconds`) and to show completion state in the sidebar.

### Progress summary  
**GET** `{API_BASE_URL}/courses/:courseId/progress-summary`

- **Success (200):** `{ "totalLessons", "completedLessons", "percentComplete" }`

**Frontend:** Use on course or profile page for the completion percentage.

---

## 5. What you must change in the frontend

| Item | What to do |
|------|------------|
| **Base URL** | Use `VITE_API_BASE_URL` for all requests. **No `/api`** in the path. **No trailing slash** on the base (or normalize before concatenating) to avoid `//auth/login` and 404. |
| **Auth** | After login/register, store `response.token` and `response.user`. Send `Authorization: Bearer <token>` on every protected request. |
| **Credentials** | Use `credentials: 'include'` (fetch) or `withCredentials: true` (axios) so the refresh cookie is sent. |
| **Refresh** | On 401, call POST `/auth/refresh` with credentials; if 200, update token and retry; if 401, clear auth and go to login. |
| **Logout** | POST `/auth/logout` with credentials, then clear token and user in state/storage. |
| **Course list** | GET `/courses` returns an **array** (not `{ items: [...] }`). Use it as your course list. |
| **Errors** | Do **not** show "Failed to fetch" or raw error messages. On 5xx or network error show "Something went wrong" or "Service temporarily unavailable". |

---

## 6. Backend CORS

Backend allows origins from **`CORS_ORIGIN`** (comma-separated for multiple). On Render (or your host) set:

- **Dev:** `CORS_ORIGIN=http://localhost:5173` (or your Vite dev URL)
- **Production:** `CORS_ORIGIN=https://your-frontend-domain.vercel.app`

---

## 7. Checklist

- [ ] `VITE_API_BASE_URL` set **without trailing slash**; all API URLs use it **without** `/api`.
- [ ] Login/register: send body, store `token` + `user`, use credentials.
- [ ] All authenticated requests: `Authorization: Bearer <token>` and credentials.
- [ ] On 401: call POST `/auth/refresh` with credentials; update token or redirect to login.
- [ ] Logout: POST `/auth/logout` with credentials, then clear local state.
- [ ] Course list: GET `/courses` (response is array).
- [ ] Progress: POST `/users/:userId/progress`, GET `/users/:userId/progress/:courseId`, GET `/courses/:courseId/progress-summary`.
- [ ] User-facing errors: generic message only; log real errors in dev.

---

## 8. Not available in current backend

- **Admin** routes (`/admin/courses`, `/admin/users`, `/admin/assignments`) – removed.
- **Messages** (threads, messages) – removed.
- **Assignments** (list, submit, grade) – removed.

Hide or disable these features in the UI, or keep them for a future backend version.
