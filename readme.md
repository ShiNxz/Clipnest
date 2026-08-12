# Clipnest 🎬

A private clips-and-memes feed for a group of friends. Everyone gets a name and a
password, uploads whatever they want at whatever size, and it shows up in a feed
that looks like Instagram — or a 4-column grid, if you prefer.

- **Frontend:** Next.js 14 (App Router) + Mantine + Tailwind
- **Backend:** Elysia on Bun, typed end-to-end via Eden
- **Database:** Postgres (Drizzle ORM)
- **Storage:** Cloudflare R2, uploaded **straight from the browser** — no size limit

---

## Quick start

```bash
bun install
bun dev
```

That's it. The site is on **http://localhost:3000**, the API on
**http://localhost:5600**, and the first boot creates the admin account from
`apps/backend/.env` (`Amir` / `123123123` by default — change it).

You don't need Postgres installed to run it locally, and you don't need R2 to
log in and click around — see below.

| Command | What it does |
| --- | --- |
| `bun dev` | Frontend + backend together |
| `bun run build` | Production build of both |
| `bun start` | Run the production builds |
| `bun run db:generate` | Regenerate SQL migrations after editing the schema |
| `bun run studio` | Drizzle Studio |
| `bun run seed` | Create the admin user without booting the API |
| `bunx biome check --write .` | Format + lint |

---

## The pages

| Route | Who | What |
| --- | --- | --- |
| `/login` | anyone | Pick your name from a searchable dropdown, type your password |
| `/` | logged in | The feed — Instagram-style column or 4-column grid, click anything for fullscreen |
| `/upload` | logged in | Drop clips and memes, caption each one, watch the progress bars |
| `/admin` | admins | Every clip (with delete), every user (create, reset password, promote, delete) |
| `/docs` (API) | anyone | Swagger for the whole API |

**Fullscreen viewer** — click a post to open it over the page. Arrow keys move
through the feed, `Esc` closes. Videos play through `react-player`; images get
a plain contain-fit.

**Grid vs feed** — the toggle lives at the top right of the feed and is
remembered per browser in `localStorage`.

---

## How people log in

There are no emails and no signup. An admin creates a user with a name and a
password; that name then appears in the dropdown on `/login`, and the password
is the only thing to type.

- Passwords are hashed with **argon2id** (Bun's built-in `Bun.password`).
- The session is a JWT in an **HttpOnly cookie**, set for **400 days** — the
  longest a cookie can live, since Chrome and the cookie spec clamp anything
  above that.
- The token carries only a user id; the row is re-read on every request, so
  deleting a user or changing their admin flag takes effect immediately instead
  of waiting out the cookie.
- `GET /auth/users` is deliberately public — it's the login dropdown. It exposes
  names and avatars, never hashes.

### Avatars

Avatars are [DiceBear](https://dicebear.com) URLs — a pure function of
`(style, seed)`, so there's nothing to upload or store. New users get one
automatically, and the create-user form has a **Randomize** button plus 12
styles to pick from. There's also a 🎲 button for the password, and a copy
button next to it.

Passwords are shown **once**, in the toast right after creating the user or
resetting it. Write it down — there's no way to read it back.

---

## Uploads

The browser asks the API to sign an upload, PUTs the file **directly to R2**, and
only then tells the API to publish the post. The bytes never pass through the
API, which is what makes "any size, any length" true — there's no request body
limit to raise, no memory spike, and no timeout to tune.

```
browser ──POST /uploads/sign──> API ──> presigned PUT URL
browser ──PUT (the whole file)──────────────────────────> R2
browser ──POST /posts { key }──> API ──HeadObject──> R2   (confirms it landed)
```

The API never trusts what the client says about the file: it reads the size and
content type back off R2, and refuses any key that isn't under the caller's own
`posts/<their-user-id>/` prefix.

The one real ceiling is **5 GB per file** — S3's limit for a single PUT. Past
that you'd need a multipart upload, which this doesn't implement.

### Setting up R2

1. Create a bucket (e.g. `clipnest`).
2. Expose it publicly: either the `r2.dev` subdomain or a custom domain. Put the
   hostname in `R2_PUBLIC_URL` — no scheme, e.g. `r2.clipnest.dev`.
3. Create an **R2 API token** with Object Read & Write, and fill in
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
4. **Add a CORS rule to the bucket** — without it the browser's PUT is blocked
   and every upload fails:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-site.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Until R2 is configured the app still boots, logs in and browses — only uploading
fails, with a message saying what's missing.

---

## Database

Postgres, through Drizzle. Two tables: `users` and `posts`.

**In production**, set `DATABASE_URL` and you're on a normal Postgres server.

**Locally**, leave it unset and the app falls back to
[PGlite](https://pglite.dev) — the real Postgres engine compiled to WASM,
persisting to `apps/backend/.data/`. Same SQL, same schema, same migrations, but
`bun dev` works on a laptop with nothing installed. Delete that folder to start
over.

Migrations run automatically on boot, so a fresh clone needs no extra step.
After editing `db/schema.ts`, run `bun run db:generate` to write a new migration.

---

## Environment

**`apps/backend/.env`**

| Variable | Notes |
| --- | --- |
| `WEBSITE_URL` | Where the site lives. Also the production cookie domain. |
| `API_PORT` | Default `5600`. |
| `SECRET` | Signs the session cookie. Changing it logs everyone out. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Created on first boot **only if that name doesn't exist**. Never overwrites a changed password. |
| `DATABASE_URL` | Unset → PGlite. Set → that Postgres. |
| `R2_*` | See above. |

**`apps/frontend/.env`**

| Variable | Notes |
| --- | --- |
| `API` | Backend URL. **Inlined at build time** — a production build must be made with the production value. |
| `WEBSITE_NAME` | Browser tab title. |

### Cookies across domains

Locally the site (`:3000`) and API (`:5600`) are the same site — ports aren't
part of a cookie's origin — so the default `SameSite=Lax` works.

In production the cookie is pinned to the parent domain, so `api.example.com`
can set a cookie that `example.com` sends back. If you ever put the API on a
**different registrable domain**, change `authCookieOptions` in
`apps/backend/utils/constants/Auth.ts` to `sameSite: 'none'` with
`secure: true`.

---

## Structure

```
apps/
  backend/            Elysia API
    app.ts            Entrypoint — migrations, seed, middleware, routes
    db/               Drizzle schema, driver switch, migrations, seed
    middlewares/      isAuth / isAdmin
    routes/           auth · posts · uploads · admin
    utils/lib/r2/     R2 client, presigning, reads, best-effort cleanup
  frontend/           Next.js site
    app/(app)/        Everything behind the auth guard (feed, upload, admin)
    app/login/        The one public page
    app/UI/           Shared components
    utils/            Eden client, upload flow, media probing, formatting
packages/
  backend-api/        Eden treaty client — gives the frontend the API's types
  shared/             Avatar + password generators used by both sides
```

`packages/backend-api` is what makes the frontend type-safe: it imports the
Elysia app's *type* and hands back a client where `eden.posts.index.get()` knows
its own response shape. Change a route, and the frontend stops compiling.

---

## Things worth knowing

- **Deleting is permanent.** Removing a post deletes the R2 object too; removing
  a user takes all their posts with them. If R2 can't be reached the row is
  still deleted and the orphaned object is logged rather than blocking the
  delete.
- **Video thumbnails** in the grid are the browser rendering the first frame via
  a `#t=0.1` URL fragment — no thumbnails are generated or stored.
- **Dimensions and duration** are measured in the browser before upload, since
  the server never sees the bytes. If the browser can't decode a file, the post
  is still created without them.
- **Feed paging** uses a `(createdAt, id)` keyset cursor, so posting while
  someone scrolls never duplicates or skips an item — including when several
  uploads land on the same millisecond.
