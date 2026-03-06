# Backend Chatbot API – Implementation Prompt

Give this to the backend team so they can implement the AI chatbot and the Learning Studio frontend can call your API instead of Hugging Face directly. That avoids CORS, 500s, and keeps the Hugging Face token on the server.

---

## What the frontend needs

One authenticated endpoint: **POST /chat** (or **POST /api/chat** if the app uses an `/api` prefix).  
The frontend sends the user's message and (optionally) conversation history; the backend returns the AI reply.

### 1. Endpoint: **POST /chat**

- **Auth:** Required. Same JWT as other protected routes (`Authorization: Bearer <token>`). Return 401 if missing or invalid.

**Request body (JSON):**

```json
{
  "message": "User's message text here",
  "history": []
}
```

- **message** (string, required): Latest user message.
- **history** (array, optional): Previous turns. Items can be `{ "role": "user" | "assistant", "content": "..." }`. You can ignore it if you don't use context.

**Success (200):**

```json
{
  "reply": "The AI assistant's reply text here"
}
```

Or:

```json
{
  "content": "The AI assistant's reply text here"
}
```

The frontend accepts either **reply** or **content** (and also **message**, **response**, **text**, **result**, **output**).

**Errors:**

- **401:** Missing/invalid token → `{ "error": { "message": "Unauthorized" } }` or `{ "message": "Unauthorized" }`.
- **400:** Invalid/empty body → `{ "error": { "message": "Message is required" } }`.
- **502/503:** Upstream AI down → `{ "error": { "message": "AI service temporarily unavailable" } }`.
- **500:** Internal error → `{ "error": { "message": "Something went wrong. Please try again." } }`. Do not expose stack traces.

---

### 2. Backend behaviour (recommended)

1. Validate JWT and set `req.user.id` (and optionally `req.user.name`).
2. Validate message (non-empty string, optional max length e.g. 4000).
3. Call your AI provider and return the reply.

#### Option A – Proxy to Hugging Face Space (recommended)

- **Space URL:** `https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space`
- Use a Hugging Face token only on the server (e.g. env `HF_TOKEN` or `HUGGINGFACE_TOKEN`).

From the backend:

1. **POST**  
   `https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space/call/predict`  
   (or `/call/chat` if the Space uses that)  
   **Body:** `{ "data": [message] }`  
   **Headers:** `Content-Type: application/json`, and if needed `Authorization: Bearer <HF_TOKEN>`.

2. From the response take `event_id`, then **GET**  
   `https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space/call/predict/<event_id>`  
   (same auth if required) until you get the final result (SSE or JSON).

3. Parse the model reply and return it as **reply** (or **content**) in your JSON.

4. If the Space returns 500 or times out, return 502 with a friendly message.

#### Option B – Another AI API

Use any HTTP chat API (OpenAI, Anthropic, etc.). Send message (and optionally history) in the format that API expects, then map the response to `{ "reply": "..." }` or `{ "content": "..." }`.

---

### 3. CORS and base URL

- **CORS:** Same as the rest of the API: allow the frontend origin(s) (e.g. `http://localhost:5173`, production URL) with `credentials: true`.
- **Base URL:** Frontend uses `https://learning-managment-platform-backend.onrender.com`. So the full URL it will call is:  
  `https://learning-managment-platform-backend.onrender.com/chat`  
  or `https://learning-managment-platform-backend.onrender.com/api/chat` if routes are under `/api`.

---

### 4. Example (Node/Express)

```js
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: { message: 'Message is required' } })
    }
    const reply = await chatService.getReply(message.trim()) // your HF proxy or other API
    return res.json({ reply })
  } catch (e) {
    if (e.code === 'UPSTREAM_ERROR') return res.status(502).json({ error: { message: 'AI service temporarily unavailable' } })
    return res.status(500).json({ error: { message: 'Something went wrong. Please try again.' } })
  }
})
```

---

### 5. Checklist for backend

- [ ] **POST /chat** (or **POST /api/chat**) exists and is protected with the same JWT auth as other routes.
- [ ] Request: JSON with **message** (string) and optional **history** (array).
- [ ] Response: 200 with `{ "reply": "..." }` or `{ "content": "..." }`.
- [ ] Errors: 401, 400, 502/503, 500 with JSON **error.message** or **message**.
- [ ] If using the Hugging Face Space: call it only from the server with a server-side HF token; do not expose the token to the frontend.
- [ ] CORS allows the frontend origin with credentials.

Once this is in place, the frontend will call **POST /chat** first and only fall back to direct Hugging Face (or show “unavailable”) when the backend is not deployed or returns an error.
