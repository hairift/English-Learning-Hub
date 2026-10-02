# Homepage Just. Say It Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved homepage left mission card and right gamified streak card direction.

**Architecture:** Keep the existing `App.tsx` homepage structure and update only the home mission/growth card markup and related CSS. Add a server-rendered React test that verifies the approved copy and seven-day check-in row render.

**Tech Stack:** React, TypeScript, Vite, Vitest, existing CSS.

---

## File Structure

- Modify `src/App.tsx`: replace the current home mission card copy with `Just. say it.`, `Say it`, and the teacher support copy; replace the growth-card rows with a gamified weekly progress block.
- Modify `src/styles.css`: add the mission-card headline, green-dot emphasis, soft target panel, weekly progress cells, reward box, and compact metric styles.
- Add `tests/homepageCopy.test.tsx`: render `App` to static HTML and verify the approved homepage text appears.

## Task 1: Add Homepage Copy Test

- [ ] Create `tests/homepageCopy.test.tsx`.
- [ ] Verify it fails before implementation.
- [ ] Expected assertions:
  - `YOUR TEACHER IS LISTENING`
  - `Just.` and `say it.`
  - `不用先想完美答案。你先开口，我先听完，再帮你改。`
  - `Say it`
  - `今天再来一次，本周进度就从 3/7 变成 4/7。`

## Task 2: Update Homepage Markup

- [ ] Update `src/App.tsx` left home card with the selected teacher copy and CTA.
- [ ] Update `src/App.tsx` right home card with the gamified seven-day progress row and reward copy.
- [ ] Preserve existing click handlers:
  - `Say it` calls `enterPracticeRoom`
  - `换个话题` goes to prep
  - `看反馈` only appears when `report` exists

## Task 3: Update Homepage Styles

- [ ] Update `src/styles.css` for:
  - `Just. say it.` display headline
  - green period emphasis
  - soft target panel
  - low-pressure copy
  - seven-day check-in cells
  - reward box and compact metrics
- [ ] Keep desktop three-column layout and existing responsive fallback.

## Task 4: Verify

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Open `http://127.0.0.1:5173/` and capture a homepage screenshot.
- [ ] Confirm no text overlap in the desktop viewport.
