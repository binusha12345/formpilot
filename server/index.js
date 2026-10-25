import express from "express";
import cors from "cors";
import crypto from "crypto";
import { loadForm, UA } from "./formParser.js";
import { makeUniqueSubmission, maxUnique } from "./generator.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MAX_PER_JOB = 1000;
const jobs = new Map(); // in-memory only — no database

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) Read the form and return its questions
app.post("/api/parse", async (req, res) => {
  try {
    const form = await loadForm(String(req.body.url || "").trim());
    const max = maxUnique(form.questions);
    res.json({ ...form, maxUnique: max === Infinity ? null : max });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 2) Start a submission job
app.post("/api/submit", async (req, res) => {
  try {
    const url = String(req.body.url || "").trim();
    const count = Math.floor(Number(req.body.count));
    const delayMs = Math.max(0, Math.min(5000, Number(req.body.delayMs ?? 400)));

    if (!count || count < 1) throw new Error("Enter a submission count of at least 1.");
    if (count > MAX_PER_JOB) throw new Error(`Max ${MAX_PER_JOB} submissions per run.`);

    const form = await loadForm(url);
    if (!form.questions.some((q) => q.supported)) throw new Error("No supported questions found in this form.");

    const target = Math.min(count, maxUnique(form.questions));
    const id = crypto.randomUUID();
    const job = {
      id, total: target, requested: count, done: 0, failed: 0,
      status: "running", cancelled: false, errors: [],
      note: target < count ? `Only ${target} unique combinations exist, so the run was capped.` : null,
    };
    jobs.set(id, job);
    runJob(job, form, delayMs);
    res.json({ jobId: id, total: target, note: job.note });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.post("/api/jobs/:id/cancel", (req, res) => {
  const job = jobs.get(req.params.id);
  if (job) job.cancelled = true;
  res.json({ ok: true });
});

async function runJob(job, form, delayMs) {
  const seen = new Set();
  const pageHistory = form.sections
    ? Array.from({ length: form.sections + 1 }, (_, i) => i).join(",")
    : null;

  for (let i = 0; i < job.total; i++) {
    if (job.cancelled) break;

    const pairs = makeUniqueSubmission(form.questions, seen);
    if (!pairs) { job.errors.push("Ran out of unique answer combinations."); break; }

    const body = new URLSearchParams();
    pairs.forEach(([k, v]) => body.append(k, v));
    if (pageHistory) body.append("pageHistory", pageHistory);

    try {
      const r = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body,
        redirect: "manual",
      });
      if (r.status === 200 || (r.status >= 300 && r.status < 400)) job.done++;
      else {
        job.failed++;
        if (job.errors.length < 5) job.errors.push(`Google returned HTTP ${r.status}. A required question may be unsupported.`);
      }
    } catch (e) {
      job.failed++;
      if (job.errors.length < 5) job.errors.push(e.message);
    }
    if (delayMs) await sleep(delayMs);
  }

  job.status = job.cancelled ? "cancelled" : "finished";
  setTimeout(() => jobs.delete(job.id), 30 * 60 * 1000);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
