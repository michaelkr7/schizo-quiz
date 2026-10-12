export const CATEGORIES = Object.freeze([
  'הזיות', 'מחשבות שווא', 'סימפטומים שליליים', 'תובנה', 'מהלך ומשך',
  'קשר לטראומה', 'שאלות מלכודת', 'התנהגות ותפקוד', 'ארגון חשיבה', 'שלילת מצבים אחרים',
]);

export function shuffle(arr, rng = Math.random) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function prepareQuestion(q, rng = Math.random) {
  return {
    id: q.id,
    category: q.category,
    question: q.question,
    explanation: q.explanation,
    answers: shuffle(q.options.map((text, i) => ({
      text,
      isCorrect: i === q.correctIndex,
    })), rng),
  };
}

export function buildDeck(questions, { categories = null, shuffleOrder = false } = {}, rng = Math.random) {
  const selected = questions.filter((q) => categories === null || categories.has(q.category));
  const ordered = shuffleOrder ? shuffle(selected, rng) : selected;
  return ordered.map((q) => prepareQuestion(q, rng));
}

export function categoryCounts(questions) {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const q of questions) {
    if (Object.hasOwn(counts, q.category)) counts[q.category]++;
  }
  return counts;
}

// answer() locks the current question; only next() advances it.
// Snapshots keep callers from accidentally changing the session's counters.
export function createSession(deck) {
  let index = 0;
  let score = 0;
  let result = null;
  const stats = Object.fromEntries(CATEGORIES.map((category) => [category, { correct: 0, total: 0 }]));
  return {
    answer(idx) {
      if (index >= deck.length) throw new Error('The session is complete');
      const q = deck[index];
      if (!Number.isInteger(idx) || idx < 0 || idx >= q.answers.length) {
        throw new RangeError('Answer index is out of range');
      }
      if (result) return { ...result };
      const correctIdx = q.answers.findIndex((a) => a.isCorrect);
      result = { correct: idx === correctIdx, correctIdx };
      const tally = (stats[q.category] ||= { correct: 0, total: 0 });
      tally.total++;
      if (result.correct) {
        score++;
        tally.correct++;
      }
      return { ...result };
    },
    next() {
      if (index < deck.length && result) {
        index++;
        result = null;
      }
      return this.state;
    },
    get state() {
      return { index, question: deck[index] ?? null, answered: result !== null, done: index >= deck.length };
    },
    get score() { return score; },
    get perCategory() {
      return Object.fromEntries(Object.entries(stats).map(([cat, tally]) => [cat, { ...tally }]));
    },
  };
}
