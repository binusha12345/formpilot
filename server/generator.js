// Generates random answers and guarantees every submission is unique.
import { T } from "./formParser.js";

const FIRST = ["Aarav","Liam","Noah","Emma","Olivia","Sofia","Kavindu","Nimali","Ishara","Tharindu","Amal","Sara","Omar","Lina","Ken","Yuki","Mateo","Zara","Ravi","Maya","Ethan","Ava","Chen","Priya","Hugo"];
const LAST = ["Perera","Silva","Fernando","Jayasinghe","Smith","Khan","Patel","Garcia","Tanaka","Nguyen","Brown","Lopez","Ali","Kumar","Muller","Rossi","Lee","Wong"];
const DOMAINS = ["gmail.com","outlook.com","yahoo.com","proton.me"];
const WORDS = ["good","really","helpful","clear","service","quality","time","great","simple","team","product","experience","easy","support","useful","nice","fast","improve","overall","design","works","friendly","update","value","comfortable"];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join("");

function sentence(minWords = 4, maxWords = 10) {
  const n = int(minWords, maxWords);
  const s = Array.from({ length: n }, () => pick(WORDS)).join(" ");
  return s[0].toUpperCase() + s.slice(1) + ".";
}

function textFor(title, paragraph) {
  const t = title.toLowerCase();
  if (/e-?mail/.test(t)) return `${pick(FIRST)}.${pick(LAST)}${int(10, 99999)}@${pick(DOMAINS)}`.toLowerCase();
  if (/phone|mobile|contact number|whatsapp/.test(t)) return `07${pick([0, 1, 2, 5, 6, 7, 8])}${digits(7)}`;
  if (/first name/.test(t)) return pick(FIRST);
  if (/last name|surname/.test(t)) return pick(LAST);
  if (/name/.test(t)) return `${pick(FIRST)} ${pick(LAST)}`;
  if (/\bage\b/.test(t)) return String(int(18, 60));
  if (/\b(id|index|number|no\.?)\b/.test(t)) return digits(8);
  if (/city|town|location|address/.test(t)) return `${int(1, 300)} ${pick(WORDS)} road`;
  return paragraph ? `${sentence()} ${sentence()}` : sentence(2, 5);
}

function subset(options) {
  const chosen = options.filter(() => Math.random() < 0.5);
  return chosen.length ? chosen : [pick(options)];
}

// Returns [fieldName, value] pairs for one question
function answer(q) {
  const pairs = [];
  const id = q.entries[0].id;

  switch (q.type) {
    case T.SHORT:
    case T.PARAGRAPH:
      pairs.push([`entry.${id}`, textFor(q.title, q.type === T.PARAGRAPH)]);
      break;
    case T.CHOICE:
    case T.DROPDOWN:
    case T.SCALE:
      pairs.push([`entry.${id}`, pick(q.options)]);
      break;
    case T.CHECKBOX:
      for (const o of subset(q.options)) pairs.push([`entry.${id}`, o]);
      break;
    case T.GRID:
      for (const e of q.entries) pairs.push([`entry.${e.id}`, pick(q.options)]);
      break;
    case T.DATE:
      pairs.push([`entry.${id}_year`, String(int(2020, 2026))]);
      pairs.push([`entry.${id}_month`, String(int(1, 12))]);
      pairs.push([`entry.${id}_day`, String(int(1, 28))]);
      break;
    case T.TIME:
      pairs.push([`entry.${id}_hour`, String(int(0, 23))]);
      pairs.push([`entry.${id}_minute`, String(int(0, 59))]);
      break;
  }
  return pairs;
}

// How many distinct submissions are mathematically possible?
export function maxUnique(questions) {
  let total = 1;
  for (const q of questions.filter((x) => x.supported)) {
    const n = q.options.length;
    let c = Infinity; // text, date, time: effectively unlimited
    if ([T.CHOICE, T.DROPDOWN, T.SCALE].includes(q.type)) c = n;
    else if (q.type === T.CHECKBOX) c = 2 ** n - 1;
    else if (q.type === T.GRID) c = n ** q.entries.length;
    total *= c;
    if (total === Infinity) return Infinity;
  }
  return total;
}

// One unique set of answers, or null if no new combination can be found.
export function makeUniqueSubmission(questions, seen) {
  const supported = questions.filter((q) => q.supported);
  for (let attempt = 0; attempt < 300; attempt++) {
    const pairs = supported.flatMap(answer);
    const key = JSON.stringify(pairs);
    if (!seen.has(key)) {
      seen.add(key);
      return pairs;
    }
  }
  return null;
}
