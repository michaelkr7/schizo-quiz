# BUILD_LOG
- Source: source.md (user message t191u). It holds only 5 questions (ids 1-5, category הזיות), extracted verbatim into questions.json. Q5's explanation is missing/garbled in the source, so it was left empty (nothing invented).
- Orchestrator: wrote SPEC_DEV.md (API contract) and questions.json.
- Claude Code: built the UI (index.html, style.css, app.js) for Hebrew RTL, mobile first.
- Codex: built the logic (quiz.js) and tests (test/quiz.test.mjs), including the answer-position distribution test (4000 runs, each position 800-1200). Reviewed app.js and found 2 bugs: lock/index after completion, and an init error path.
- Claude Code: fixed both app.js bugs and reviewed quiz.js/tests. Findings (not applied): no per-question validation, duplicated scoring, answer() throws while UI is locked, hardcoded count of 5 in a test.
- Tests: node --test test/ gives 7 pass, 0 fail.
- Screenshots: Playwright Chromium headless saved to screens/.
- Deploy: GitHub michaelkr7/schizo-quiz -> Vercel project schizo-quiz (Git-linked), SSO protection disabled.
## v2 (70 questions)
- questions.json replaced byte-for-byte with questions-full.json. Validated: 70 items, ids 1-70, 4 options each, correctIndex valid, all categories among the 10.
- Codex: quiz.js reads options ?? answers. Tests now validate the full dataset instead of the hardcoded 5. 9/9 pass.
- Claude Code: verdict line shown even with an empty explanation, ✓/✗ marks, role=status, aria-valuenow/aria-label on the progressbar, scoring taken only from session data, :focus-visible. Also reviewed the Codex diff.
