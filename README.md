# Canyon

Project management platform with role-based access control.

## Structure

```
canyon/
  canyon-be/          # Bun + Express API
  canyon-fe/          # Next.js frontend
  packages/shared/    # Shared TypeScript types (@canyon/shared)
```

## Setup

```bash
bun install

# Backend
cd canyon-be
cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev

# Frontend (separate terminal)
cd canyon-fe
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1' > .env.local
bun run dev
```

Open http://localhost:3000

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| achini@canyon.local | achini123 | Administrator |
| akash@canyon.local | akash123 | Project Manager |
| emalin@canyon.local | emalin123 | Team Member |

Re-running `bun run db:seed` restores these three passwords (and clears projects, tasks, and any non-seed users).

## Scripts (root)

```bash
bun run dev:be      # Start API
bun run dev:fe      # Start frontend
bun run test        # Backend tests
bun run typecheck   # Backend typecheck
bun run ci          # Full CI pipeline locally
```

## Canyon Agent

A role-aware chat interface (inspired by ChatGPT) lives at `/agent`.

The agent uses **tool calling** against the same project/task/user services as the UI. Every tool runs under the signed-in user with **server-side RBAC** (not prompt-only). It can list and mutate projects, tasks, members, and (for admins) users—within that role’s permissions.

**Setup**: add `DEEPSEEK_API_KEY=sk-...` to `canyon-be/.env` (see `.env.example`).

## Deployment (Vercel + Render + Aiven)

Auth uses an **httpOnly refresh cookie**. That cookie must be first-party on the frontend domain. If the browser talks to Render (`*.onrender.com`) from a Vercel domain (`canyon.achini.space`), the cookie is cross-site, browsers will not send it with `SameSite=Strict`/`Lax`, and login/refresh fails with `POST /auth/refresh 401`.

### Recommended: same-origin API proxy

Proxy `/api/v1/*` through Next.js so the cookie is set on the frontend host.

**Vercel (frontend) env**

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `/api/v1` |
| `API_BACKEND_URL` | `https://canyon-xtpk.onrender.com` |

`API_BACKEND_URL` is server-only (used by `next.config.ts` rewrites). Redeploy after changing it.

**Render (backend) env**

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://canyon.achini.space` |
| `COOKIE_SAME_SITE` | `lax` (default) |
| `DB_*` | Aiven MySQL credentials |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | long random secrets |
| `DEEPSEEK_API_KEY` | agent key |

### Not recommended: browser → Render directly

If you must set `NEXT_PUBLIC_API_URL=https://…onrender.com/api/v1` (no proxy):

1. Backend: `COOKIE_SAME_SITE=none` and ensure cookies are `Secure` (`NODE_ENV=production` or `COOKIE_SECURE=true`).
2. Backend: `CORS_ORIGIN=https://canyon.achini.space`.
3. Next.js middleware still cannot see the refresh cookie (it lives on the API host), so route guards that check `refreshToken` will misbehave. Prefer the proxy setup.
