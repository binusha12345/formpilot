import { useEffect, useRef, useState } from "react";

const TYPE_NAMES = {
  0: "Short answer",
  1: "Paragraph",
  2: "Multiple choice",
  3: "Dropdown",
  4: "Checkboxes",
  5: "Linear scale",
  7: "Grid",
  9: "Date",
  10: "Time",
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

function LinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.14" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14" />
    </svg>
  );
}

function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.25h.01" />
    </svg>
  );
}

function Spinner(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Notice({ children }) {
  return (
    <div role="alert"
      className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-5">{children}</p>
    </div>
  );
}

function Panel({ children, className = "", ...rest }) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`} {...rest}>
      {children}
    </section>
  );
}

function PanelHead({ eyebrow, title, meta }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-600">{eyebrow}</p>
        <h2 className="mt-1 text-[15px] font-semibold leading-6 tracking-[-0.01em] break-words">{title}</h2>
      </div>
      {meta && <div className="flex shrink-0 flex-wrap items-center gap-2">{meta}</div>}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-600",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-green-200 bg-green-50 text-green-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white " +
  "transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const ghostBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold " +
  "text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const field =
  "mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[15px] text-neutral-900 " +
  "placeholder:text-neutral-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400";

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
  const requiredCount = form?.questions.filter((q) => q.required).length || 0;

  const status =
    job?.status === "running"
      ? { label: "Running", tone: "info", dot: true }
      : job?.status === "finished"
        ? { label: "Finished", tone: "success" }
        : { label: "Stopped", tone: "neutral" };

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-blue-100 bg-white/85 backdrop-blur">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-green-500 to-blue-600" />
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-green-500 text-[13px] font-semibold text-white">
            F
          </span>
          <span className="text-sm font-semibold tracking-[-0.01em]">Form Filler</span>
          <span className="ml-auto text-xs font-medium text-blue-600">Google Forms</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:pt-16">
        <div className="max-w-2xl">
          <h1 className="text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.4rem]">
            Generate test responses for your Google Form
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-neutral-500">
            Paste your form link, choose how many responses you need, and each one is filled with
            different random answers. Use it on forms you own, for testing.
          </p>
        </div>

        <form onSubmit={loadForm}
          className="mt-8 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-600/10 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-2.5">
            <LinkIcon className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/…/viewform"
              aria-label="Google Form link"
              className="h-10 w-full min-w-0 border-0 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
            />
          </div>
          <button type="submit" className={primaryBtn} disabled={loading || running}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Reading…" : "Read form"}
          </button>
        </form>

        {error && <Notice>{error}</Notice>}

        {form && (
          <Panel className="mt-6">
            <PanelHead
              eyebrow="Detected form"
              title={form.title}
              meta={
                <>
                  <Badge>{form.questions.length} questions</Badge>
                  {requiredCount > 0 && <Badge>{requiredCount} required</Badge>}
                  {form.maxUnique && (
                    <Badge tone="info">{form.maxUnique.toLocaleString()} unique combos</Badge>
                  )}
                </>
              }
            />

            <ul className="divide-y divide-neutral-200">
              {form.questions.map((q, i) => (
                <li key={i}
                  className={`flex items-center gap-4 px-5 py-3 sm:px-6 ${q.supported ? "" : "bg-neutral-50"}`}>
                  <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-neutral-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`min-w-0 flex-1 text-sm leading-5 ${q.supported ? "text-neutral-800" : "text-neutral-400"}`}>
                    {q.title}
                    {q.required && (
                      <span className="ml-1 font-medium text-red-500" title="Required" aria-label="required">*</span>
                    )}
                  </span>
                  <span className="shrink-0">
                    <Badge tone={q.supported ? "neutral" : "warning"}>
                      {q.supported ? TYPE_NAMES[q.type] || "Other" : "Not supported"}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>

            {unsupported.some((q) => q.required) && (
              <div className="border-t border-neutral-200 px-5 py-4 sm:px-6">
                <Notice>
                  A required question isn't supported (e.g. file upload), so Google will likely reject
                  every submission.
                </Notice>
              </div>
            )}

            <div className="grid gap-5 border-t border-neutral-200 px-5 py-5 sm:grid-cols-2 sm:px-6">
              <div className="block">
                <label htmlFor="count" className="text-[13px] font-medium text-neutral-700">
                  Number of submissions
                </label>
                <input id="count" type="number" min="1" max="1000" value={count}
                  onChange={(e) => setCount(e.target.value)} disabled={running}
                  aria-describedby={form.maxUnique ? "count-hint" : undefined}
                  className={field} />
                {form.maxUnique && (
                  <span id="count-hint" className="mt-1.5 block text-xs text-neutral-500">
                    This form has {form.maxUnique.toLocaleString()} possible unique combinations.
                  </span>
                )}
              </div>

              <div className="block">
                <label htmlFor="delay" className="text-[13px] font-medium text-neutral-700">
                  Delay between submissions (ms)
                </label>
                <input id="delay" type="number" min="0" max="5000" step="100" value={delayMs}
                  onChange={(e) => setDelayMs(e.target.value)} disabled={running}
                  aria-describedby="delay-hint" className={field} />
                <span id="delay-hint" className="mt-1.5 block text-xs text-neutral-500">
                  Higher values look more human.
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 sm:col-span-2">
                <p className="text-xs text-neutral-500">
                  Answers are generated randomly and checked for duplicates.
                </p>
                {running
                  ? <button type="button" className={ghostBtn} onClick={cancel}>Stop</button>
                  : <button type="button" className={primaryBtn} onClick={start}>
                      Submit {count || 0} responses
                    </button>}
              </div>
            </div>
          </Panel>
        )}

        {job && (
          <Panel className="mt-6" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-600">Progress</p>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.01em]">
                  {job.done} of {job.total} submitted
                </p>
              </div>
              <Badge tone={status.tone}>
                {status.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />}
                {status.label}
              </Badge>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-green-500 transition-[width] duration-300"
                  style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-5 grid grid-cols-3 divide-x divide-blue-100 rounded-lg border border-blue-100 bg-blue-50/60">
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-neutral-500">Submitted</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em]">{job.done}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-neutral-500">Total</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em]">{job.total}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-neutral-500">Failed</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] ${job.failed > 0 ? "text-red-600" : ""}`}>
                    {job.failed}
                  </p>
                </div>
              </div>

              {job.note && <p className="mt-4 text-sm text-neutral-500">{job.note}</p>}

              {job.errors.map((m, i) => (
                <div key={i} className="mt-4"><Notice>{m}</Notice></div>
              ))}

              {job.status === "finished" && job.done > 0 && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                    strokeLinecap="round"                    strokeLinejoin="round" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-green-600">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <p className="leading-5">
                    Open your form's Responses tab. It can take a few seconds to refresh and should show{" "}
                    {job.done} new responses.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
          No data is stored — submissions are sent directly to Google. Use only on forms you own.
        </footer>
      </main>
    </div>
  );
}
