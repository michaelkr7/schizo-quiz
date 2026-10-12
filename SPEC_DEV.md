Static app (no build, no server). Files: index.html, style.css, app.js (UI, ES module), quiz.js (pure logic ES module), questions.json (DO NOT EDIT), test/quiz.test.mjs (node --test).
quiz.js exports:
- CATEGORIES: the 10 Hebrew categories in order: הזיות, מחשבות שווא, סימפטומים שליליים, תובנה, מהלך ומשך, קשר לטראומה, שאלות מלכודת, התנהגות ותפקוד, ארגון חשיבה, שלילת מצבים אחרים
- shuffle(arr, rng=Math.random) -> new array (Fisher-Yates)
- prepareQuestion(q, rng) -> {id, category, question, explanation, answers:[{text, isCorrect}] shuffled} (correct tracked by identity, not position)
- buildDeck(questions, {categories:Set|null, shuffleOrder:bool}, rng) -> prepared questions
- categoryCounts(questions) -> {cat:n} for all 10
- createSession(deck) with answer(idx)->{correct, correctIdx}, next(), state, score, perCategory stats {cat:{correct,total}}
Tests must include: correct answer position distribution over many prepareQuestion runs is roughly uniform across 0..3 (each 20-30% over 4000 runs), isCorrect exactly once, answers text set unchanged, filters, scoring.
UI: Hebrew RTL, mobile-first, clean; start screen with category filter checkboxes (empty categories disabled, label 'אין שאלות עדיין', show counts), shuffle-order toggle, start button. Question screen: progress, category tag, question, 4 answer buttons; on pick: picked green if correct, else red + correct green; buttons locked; show explanation (if non-empty); 'הבא' button. End screen: score X/Y + percent, per-category stats table, restart. Load questions.json via fetch. Title "זהה את הסכיזופרן".
