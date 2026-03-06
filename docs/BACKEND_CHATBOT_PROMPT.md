# Backend: Add POST /chat for AI Assistant (copy this to your backend team)

The Learning Studio frontend calls **POST /chat** on your API for the in-app AI Assistant. Follow this document exactly so the frontend works without changes.

---

## 1. What the frontend does (do not change the frontend)

- Sends **POST** to: `{API_BASE_URL}/chat` (then if 404, tries `{API_BASE_URL}/api/chat`).
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <access_token>` (same JWT as `/courses/:id/lessons`, etc.).
- **Body:** `{ "message": "<user text>", "history": [ { "role": "user"|"assistant", "content": "..." }, ... ] }`
- Expects **200** with JSON that has a string reply in one of these keys (first found wins):  
  `reply`, `content`, `message`, `response`, `text`, `result`, `output`  
  or inside `data.reply`, `data.content`, etc.
- On **401:** show "Unauthorized" / session expired.
- On **400/502/503/500:** show `error.message` or `message` from your JSON (frontend shows it in the chat).

Your backend must: Implement **POST /chat** at the same base URL as your other routes (e.g. `https://learning-managment-platform-backend.onrender.com/chat`), with same JWT auth as other protected routes.

---

## 2. Contract: request and response

**Request:**

- **Method:** POST
- **Path:** `/chat` (or `/api/chat` if you mount under `/api`).
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <access_token>` (required).
- **Body (JSON):**
  ```json
  { "message": "What is React?", "history": [ { "role": "user", "content": "Hi" }, { "role": "assistant", "content": "Hello!" } ] }
  ```
  - `message` (string, required).
  - `history` (array, optional).

**Success (200):**

```json
{ "reply": "React is a JavaScript library..." }
```

or

```json
{ "content": "React is a JavaScript library..." }
```

**Errors (JSON):**

- **401:** `{ "error": { "message": "Unauthorized" } }`
- **400:** `{ "error": { "message": "Message is required" } }`
- **502/503:** `{ "error": { "message": "AI service temporarily unavailable" } }`
- **500:** `{ "error": { "message": "Something went wrong. Please try again." } }`

---

## 3. Implementation options

### Option A – Proxy to Hugging Face (recommended)

1. **POST** `https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space/call/predict`  
   **Body:** `{ "data": [ "<user message>" ] }`  
   → get `event_id` from response.

2. **GET** `https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space/call/predict/<event_id>`  
   → poll until done; parse SSE data: line; extract reply string.

3. Return **200** with `{ "reply": "<parsed text>" }`.

4. On Space 500 or timeout → **502** with `{ "error": { "message": "AI service temporarily unavailable" } }`.

5. Optional: use `HF_TOKEN` in env and send `Authorization: Bearer <HF_TOKEN>` to the Space.

### Option B – Other AI API

Call OpenAI/Anthropic/etc. from the server; map response to a single string; return `{ "reply": "..." }` or `{ "content": "..." }`.

---

## 4. Example code (Node.js + Express)

```js
app.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: { message: 'Message is required' } })
    }
    const reply = await getReplyFromHuggingFace(message.trim())
    return res.json({ reply })
  } catch (err) {
    if (err.code === 'UPSTREAM_ERROR' || err.message?.includes('timeout')) {
      return res.status(502).json({ error: { message: 'AI service temporarily unavailable' } })
    }
    console.error('Chat error', err)
    return res.status(500).json({ error: { message: 'Something went wrong. Please try again.' } })
  }
})
async function getReplyFromHuggingFace(userMessage) {
  const base = 'https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space'
  const token = process.env.HF_TOKEN
  const postRes = await fetch(`${base}/call/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ data: [userMessage] }),
  })
  if (!postRes.ok) throw Object.assign(new Error('Upstream error'), { code: 'UPSTREAM_ERROR' })
  const postData = await postRes.json()
  const eventId = postData?.event_id
  if (!eventId) throw new Error('No event_id')
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const getRes = await fetch(`${base}/call/predict/${eventId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!getRes.ok) continue
    const text = await getRes.text()
    const dataMatch = text.match(/^data:\s*(\[.*\])\s*$/m)
    if (dataMatch) {
      try {
        const arr = JSON.parse(dataMatch[1])
        const last = Array.isArray(arr) ? arr[arr.length - 1] : arr
        if (typeof last === 'string') return last
        if (last?.content) return String(last.content)
      } catch (_) {}
    }
  }
  throw new Error('Timeout')
}
```

---

## 5. CORS and URL

- **CORS:** Allow frontend origin (e.g. `http://localhost:5173`, production URL) with `credentials: true`.
- **URL:** Register **POST /chat** on the same app as `/auth` and `/courses` (e.g. `https://learning-managment-platform-backend.onrender.com/chat`).

---

## 6. How to test

```bash
curl -X POST https://learning-managment-platform-backend.onrender.com/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"message":"Hello","history":[]}'
```

Expected: **200** and body like `{"reply":"Hello! How can I help?"}`.

---

## 7. Checklist for backend

- [ ] **POST /chat** on same app as **/auth** and **/courses** (path **/chat** or **/api/chat**).
- [ ] Same JWT middleware as other protected routes.
- [ ] Read **message** (required) and **history** (optional) from **req.body**.
- [ ] **200** with `{ "reply": "<string>" }` or `{ "content": "<string>" }`.
- [ ] **401/400/502/503/500** with JSON `{ "error": { "message": "..." } }` or `{ "message": "..." }`.
- [ ] If using HF Space: call it only from server; store token in env.
- [ ] CORS allows frontend origin with credentials.

File in your project: **docs/BACKEND_CHATBOT_PROMPT.md** — you can share this file with the backend team or copy the content above.
