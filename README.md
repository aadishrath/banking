# Banking App

Full-stack Angular 19 banking app with a Postgres-backed Node/Express API, role-based banking workflows, and an interactive in-app assistant.

## What It Includes

- Angular 19 frontend with standalone routes and a responsive banking UI
- Express API with Postgres persistence
- JWT auth plus server-side session validation
- role-based access for `admin`, `customer`, and `company` users
- profile editing with permission-aware controls
- user management for admin and company roles
- chatbot-assisted account actions
- activity logging for auth events, chatbot actions, profile changes, and user-management events

## Current Architecture

- Frontend: Angular 19
- Backend: Express
- Database: Postgres
- Auth: JWT, session id binding, password hashing, failed-login lockout

## Backend State

The backend no longer uses the old file-backed JSON store at runtime.

- Postgres is the live source of truth
- schema changes are managed through SQL migrations
- demo data is inserted through a seed script
- request handling now uses row-level Postgres reads/writes and transactions instead of full-database snapshot rewrites

The seed file at [server/data/db.json](C:/Users/adish/Downloads/myApps/portfolio/banking/server/data/db.json) is now used only for initial demo data.

## User Roles

### Admin

- full banking access
- profile editing
- permission editing
- user create, edit, and remove
- company hub access

### Customer

- reduced banking access
- no user-management access
- no permission-management access

### Company

- company workspace access
- profile editing
- user create, edit, and remove for company/customer roles
- no admin-only permission-management features

## Demo Credentials

- `admin / admin2026`
- `customer / customer2026`
- `company / company2026`

## Local Setup

1. Install PostgreSQL
2. Create a database named `banking_app`
3. Copy [.env.example](C:/Users/adish/Downloads/myApps/portfolio/banking/.env.example) to `.env`
4. Set your Postgres connection string and JWT secret
5. Install dependencies
6. Run migrations
7. Seed demo data
8. Start the frontend and backend

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Or use the combined initializer:

```bash
npm run db:init
npm run dev
```

This starts:

- frontend: `http://localhost:4200`
- backend: `http://localhost:4000`

## Environment Variables

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: secret used to sign auth tokens
- `JWT_EXPIRES_IN`: token lifetime, default `8h`
- `SESSION_TTL_MS`: server session lifetime in milliseconds
- `MAX_FAILED_LOGINS`: failed login attempts before temporary lockout
- `LOCKOUT_WINDOW_MS`: lockout duration in milliseconds
- `CLIENT_ORIGIN`: allowed frontend origin for CORS

See [.env.example](C:/Users/adish/Downloads/myApps/portfolio/banking/.env.example) for a working template.

## Database Commands

```bash
npm run db:migrate
npm run db:seed
npm run db:init
```

Scripts:

- `db:migrate`: applies SQL migrations from [server/migrations](C:/Users/adish/Downloads/myApps/portfolio/banking/server/migrations)
- `db:seed`: inserts demo data if the database is empty
- `db:init`: runs both migration and seed steps

## Useful API Capabilities

The backend currently handles:

- auth login, logout, and session bootstrap
- permissions lookup and update
- profile updates
- user create, edit, list, and delete
- account fetch and CRUD
- activity fetch and creation
- transfer, card payment, and freeze/unfreeze actions
- chatbot requests

## Security Notes

The app now includes:

- hashed passwords using Node crypto
- JWTs bound to active server-side session ids
- server-side session expiry
- failed-login tracking
- temporary account lockout after repeated failures
- activity logging for important auth and admin events

This is much stronger than the earlier demo-only auth model, but it is still an app demo and not a fully hardened production banking platform.

## Deployment

### Vercel

- host the Angular frontend
- build output is configured in [vercel.json](C:/Users/adish/Downloads/myApps/portfolio/banking/vercel.json)

### Render

- host the Express API
- provision the Postgres database
- deployment is configured in [render.yaml](C:/Users/adish/Downloads/myApps/portfolio/banking/render.yaml)
- Render build runs `npm install && npm run db:init`

Set these production values on Render:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

Set `CLIENT_ORIGIN` to your deployed Vercel frontend URL.

## Suggested Next Steps

Strong next improvements from here:

- normalize `accounts`, `activity`, and `chat` into dedicated Postgres tables
- add inline validation and confirmations in user-management flows
- add refresh-token support or rotating sessions
- add backend tests for auth and data-layer behavior
