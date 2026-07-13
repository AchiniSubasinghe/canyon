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
| admin@canyon.local | Admin123! | Administrator |
| pm@canyon.local | Pm123456! | Project Manager |
| member@canyon.local | Member123! | Team Member |

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

It knows the exact capabilities of the current user’s role and will only discuss or suggest actions the role can perform. It also receives a live snapshot of the user’s visible projects and tasks.

**Setup**: add `DEEPSEEK_API_KEY=sk-...` to `canyon-be/.env` (see `.env.example`).
