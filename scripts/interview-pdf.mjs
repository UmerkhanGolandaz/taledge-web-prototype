/**
 * Interview Evaluation PDF generator.
 *
 * Pulls an interview session from Firestore (`interviewSessions`), takes the
 * top-N question/answer pairs, scores each answer on sub-dimensions via Gemini
 * (with a written rationale), and renders a PDF: per question -> question,
 * answer given, score breakdown (why it scored that much), and a per-question
 * end score, plus an overall summary.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *     node scripts/interview-pdf.mjs [sessionId] [topN]
 *   (or place the key at ./serviceAccount.json and just run it)
 *
 * Requires GEMINI_API_KEY (loaded from .env.local).
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import PDFDocument from "pdfkit";

dotenv.config({ path: ".env.local" });

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const TOP_N = Number(process.argv[3] || 10);
const ARG_SESSION = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : null;

function die(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}

if (!fs.existsSync(SA_PATH)) {
  die(
    `No service account at ${SA_PATH}. Firebase console -> Project settings -> ` +
      `Service accounts -> Generate new private key, save as serviceAccount.json here.`
  );
}
if (!GEMINI_KEY) die("GEMINI_API_KEY missing in .env.local");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(SA_PATH, "utf8"))) });
const db = getFirestore();

async function gemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!r.ok) die(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("["), e = cleaned.lastIndexOf("]");
    if (s !== -1 && e !== -1) return JSON.parse(cleaned.slice(s, e + 1));
    die("Gemini returned unparseable JSON: " + cleaned.slice(0, 200));
  }
}

async function pickSession() {
  if (ARG_SESSION) {
    const d = await db.collection("interviewSessions").doc(ARG_SESSION).get();
    if (!d.exists) die("Session not found: " + ARG_SESSION);
    return { id: d.id, ...d.data() };
  }
  // Survey all sessions; pick the RICHEST (most answered questions) so the
  // report has the fullest Q&A set. Log the candidates for transparency.
  const snap = await db.collection("interviewSessions").limit(200).get();
  const ranked = snap.docs
    .map((d) => {
      const s = d.data();
      const answers = (s.transcript || []).filter((t) => t.role === "user" && (t.content || "").trim());
      return { id: d.id, data: s, answers: answers.length };
    })
    .filter((x) => x.answers > 0)
    .sort((a, b) => b.answers - a.answers);
  if (ranked.length === 0) die("No interview session with answers found.");
  console.log(`Found ${ranked.length} sessions with answers. Top by Q&A count:`);
  ranked.slice(0, 6).forEach((r) => console.log(`  ${r.id}  ·  ${r.answers} answers  ·  role: ${r.data.role || "—"}`));
  return { id: ranked[0].id, ...ranked[0].data };
}

function pairs(transcript) {
  // Pair each assistant question with the immediately following user answer.
  const out = [];
  const tx = transcript || [];
  for (let i = 0; i < tx.length; i++) {
    if (tx[i].role === "assistant") {
      const ans = tx.slice(i + 1).find((t) => t.role === "user");
      if (ans && (ans.content || "").trim()) {
        out.push({ q: tx[i].content || "", a: ans.content || "" });
      }
    }
  }
  // Drop the closing "thank you" assistant lines that have no real answer.
  return out.filter((p) => !/thank you for completing/i.test(p.q));
}

async function scoreAll(qa, role) {
  const list = qa
    .map((p, i) => `[[Q${i + 1}]] ${p.q}\n[[A${i + 1}]] ${p.a}`)
    .join("\n\n");
  const prompt = `You are a strict interview evaluator scoring a candidate for the role/target: "${role || "the role"}".
For EACH question-answer pair below, score the candidate's ANSWER on four sub-dimensions, each 0-25:
- correctness (accuracy / is it right)
- depth (substance, detail, examples)
- clarity (structure, communication)
- relevance (does it actually address the question)
total = sum of the four (0-100). Also write a one-sentence rationale that QUOTES or paraphrases the answer and explains WHY it earned that score.

Be honest and evidence-based: a vague/one-line/wrong answer scores low (sub-dimensions in single digits). Do NOT be generous without evidence.

Return ONLY a JSON array, one object per pair in order:
[{"i":1,"correctness":N,"depth":N,"clarity":N,"relevance":N,"total":N,"rationale":"..."}, ...]

PAIRS:
${list}`;
  const arr = await gemini(prompt);
  return Array.isArray(arr) ? arr : [];
}

function buildPdf(session, scored, outPath) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const BRAND = "#4f46e5";
    const INK = "#18181b";
    const MUTE = "#71717a";
    const overall = scored.length ? Math.round(scored.reduce((a, s) => a + (s.total || 0), 0) / scored.length) : 0;

    // ---- Header ----
    doc.fillColor(BRAND).fontSize(22).text("TalEdge — Interview Evaluation", { continued: false });
    doc.moveDown(0.2);
    doc.fillColor(MUTE).fontSize(10).text(`Role / target: ${session.role || "—"}   ·   Mode: ${session.mode || "—"}   ·   Session: ${session.id}`);
    doc.text(`Candidate id: ${session.studentId || "—"}   ·   Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`);
    doc.moveDown(0.6);
    doc.fillColor(INK).fontSize(13).text(`Overall answer score: ${overall} / 100   (${scored.length} questions evaluated)`);
    doc.moveDown(0.5);
    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.8);

    scored.forEach((s, idx) => {
      if (doc.y > 680) doc.addPage();
      // Question
      doc.fillColor(BRAND).fontSize(12).text(`Q${idx + 1}.`, { continued: true }).fillColor(INK).text("  " + (s._q || ""));
      doc.moveDown(0.25);
      // Answer
      doc.fillColor(MUTE).fontSize(9).text("ANSWER GIVEN");
      doc.fillColor(INK).fontSize(10).text(s._a || "(no answer)", { width: 495 });
      doc.moveDown(0.35);
      // Score breakdown
      const tot = s.total ?? 0;
      doc.fillColor(MUTE).fontSize(9).text("SCORE BREAKDOWN");
      doc.fillColor(INK).fontSize(10).text(
        `Correctness ${s.correctness ?? 0}/25   ·   Depth ${s.depth ?? 0}/25   ·   Clarity ${s.clarity ?? 0}/25   ·   Relevance ${s.relevance ?? 0}/25`
      );
      doc.fillColor(tot >= 70 ? "#047857" : tot >= 45 ? "#b45309" : "#be123c").fontSize(12).text(`Question score: ${tot} / 100`);
      if (s._live != null) doc.fillColor(MUTE).fontSize(8).text(`(live adaptive rating during interview: ${s._live}/10)`);
      doc.moveDown(0.2);
      // Why
      doc.fillColor(MUTE).fontSize(9).text("WHY THIS SCORE");
      doc.fillColor(INK).fontSize(10).text(s.rationale || "—", { width: 495 });
      doc.moveDown(0.7);
      doc.strokeColor("#f1f1f4").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.7);
    });

    doc.end();
    stream.on("finish", () => resolve());
  });
}

(async () => {
  const session = await pickSession();
  const qa = pairs(session.transcript).slice(0, TOP_N);
  if (qa.length === 0) die("Session has no scorable Q&A pairs.");
  console.log(`Session ${session.id}: ${qa.length} Q&A pairs -> scoring with ${MODEL}...`);

  const scores = await scoreAll(qa, session.role);
  // Live per-turn ratings (0-10) captured during the interview, if present.
  const live = session.rubricScores || {};
  const liveByTurn = Object.entries(live)
    .filter(([k]) => k.startsWith("turn-"))
    .sort((a, b) => Number(a[0].slice(5)) - Number(b[0].slice(5)))
    .map(([, v]) => v);

  const scored = qa.map((p, i) => {
    const s = scores.find((x) => Number(x.i) === i + 1) || scores[i] || {};
    return { ...s, _q: p.q, _a: p.a, _live: liveByTurn[i] ?? null };
  });

  const outDir = "reports";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `interview-eval-${session.id}.pdf`);
  await buildPdf(session, scored, outPath);
  console.log("PDF written: " + outPath);
  process.exit(0);
})();
