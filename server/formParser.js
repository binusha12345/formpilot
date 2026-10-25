// Reads a public Google Form and extracts its questions.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Google's internal question type codes
const T = {
  SHORT: 0, PARAGRAPH: 1, CHOICE: 2, DROPDOWN: 3, CHECKBOX: 4,
  SCALE: 5, GRID: 7, SECTION: 8, DATE: 9, TIME: 10,
};
const SUPPORTED = new Set([0, 1, 2, 3, 4, 5, 7, 9, 10]);
const SKIP = new Set([6, 8, 11, 12]); // title/desc, section break, image, video

export async function loadForm(inputUrl) {
  const res = await fetch(inputUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
  const finalUrl = res.url;

  if (finalUrl.includes("accounts.google.com")) {
    throw new Error("This form requires sign-in. Set it to accept responses from anyone and try again.");
  }
  if (!finalUrl.includes("docs.google.com/forms")) {
    throw new Error("That doesn't look like a Google Forms link.");
  }

  const html = await res.text();
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (!match) throw new Error("Couldn't read the form. Make sure it is published and public.");

  const data = JSON.parse(match[1]);
  const title = data[1]?.[8] || data[3] || "Untitled form";
  const items = data[1]?.[1] || [];

  const questions = [];
  let sections = 0;

  for (const item of items) {
    const type = item[3];
    if (type === T.SECTION) { sections++; continue; }
    if (SKIP.has(type)) continue;

    const q = {
      title: item[1] || "(untitled)",
      type,
      supported: SUPPORTED.has(type),
      required: false,
      options: [],
      entries: [], // grids have one entry per row
    };

    for (const p of item[4] || []) {
      q.entries.push({ id: p[0], label: p[3]?.[0] });
      q.required = q.required || p[2] === 1;
      if (!q.options.length && Array.isArray(p[1])) {
        q.options = p[1].map((o) => o[0]).filter((o) => o !== "" && o != null);
      }
    }
    if (!q.entries.length) q.supported = false;
    questions.push(q);
  }

  const action = finalUrl.replace(/\/(viewform|edit|prefill)([?#].*)?$/, "/formResponse");
  return { title, action, sections, questions };
}

export { UA, T };
