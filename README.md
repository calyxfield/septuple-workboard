# Septuple Workboard

A public, CSV-backed Kanban board for Septuple product work.

Published at <https://calyxfield.github.io/septuple-workboard/>.

`work.csv` is the canonical ledger. The static site polls it every 20 seconds and exposes the same file for download. Each card shows its last reported activity and row timestamp; the board is not connected to agent runtime telemetry.

## Updating the board

Update a row when work is claimed, changes hands, opens a pull request, becomes blocked, enters review, lands, or is deliberately dropped.

Allowed `stage` values are:

- `Feature ideas`
- `Ready`
- `In progress`
- `Review`
- `Done`

Allowed `reported` values are `working`, `idle`, and `blocked`.

`Feature ideas` is reserved for work without a pull request. Move a card to `In progress` when implementation starts and to `Review` when its pull request is ready for a decision.

Use `link` for the canonical pull request or discussion and `preview` for an immutable review deployment when one exists.
