# Design QA — MAKI Timesheet / «Мои часы»

- Source visual truth: `C:\Users\makit\.codex\generated_images\01a0af72-070d-7c51-a434-25f09b22c3c4\exec-a9f859cd-fca6-4cba-bf8a-74b6a20dd1ac.png` (selected option 3: monthly ledger)
- Implementation screenshot: unavailable
- Target viewports: 1440 × 1024 desktop; 390 × 844 mobile
- Target state: «Мои часы», September 2026, inline edit on a selected day

## Findings

- [P1] Browser-rendered implementation comparison is unavailable.
  - Evidence: the checkout has no `node_modules`; authenticated browser capture is not available in this task.
  - Impact: typography, actual responsive layout, and visual fidelity cannot be verified against the selected reference.
  - Fix: install workspace dependencies, run the app, and capture the Timesheet screen at 1440 × 1024 after deployment or in a selected browser session.

## Required fidelity surfaces

- Fonts and typography: blocked pending rendered capture.
- Spacing and layout rhythm: blocked pending rendered capture.
- Colors and visual tokens: implemented with the existing MAKI theme tokens; visual verification blocked.
- Image quality and assets: existing MAKI team logo retained; no new raster assets required in the implementation.
- Copy and content: Russian labels implemented; visual verification blocked.

## Implementation checklist

- [x] Present every date of the selected month in a full-width ledger with distinct date, hours, workplace, and note columns.
- [x] Open inline editing by clicking a date, including dates with no entry.
- [x] Offer default workplaces as icon-backed quick choices and preserve a free-text option.
- [x] Open a separate modal from «Добавить часы» with arbitrary date and hours.
- [x] Add a one-click «Сегодня» control that scrolls to the current date without changing the selected month by hand.
- [x] Replace ambiguous date strings with a day-of-week, day-number, and month mark.
- [x] Use non-overlapping mobile cards, a text-labelled «Сегодня» shortcut, and a taller fixed mobile add-hours action.
- [x] Split the desktop ledger into two visible halves and add a remembered mobile half-month selector per user and month.
- [x] Frame each desktop half as a separate table card with contained headings, row dividers, and a distinct add-hours action.
- [x] Use responsive ledger columns for a narrow screen.
- [ ] Capture and compare the deployed page to the selected reference.

final result: blocked
