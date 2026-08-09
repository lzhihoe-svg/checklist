# Team Checklist

A mobile-friendly checklist web app for a small team — one Boss panel plus three staff profiles (Admin, Sales, Operator).

## Features

- **Boss panel** (PIN-protected): create tasks, assign them to Admin / Sales / Operator, see every checklist, view a performance stats tab (assigned / done / pending with completion bars), and manage everyone's PINs.
- **Staff checklists**: each staff member unlocks their own list with a 4-digit PIN and taps a task to tick it. Ticked tasks don't disappear — they turn light grey with a strikethrough so the day's work stays visible.
- **Refresh button** on every screen to pull the latest state.
- Lime green theme, light & dark mode, designed for phones (works on desktop too).

## Default PINs

| Profile  | PIN  |
|----------|------|
| Boss     | 9999 |
| Admin    | 1111 |
| Sales    | 2222 |
| Operator | 3333 |

Change them in the Boss panel → **PINs** tab.

## Running it

It's a single self-contained file with no build step or server needed — open `index.html` in any browser, or host it anywhere static files are served (GitHub Pages, Netlify, etc.).

Data is saved in the browser's localStorage, so it persists on the device where it's used. All profiles on the same device share the same data.
