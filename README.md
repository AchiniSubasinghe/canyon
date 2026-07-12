# Canyon Backend

This is the backend API for the Canyon project. It's built with Node.js, Express, and TypeScript, utilizing Drizzle ORM for database interactions.

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: MySQL (via `mysql2`)
- **Authentication**: JWT & bcrypt
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js (v20+) or Bun
- A running MySQL database

### Setup

1. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

2. Configure environment variables:
   Copy the example environment file and update the variables with your database credentials and JWT secret.
   ```bash
   cp .env.example .env
   ```

3. Database Management:
   Generate and run migrations, and optionally seed the database:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

### Development

Run the development server with live reloading (via `tsx`):
```bash
npm run dev
# or
bun run dev
```

### Build and Production

To build the project:
```bash
npm run build
```

To start the production server:
```bash
npm run start
```
