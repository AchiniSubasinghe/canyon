# Canyon Backend

REST API for Canyon. Built with **Bun**, Express, TypeScript, and Drizzle ORM.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: MariaDB / MySQL (via `mysql2`)
- **Authentication**: JWT + `Bun.password` (bcrypt)
- **Validation**: Zod

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- MariaDB or MySQL

### Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   ```

3. Database:

   ```bash
   bun run db:generate
   bun run db:migrate
   bun run db:seed
   ```

### Development

```bash
bun run dev
```

Runs `bun --watch src/index.ts` on port 3001 (configurable via `PORT`).

### Build and Production

```bash
bun run typecheck   # TypeScript check
bun run build       # Bundle to dist/
bun run start       # Run src/index.ts
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Watch mode development server |
| `start` | Run API |
| `build` | Bundle entry to `dist/` |
| `typecheck` | `tsc --noEmit` |
| `db:generate` | Generate Drizzle migrations |
| `db:migrate` | Apply migrations |
| `db:seed` | Seed roles + 3 demo users only; resets demo passwords; clears projects/tasks/extra users |