# Taledge

Talent Intelligence & Success Platform prototype. A dual-track web app that fuses DNLA psychometrics, AI-driven interview evaluation, and human coaching into a closed-loop assessment journey for candidates, institutes, recruiters, and coaches.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS 3
- AI SDK 4 with `@ai-sdk/openai` pointed at OpenRouter
  - Claude Opus 4.6 for AI interview turns
  - Gemini 2.5 Pro for resume parsing, DNLA generation, and Fit Score synthesis
- pnpm

## Local development

```bash
pnpm install
cp .env.example .env.local   # then set OPENROUTER_API_KEY
PORT=4040 pnpm dev
```

Open http://localhost:4040.

## Environment

Create a `.env.local` file in the project root (copy from below or create manually):

```bash
# Required: Gemini API key for all AI features
GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Copy the key (starts with `AIza...`)
4. Paste it in your `.env.local` file as shown above

**Note:** Gemini Flash (gemini-2.0-flash) is free for most use cases with generous limits. You don't need OpenRouter or any other service.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Used by all `/api/*` routes for: resume parsing, interview questions, DNLA generation, Fit Score synthesis, and voice interview LLM calls. Without this, endpoints fall back to safe seed data so the UI never breaks. |

## Voice Interview Pipeline

The voice interview system adds real-time ASR → LLM → TTS to the existing interview flow.

### Flow
1. Start session → `POST /api/interview/start`
2. Send audio → `POST /api/interview/voice` (multipart or base64)
3. Receive transcription, next question, TTS audio
4. Repeat until `isDone: true`
5. Get final results → `POST /api/interview/results`

### Audio Format
- Frontend records using `MediaRecorder` (webm/opus by default)
- Send as `multipart/form-data` with field `audio` (File) and `sessionId` (string)
- Or send as JSON: `{ sessionId, audioBase64: "<base64>" }`
- Max size: 10MB
- Backend converts/normalizes as needed

## API

All `/api/interview/*` routes require `studentId`, `role`, and `mode`.

- `POST /api/interview` — multi-turn interview question generation (text-based, existing)
- `POST /api/interview/start` — start a voice session, returns `sessionId`
- `POST /api/interview/voice` — receive audio, return transcription + next question + TTS audio
- `GET /api/interview/status?sessionId=...` — get current session state
- `POST /api/interview/results` — get final scores (only after `isDone: true`)
- `POST /api/parse-resume` — PDF resume parsing
- `POST /api/generate-dnla` — DNLA report generation
- `POST /api/generate-fit-score` — Final Fit Score report synthesis

Candidate flow (no top nav, focused experience):

- `/onboarding` — Step 01 Profile + Goal + Context (PDF resume parsed by Gemini 2.5 Pro)
- `/student/[id]` — Candidate dossier (clears cached transcripts on entry)
- `/student/[id]/interview/technical` — Step 02 AI Technical Interview (Claude)
- `/student/[id]/dnla` — Step 03 DNLA Social Competence (Gemini-generated from transcripts)
- `/student/[id]/interview/behavioural` — Step 04 AI Behavioural Interview (Claude)
- `/student/[id]/fit-score` — Step 05 Fit Score Reveal (Gemini-generated, PRD §9 rubric)
- `/student/[id]/development` — Step 06 Development Pathway

Marketing and B2B surfaces (with top nav):

- `/` — Landing (ClaimKeys-style sign-in split layout)
- `/exam/[id]` — Competitive Exam aspirant
- `/institute/[id]` — Placement / Exam institute dashboard
- `/recruiter/[id]` — Recruiter console with filtering
- `/coach/[id]` — Coach workspace
- `/coach-ai` — Phase 2 voice coaching preview

API:

- `POST /api/interview` — multi-turn interview question generation
- `POST /api/parse-resume` — PDF resume parsing
- `POST /api/generate-dnla` — DNLA report generation
- `POST /api/generate-fit-score` — Final Fit Score report synthesis

## Smoke Test — Voice Pipeline

### 1. Start session
```bash
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"studentId":"priya","role":"Full-stack Software Engineer","mode":"technical"}'
# → Returns: { "ok": true, "sessionId": "session_...", "mode": "technical" }
```

### 2. Send first audio (text fallback — no ASR key needed for demo)
```bash
curl -X POST http://localhost:3000/api/interview/voice \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<session_id>","text":"I built a full-stack app using React and Node.js"}'
# → Returns: { "ok": true, "nextQuestion": "...", "audioBase64": "...", "isDone": false }
```

### 3. Verify TTS audio plays
- The `audioBase64` field contains base64-encoded MP3
- Decode and save as `.mp3` to verify it plays

### 4. Check session state
```bash
curl "http://localhost:3000/api/interview/status?sessionId=<session_id>"
# → Returns: { "ok": true, "turnIndex": 1, "transcript": [...], ... }
```

### 5. End interview & get results
Send enough responses until `isDone: true`, then:
```bash
curl -X POST http://localhost:3000/api/interview/results \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<session_id>"}'
# → Returns: { "ok": true, "generated": { "technical_score": 72, "fit_score": 70, ... } }
```

Seeded in `lib/data.ts`. Three students (Priya, Rohan, Kabir), three exam aspirants (Anjali, Dhruv, Ira), two institutes (Atherix, Lakshya), one recruiter (Northbridge), one coach (Meera).

## Scripts

```bash
pnpm dev      # next dev
pnpm build    # next build
pnpm start    # next start
```
