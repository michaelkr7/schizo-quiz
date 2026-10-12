import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// The static browser app has no package.json declaring .js files as modules.
const source = await readFile(new URL('../quiz.js', import.meta.url), 'utf8');
const { CATEGORIES, shuffle, prepareQuestion, buildDeck, categoryCounts, createSession } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const questions = JSON.parse(await readFile(new URL('../questions.json', import.meta.url), 'utf8'));
const fixture = {
  id: 'sample', category: CATEGORIES[0], question: 'Question?', explanation: 'Because.',
  options: ['A', 'B', 'C', 'D'], correctIndex: 1,
};

function seededRng(seed = 123456789) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test('categories match the specification, including empty categories', () => {
  assert.deepEqual(CATEGORIES, [
    'הזיות', 'מחשבות שווא', 'סימפטומים שליליים', 'תובנה', 'מהלך ומשך',
    'קשר לטראומה', 'שאלות מלכודת', 'התנהגות ותפקוד', 'ארגון חשיבה', 'שלילת מצבים אחרים',
  ]);
  assert.deepEqual(categoryCounts([]), Object.fromEntries(CATEGORIES.map((cat) => [cat, 0])));
  const counts = categoryCounts(questions);
  const expectedCounts = Object.fromEntries(CATEGORIES.map((cat) =>
    [cat, questions.filter((q) => q.category === cat).length]));
  assert.deepEqual(counts, expectedCounts);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 70);
});

test('question bank has 70 unique sequential ids and valid options and categories', () => {
  assert.equal(questions.length, 70);
  assert.equal(new Set(questions.map((q) => q.id)).size, 70);
  assert.deepEqual(questions.map((q) => q.id).sort((a, b) => a - b),
    Array.from({ length: 70 }, (_, i) => i + 1));
  for (const q of questions) {
    assert.ok(Array.isArray(q.options), `Question ${q.id} options`);
    assert.equal(q.options.length, 4, `Question ${q.id} option count`);
    assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4,
      `Question ${q.id} correctIndex`);
    assert.ok(CATEGORIES.includes(q.category), `Question ${q.id} category`);
  }
});

test('prepareQuestion reads options only', () => {
  const q = prepareQuestion({ ...fixture, options: ['W', 'X', 'Y', 'Z'] }, () => 0);
  assert.equal(q.answers.find((a) => a.isCorrect).text, 'X');
  assert.deepEqual(q.answers.map((a) => a.text).sort(), ['W', 'X', 'Y', 'Z']);
  const { options, ...noOptions } = fixture;
  assert.throws(() => prepareQuestion({ ...noOptions, answers: ['A', 'B', 'C', 'D'] }, () => 0));
});

test('shuffle copies the input and uses Fisher-Yates swaps', () => {
  const original = [1, 2, 3, 4];
  assert.deepEqual(shuffle(original, () => 0), [2, 3, 4, 1]);
  assert.deepEqual(original, [1, 2, 3, 4]);
  assert.notEqual(shuffle(original), original);
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle([1]), [1]);
});

test('prepared answer positions are uniform over 4000 runs and preserve answers', () => {
  const rng = seededRng();
  const positions = [0, 0, 0, 0];
  const before = structuredClone(fixture);
  for (let run = 0; run < 4000; run++) {
    const q = prepareQuestion(fixture, rng);
    assert.equal(q.answers.filter((a) => a.isCorrect).length, 1);
    assert.deepEqual(q.answers.map((a) => a.text).sort(), [...fixture.answers].sort());
    const idx = q.answers.findIndex((a) => a.isCorrect);
    assert.equal(q.answers[idx].text, fixture.answers[fixture.correctIndex]);
    positions[idx]++;
    assert.deepEqual([q.id, q.category, q.question, q.explanation],
      [fixture.id, fixture.category, fixture.question, fixture.explanation]);
  }
  for (const count of positions) assert.ok(count >= 800 && count <= 1200, `${positions}`);
  assert.deepEqual(fixture, before);
});

test('correctness follows the source answer identity even with duplicate text', () => {
  const q = prepareQuestion({ ...fixture, options: ['same', 'same', 'same', 'same'] }, () => 0);
  assert.equal(q.answers.filter((a) => a.isCorrect).length, 1);
  assert.equal(q.answers[0].isCorrect, true);
});

test('deck filters categories and optionally shuffles question order without mutation', () => {
  const input = [fixture, { ...fixture, id: 'other', category: CATEGORIES[1] }];
  const before = structuredClone(input);
  assert.deepEqual(buildDeck(input).map((q) => q.id), ['sample', 'other']);
  assert.deepEqual(buildDeck(input, { categories: null }).map((q) => q.id), ['sample', 'other']);
  assert.deepEqual(buildDeck(input, { categories: new Set([CATEGORIES[1]]) }).map((q) => q.id), ['other']);
  assert.deepEqual(buildDeck(input, { categories: new Set() }), []);
  assert.deepEqual(buildDeck(input, { shuffleOrder: true }, () => 0).map((q) => q.id), ['other', 'sample']);
  assert.deepEqual(input, before);
});

test('session follows app.js answer/next flow with shuffled correct indices and scoring', () => {
  const deck = buildDeck([fixture, { ...fixture, id: 'other', category: CATEGORIES[1] }], {}, () => 0);
  const session = createSession(deck);
  assert.deepEqual(session.state, { index: 0, question: deck[0], answered: false, done: false });
  session.next();
  assert.equal(session.state.index, 0);
  assert.deepEqual(session.answer(0), { correct: true, correctIdx: 0 });
  assert.equal(session.state.index, 0);
  assert.equal(session.state.answered, true);
  assert.deepEqual(session.answer(1), { correct: true, correctIdx: 0 });
  assert.equal(session.score, 1);
  assert.deepEqual(session.perCategory[CATEGORIES[0]], { correct: 1, total: 1 });
  session.next();
  assert.equal(session.state.index, 1);
  assert.deepEqual(session.answer(2), { correct: false, correctIdx: 0 });
  session.next();
  assert.deepEqual(session.state, { index: 2, question: null, answered: false, done: true });
  assert.equal(session.score, 1);
  assert.deepEqual(session.perCategory[CATEGORIES[1]], { correct: 0, total: 1 });
  assert.deepEqual(session.perCategory[CATEGORIES[2]], { correct: 0, total: 0 });
  session.next();
  assert.equal(session.state.index, 2);
  assert.throws(() => session.answer(0), /complete/);
  const snapshot = session.perCategory;
  snapshot[CATEGORIES[0]].correct = 99;
  assert.equal(session.perCategory[CATEGORIES[0]].correct, 1);
});

test('invalid answers do not score or lock a question; empty sessions are complete', () => {
  const session = createSession(buildDeck([fixture]));
  for (const idx of [-1, 4, 0.5, NaN, '1', undefined]) {
    assert.throws(() => session.answer(idx), RangeError);
  }
  assert.equal(session.score, 0);
  assert.equal(session.state.answered, false);
  assert.equal(session.perCategory[CATEGORIES[0]].total, 0);
  const empty = createSession([]);
  assert.equal(empty.state.done, true);
  assert.equal(empty.state.question, null);
  assert.equal(empty.score, 0);
  empty.next();
  assert.equal(empty.state.index, 0);
  assert.throws(() => empty.answer(0), /complete/);
});
