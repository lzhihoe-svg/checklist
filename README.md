# Aramega Checklist

A mobile-friendly checklist web app for a small team — one Boss panel plus three staff profiles (Admin, Sales, Operator). Lime green theme, light & dark mode.

## Features

- **Boss panel**: create tasks and assign them to Admin / Sales / Operator, see every checklist as a simple list per staff member, and view per-staff performance stats (assigned / done / pending / today).
- **Staff checklists**: each staff member opens their own list with one tap on their profile — no PIN, no login friction. Their tasks are grouped by day (Yesterday, Today, Tomorrow, dates — stamped automatically when the boss adds the task). Tapping a task ticks it — it doesn't disappear; completed tasks turn green on the staff side and sink to the bottom. Staff can reorder their own list with the **↑ ↓ buttons** on each pending task, and reassigning a task to another person is done from the ✎ edit view (boss boards and Bob's Delegate tab).
- **Refresh button** on every screen, plus **auto-refresh every 30 minutes** (and whenever the app returns to the foreground).

## Hosting option 1 — Google Apps Script (shared data for the whole team)

This gives everyone a **shared** checklist: the boss assigns from one phone, staff tick from theirs. All data is stored in a Google Sheet ("Aramega Checklist Data") auto-created in your Google Drive — open it anytime to see every task like a report.

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. In `Code.gs`, paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Click **+** next to Files → **HTML** → name it exactly `index`, and paste the entire contents of [`index.html`](index.html) into it.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize when asked, then share the web app URL with your staff (they can "Add to Home Screen" so it opens like an app).

The app detects it's running on Apps Script automatically and switches from on-device storage to the shared Google Sheet.

## Hosting option 2 — Netlify / GitHub Pages (single device)

`index.html` is fully self-contained — host it anywhere static files are served. Without the Apps Script backend it stores data in the browser's localStorage, so it suits a single shared device (one tablet/phone at the shop).

## Files

- `index.html` — the whole app (works standalone *and* as the Apps Script `index` HTML file).
- `apps-script/Code.gs` — the Apps Script backend (Google Sheet storage).
