# Virtual Event Management Platform (In-Memory Backend)

This project provides a backend for a virtual event management platform. The repository was converted to use in-memory storage (arrays/objects) for users and events to satisfy the requested requirement.

Features
- User registration and login with `bcryptjs` password hashing and JWT-based authentication
- Role-based authorization (`organizer` vs `attendee`)
- Event CRUD (create, read, update, delete) — events stored in-memory
- Participant registration for events (in-memory)
- Email hooks (mocked logs by default)

Running

1. Install dependencies

```bash
npm install
```

2. Start server (development)

```bash
npm run dev
```

API

- `POST /api/auth/register` — register a user. Body: `{ name, email, password, role }`.
- `POST /api/auth/login` — login. Body: `{ email, password }`.
- `GET /api/events` — list events.
- `POST /api/events` — create event (organizer only). Auth header: `Authorization: Bearer <token>`.
- `PUT /api/events/:id` — update event (organizer only).
- `DELETE /api/events/:id` — delete event (organizer only).
- `POST /api/events/:id/register` — register as attendee for the event (authenticated users).

Testing

Run tests with:

```bash
npm run test
```

Notes
- The in-memory storage will reset when the server restarts.
- Email sending is implemented in `utils/emailService.js` — it currently logs a mock message. Configure `EMAIL_USER` and `EMAIL_PASS` and enable sending if you want real emails.
- If you later want to use MongoDB again, set `MONGO_URI` in the environment and the app will attempt to connect; current models would need to be adjusted back to Mongoose for full DB usage.
