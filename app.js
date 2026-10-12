import { CATEGORIES, buildDeck, categoryCounts, createSession } from './quiz.js';

const $ = (id) => document.getElementById(id);
const screens = { start: $('screen-start'), question: $('screen-question'), end: $('screen-end') };

let questions = [];
let counts = {};
let session = null;
let deck = [];
let idx = 0;
let locked = false;

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  window.scrollTo(0, 0);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function renderStart() {
  const list = $('cat-list');
  list.replaceChildren();
  for (const cat of CATEGORIES) {
    const n = counts[cat] || 0;
    const label = el('label', 'cat' + (n ? '' : ' disabled'));
    const cb = el('input');
    cb.type = 'checkbox';
    cb.value = cat;
    cb.checked = n > 0;
    cb.disabled = n === 0;
    label.append(cb, el('span', 'name', cat), el('span', 'count', n ? `${n} שאלות` : 'אין שאלות עדיין'));
    list.append(label);
  }
  show('start');
}

const enabledBoxes = () => [...$('cat-list').querySelectorAll('input:not(:disabled)')];

function startQuiz() {
  const chosen = new Set(enabledBoxes().filter((c) => c.checked).map((c) => c.value));
  if (!chosen.size) {
    $('start-msg').textContent = 'יש לבחור לפחות קטגוריה אחת';
    return;
  }
  $('start-msg').textContent = '';
  deck = buildDeck(questions, { categories: chosen, shuffleOrder: $('shuffle-order').checked });
  if (!deck.length) {
    $('start-msg').textContent = 'אין שאלות בקטגוריות שנבחרו';
    return;
  }
  session = createSession(deck);
  idx = 0;
  renderQuestion();
}

function setProgress(done) {
  const pct = Math.round((done / deck.length) * 100);
  $('bar-fill').style.width = `${pct}%`;
  const bar = $('bar-fill').parentElement;
  bar.setAttribute('aria-valuenow', pct);
  bar.setAttribute('aria-label', `שאלה ${idx + 1} מתוך ${deck.length}`);
}

function renderQuestion() {
  const q = deck[idx];
  locked = false;
  $('progress-text').textContent = `שאלה ${idx + 1} מתוך ${deck.length}`;
  $('category-tag').textContent = q.category;
  setProgress(idx);
  $('question-text').textContent = q.question;
  $('explanation').hidden = true;
  $('next-btn').hidden = true;
  $('next-btn').textContent = idx === deck.length - 1 ? 'לסיכום' : 'הבא';
  const box = $('answers');
  box.replaceChildren();
  q.answers.forEach((a, i) => {
    const b = el('button', 'answer', a.text);
    b.type = 'button';
    b.addEventListener('click', () => pick(i));
    box.append(b);
  });
  show('question');
}

function pick(i) {
  if (locked) return;
  locked = true;
  const q = deck[idx];
  const res = session.answer(i);
  const correctIdx = res && Number.isInteger(res.correctIdx) ? res.correctIdx : q.answers.findIndex((a) => a.isCorrect);
  const correct = res ? !!res.correct : i === correctIdx;
  [...$('answers').children].forEach((b, j) => {
    b.disabled = true;
    if (j === correctIdx) b.classList.add('correct');
    else if (j === i) b.classList.add('wrong');
    else b.classList.add('dim');
  });
  const ex = $('explanation');
  ex.replaceChildren(el('strong', '', correct ? 'נכון! 🎉' : 'לא מדויק'));
  if (q.explanation && q.explanation.trim()) ex.append(el('span', '', q.explanation));
  ex.hidden = false;
  setProgress(idx + 1);
  $('next-btn').hidden = false;
  $('next-btn').focus({ preventScroll: true });
}

function next() {
  if (!locked) return;
  locked = false;
  if (typeof session.next === 'function') session.next();
  idx++;
  if (idx >= deck.length) renderEnd();
  else renderQuestion();
}

function renderEnd() {
  const total = deck.length;
  const totalCorrect = session.score;
  const perCategory = session.perCategory;
  const pct = Math.round((totalCorrect / total) * 100);
  $('score-pct').textContent = `${pct}%`;
  $('score-ring').style.setProperty('--p', pct);
  $('score-text').textContent = `${totalCorrect} מתוך ${total} תשובות נכונות`;
  const body = $('stats-body');
  body.replaceChildren();
  for (const cat of CATEGORIES) {
    const s = perCategory[cat];
    if (!s || !s.total) continue;
    const tr = el('tr');
    tr.append(el('td', '', cat), el('td', '', `${s.correct}/${s.total}`), el('td', '', `${Math.round((s.correct / s.total) * 100)}%`));
    body.append(tr);
  }
  show('end');
}

$('start-btn').addEventListener('click', startQuiz);
$('next-btn').addEventListener('click', next);
$('restart-btn').addEventListener('click', renderStart);
$('cat-all').addEventListener('click', () => enabledBoxes().forEach((c) => (c.checked = true)));
$('cat-none').addEventListener('click', () => enabledBoxes().forEach((c) => (c.checked = false)));

(async function init() {
  try {
    const r = await fetch('questions.json');
    if (!r.ok) throw new Error(r.status);
    questions = await r.json();
    if (!Array.isArray(questions)) throw new Error('questions.json must be an array');
    counts = categoryCounts(questions);
    renderStart();
  } catch (e) {
    show('start');
    $('start-msg').textContent = 'טעינת השאלות נכשלה. יש להפעיל דרך שרת (לא file://).';
    $('start-btn').disabled = true;
  }
})();
