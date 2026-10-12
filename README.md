# TaskFlow — Collaborative Kanban Board

A responsive React + Vite Kanban starter with a Glassmorphism-inspired UI, drag-and-drop, task CRUD, search/filter, local persistence, optional Supabase Auth client wiring, SQL schema/RLS starter, and security checklist.

## Requirements

- Node.js 20.19+ or 22.12+ recommended for Vite 6
- npm

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

The repo is ready for GitHub Pages (`vite.config.js` uses a relative `base`, and `.github/workflows/deploy.yml` builds and publishes on every push to `main`).

1. Push this project to a GitHub repo with the default branch `main`.
2. Go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. (Optional) For Supabase sign-in, add repository **Variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public/anon key only), and add your Pages URL to Supabase Auth > Redirect URLs.
4. The site goes live at `https://<user>.github.io/<repo>/`. Set that URL as the repo's website (the gear icon next to **About**) so visitors land on the app, not the code.

## Included features

- Three Kanban columns: To do, In progress, Done
- Drag-and-drop between columns and reorder within a column (mouse, touch sensor, keyboard sensor)
- Create, edit, and delete tasks; title, description, priority, label, due date, assignee
- Search tasks and filter by priority
- Responsive desktop/tablet/mobile layout and mobile sidebar
- LocalStorage persistence when cloud credentials are not configured
- Success/error toasts, accessible labels, keyboard focus styles, reduced-motion support
- Page title, meta description, favicon, dynamic copyright year, no horizontal page overflow by design
- Optional Supabase magic-link sign-in client and SQL schema/RLS starter

## Optional Supabase setup

1. Create a Supabase project.
2. Review `supabase/schema.sql` carefully and apply it to a **new/test project first**.
3. Configure Auth email templates, redirect URLs, allowed origins, rate limits, backups, and monitoring in Supabase.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using your project's public browser key.
5. Restart Vite after changing environment values.

**Important:** The current UI uses local demo tasks for board data even when Supabase is configured; Supabase is currently wired for optional authentication only. A follow-up implementation is required to load and mutate boards/tasks through Supabase queries and to create workspaces, membership, board invitations, realtime updates, and safe role-change flows. Do not treat the SQL starter as a complete audited production authorization system. Never put `service_role`, database passwords, or other server secrets in any `VITE_*` variable.

## Security checklist (40 items)

Status is deliberately honest: UI improvements in this starter are implemented where indicated; server/deployment controls require configuration or review and are not claimed complete.

### Security and maintenance

| # | Item | Status / implementation |
|---:|---|---|
| 1 | Hide API keys | `.env` ignored; only public Supabase client key is allowed in browser. Rotate any exposed secrets. |
| 2 | Environment variables | `.env.example` included; configure deployment environment separately. |
| 3 | Git secret history | Manual `gitleaks`/secret scan required; history rewriting and key rotation if found. |
| 4 | Admin routes | No admin route exists yet; enforce server-side role checks if added. |
| 5 | Authentication | Optional Supabase email OTP client included; configure provider/redirect URLs. |
| 6 | User permissions | SQL RLS starter included; production review and full integration required. |
| 7 | Sanitize input | Task form trims/caps fields; server-side validation still required. |
| 8 | XSS | React text rendering used; do not add unsafe HTML rendering without sanitization. |
| 9 | SQL injection | No direct SQL client queries in frontend; use parameterized server/database APIs. |
| 10 | Database rules | Schema checks, foreign keys, and RLS starter included; review policies before production. |
| 11 | Rate limiting | Configure Supabase Auth/API limits or server-side limiter. |
| 12 | Spend cap | Configure provider budgets/alerts; hard caps may not be available for all services. |
| 13 | Secure uploads | Upload feature is not implemented; validate file type/size and store privately if added. |
| 14 | CSRF | Supabase client auth is used; review cookie/session architecture and protect any cookie-auth server endpoints. |
| 15 | CORS | Configure allowed origins on hosting/API; do not use wildcard credentialed CORS. |
| 16 | HTTPS | Enforce at deployment/hosting layer; local dev is not production HTTPS. |
| 17 | Security headers | Configure CSP, HSTS, frame-ancestors, nosniff, and Referrer-Policy at hosting/server. |
| 18 | Secure cookies | Supabase manages client auth storage by default; server cookies need Secure/HttpOnly/SameSite review. |
| 19 | Disable debug mode | Vite production build strips dev-only behavior; verify deployment settings/logging. |
| 20 | Production settings | Run build and configure secrets, backups, logs, monitoring, and least privilege. |

### UX and site quality

| # | Item | Status / implementation |
|---:|---|---|
| 1 | Horizontal scroll | Responsive sizing and `overflow-x: clip`; verify with target browsers. |
| 2 | Broken links | Current internal links are anchors; external navigation not yet implemented. |
| 3 | Mobile menu | Responsive slide-out sidebar and scrim included. |
| 4 | Favicon | `favicon.svg` included. |
| 5 | Page titles | Descriptive document title included. |
| 6 | Meta description | Included in `index.html`. |
| 7 | Footer links | Footer has working feedback action; legal/support pages not yet implemented. |
| 8 | Custom 404 | SPA fallback must be configured at host; custom route/page not yet implemented. |
| 9 | Copyright year | Dynamic current year included. |
| 10 | Image compression | No heavy local images used; decorative icon is SVG. |
| 11 | Broken buttons | Main task controls work; project/invite/settings placeholders notify user honestly. |
| 12 | Success messages | Toasts included for task operations and drag/drop. |
| 13 | Clear errors | Form validation and error toasts included. |
| 14 | Placeholder text | Form placeholders are intentional instructions; no lorem ipsum. |
| 15 | Unused navigation | Main navigation is present; non-board sections show explicit demo notices. |
| 16 | Mobile overflow | Responsive CSS and wrapping included; browser testing still recommended. |
| 17 | Clickable logo | Logo links to home anchor. |
| 18 | Clickable phone | Not applicable; this task board has no phone contact. |
| 19 | Clickable email | Not applicable in task-board UI; magic-link email prompt is provided. |
| 20 | Mobile optimized | Breakpoints, touch sensor, mobile menu, reduced motion and focus styles included. |

## Current limitations / production checklist

- Board tasks are local-only; they are not yet synchronized across devices or team members.
- Team invitations, roles UI, activity log, list view, notifications, and billing are UI placeholders.
- Implement board/task Supabase queries and realtime subscriptions before advertising cloud collaboration.
- Audit the RLS policies and membership/role mutation path with a test matrix for anonymous, viewer, member, admin, and owner roles.
- Configure host rewrites for SPA routes, HTTPS, security headers, CSP, CORS, production logging, backup/restore, monitoring, and spend alerts.
- Run browser/device testing, accessibility checks, dependency audit (`npm audit`), and secret scan (`gitleaks`) before deployment.
