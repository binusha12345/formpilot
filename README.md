# Form Filler (MERN without the M)

Express + React + Node. No database — job progress lives in server memory.

## Run
    npm run install-all
    npm run dev

Open http://localhost:5173, paste a Google Form link, pick a count, click Submit.

## How it works
1. `POST /api/parse` downloads the form page and reads `FB_PUBLIC_LOAD_DATA_` to get each question's `entry.<id>` and options.
2. `POST /api/submit` starts an in-memory job. For every submission it builds random answers, checks a `Set` so no two are identical, and POSTs them to the form's `/formResponse` endpoint.
3. The UI polls `GET /api/jobs/:id` for progress.

## Limits
- Form must be public (no sign-in required, not "1 response per person").
- File upload questions aren't supported.
- If a form only has choice questions, the number of unique combinations is finite; the run is capped to that number.
- Max 1000 per run. Use only on forms you own, e.g. for testing or dummy data.
