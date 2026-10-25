import { useEffect, useRef, useState } from "react";

const TYPE_NAMES = {
  0: "Short answer", 1: "Paragraph", 2: "Multiple choice", 3: "Dropdown",
  4: "Checkboxes", 5: "Linear scale", 7: "Grid", 9: "Date", 10: "Time",
};

async function api(path, body) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [form, setForm] = useState(null);
  const [count, setCount] = useState(10);
  const [delayMs, setDelayMs] = useState(400);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const running = job?.status === "running";

  async function loadForm(e) {
    e.preventDefault();
    setError(""); setForm(null); setJob(null); setLoading(true);
    try {
      setForm(await api("/parse", { url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    setError(""); setJob(null);
    try {
      const { jobId, total, note } = await api("/submit", { url, count: Number(count), delayMs: Number(delayMs) });
      setJob({ id: jobId, total, done: 0, failed: 0, status: "running", note, errors: [] });
      timer.current = setInterval(async () => {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) return clearInterval(timer.current);
        const j = await res.json();
        setJob(j);
        if (j.status !== "running") clearInterval(timer.current);
      }, 600);
    } catch (err) {
      setError(err.message);
    }
  }

  const cancel = () => api(`/jobs/${job.id}/cancel`);
  const pct = job ? Math.round(((job.done + job.failed) / job.total) * 100) : 0;
  const unsupported = form?.questions.filter((q) => !q.supported) || [];

  return (
    <main className="page">
      <header className="head">
        <h1>Form Filler</h1>
        <p>Paste your Google Form link, choose how many responses you need, and each one is filled with different random answers. Use it on forms you own, for testing.</p>
      </header>

      <form className="row" onSubmit={loadForm}>
        <input
          type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/forms/d/e/…/viewform"
          aria-label="Google Form link"
        />
        <button className="btn" disabled={loading || running}>{loading ? "Reading…" : "Read form"}</button>
      </form>

      {error && <p className="alert" role="alert">{error}</p>}

      {form && (
        <section className="panel">
          <h2>{form.title}</h2>
          <ul className="qs">
            {form.questions.map((q, i) => (
              <li key={i} className={q.supported ? "" : "off"}>
                <span>{q.title}{q.required && <b className="req" title="Required"> *</b>}</span>
                <em>{q.supported ? TYPE_NAMES[q.type] : "Not supported"}</em>
              </li>
            ))}
          </ul>
          {unsupported.some((q) => q.required) && (
            <p className="alert">A required question isn't supported (e.g. file upload), so Google will likely reject every submission.</p>
          )}

          <div className="controls">
            <label>
              Number of submissions
              <input type="number" min="1" max="1000" value={count} onChange={(e) => setCount(e.target.value)} disabled={running} />
              {form.maxUnique && <small>This form has {form.maxUnique.toLocaleString()} possible unique combinations.</small>}
            </label>
            <label>
              Delay between submissions (ms)
              <input type="number" min="0" max="5000" step="100" value={delayMs} onChange={(e) => setDelayMs(e.target.value)} disabled={running} />
            </label>
            {running
              ? <button className="btn ghost" onClick={cancel}>Stop</button>
              : <button className="btn" onClick={start}>Submit {count || 0} responses</button>}
          </div>
        </section>
      )}

      {job && (
        <section className="panel" aria-live="polite">
          <div className="bar"><div style={{ width: `${pct}%` }} /></div>
          <p className="stat">
            <strong>{job.done}</strong> of {job.total} submitted
            {job.failed > 0 && <span className="bad"> · {job.failed} failed</span>}
            {job.status === "finished" && " · finished"}
            {job.status === "cancelled" && " · stopped"}
          </p>
          {job.note && <p className="hint">{job.note}</p>}
          {job.errors.map((m, i) => <p key={i} className="alert">{m}</p>)}
          {job.status === "finished" && job.done > 0 && (
            <p className="hint">Open your form's Responses tab. It can take a few seconds to refresh and should show {job.done} new responses.</p>
          )}
        </section>
      )}
    </main>
  );
}
