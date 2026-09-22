# Design QA — MAKI Timesheet

- Source visual truth: `C:\Users\makit\.codex\state\plugins\product-design\assets\maki-timesheet-calendar-team-reference.png`
- Implementation screenshot: unavailable
- Target viewport: 1440 × 1024 desktop web app
- Target state: administrator, September 2026, all employees calendar view

## Findings

- [P1] Browser-rendered implementation comparison is unavailable.
  - Evidence: the checkout has no `node_modules`, and no user-selected browser session is available for capture.
  - Impact: typography, actual responsive layout, and visual fidelity cannot be verified against the selected reference.
  - Fix: install workspace dependencies, run the app, and capture the Timesheet screen at 1440 × 1024 after deployment or in a selected browser session.

## Required fidelity surfaces

- Fonts and typography: blocked pending rendered capture.
- Spacing and layout rhythm: blocked pending rendered capture.
- Colors and visual tokens: implemented with the existing MAKI theme tokens; visual verification blocked.
- Image quality and assets: existing MAKI team logo retained; no new raster assets required in the implementation.
- Copy and content: Russian labels implemented; visual verification blocked.

## Implementation checklist

- [x] Add calendar and list modes for the administrator.
- [x] Add all-employee and single-employee filter and totals.
- [x] Add MAKI / База знаний sidebar branding.
- [ ] Capture and compare the deployed page to the selected reference.

final result: blocked
