# Clipnest 🎬

**A private little corner of the internet for your group of friends.**

Every group has them: the clutch play someone clipped at 3am, the video from the
party nobody should ever see, the inside-joke meme that makes no sense to anyone
else. They get lost in WhatsApp, compressed into mush by Instagram, or buried in
a Discord channel three months deep.

Clipnest is a website you run for *your* group. Everyone gets a name and a
password, uploads clips and memes at full quality and any size, and it all lands
in one feed you can actually scroll, like and argue in the comments of.

**Private by default.** No signups, no emails, no algorithm, no strangers.
An admin creates the accounts, and that's the whole guest list. Nobody else can
even see the door.

- **Frontend:** Next.js 14 (App Router) + Mantine + Tailwind
- **Backend:** Elysia on Bun, typed end-to-end via Eden
- **Database:** Postgres (Drizzle ORM), or zero-install PGlite locally
- **Storage:** Cloudflare R2, uploaded **straight from the browser**, no size limit

---

## What you get

📤 **Upload anything** — clips, screen recordings, memes, screenshots. Files go
from your browser straight to storage, so there's no upload limit to fight with.
Caption each one, watch the progress bars, done.

📱 **A feed that feels familiar** — Instagram-style single column, or flip to a
4-column grid when you just want to scan everything. Your choice is remembered.

🔍 **Fullscreen viewer** — click any post to blow it up over the page. Arrow keys
move through the feed, `Esc` gets you out.

❤️ **Likes and comments** — one like per person, and hovering the count shows you
exactly *who* liked it, avatars and all. Comments have their own likes, and every
post shows its full thread right in the feed.

↕️ **Sort it your way** — newest, most liked, most commented, or oldest first.
It keeps loading as you scroll.

🔗 **Share one post, on purpose** — every clip is members-only until someone
presses Share and confirms a warning that spells out what that means. Then, and
only then, it gets a public `/p/<id>` link with a proper title, description and
link preview, so it unfurls as the clip itself in a chat or a search result.
Everything else stays behind the login. Any member can undo it — well, the
author, whoever shared it, or an admin.

🎭 **Fun avatars** — no photo uploads needed. Everyone gets a generated character,
with a Randomize button and 12 styles to pick from.

🏷️ **Make it yours** — an admin can rename the site and set a tagline, so it can
be "Squad Vault" or "Ben's Birthday 2026" instead of Clipnest. It even shows up
right when you paste the link in a chat.

👑 **Admin panel** — create and manage people, reset passwords, promote admins,
edit captions, delete anything.

---

## Quick start

You need [Bun](https://bun.sh) installed. That's the only prerequisite —
no Postgres, no Docker.

**1. Grab it and install**

```bash
git clone <this-repo> clipnest
cd clipnest
bun install
```

**2. Set up your two env files**

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Open `apps/backend/.env` and change two things:

- `SECRET` — anything long and random (`bun -e 'console.log(crypto.randomUUID())'`)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — this is *your* login, created on first boot

You can leave everything else for now.

**3. Run it**

```bash
bun dev
```

The site is on **http://localhost:3000**, the API on **http://localhost:5600**.

**4. Log in and invite the crew**

Log in with the admin name and password you just set, go to **/admin → Users**,
and create an account for each friend. Every new password is shown **once**, in
the toast right after you create them, so copy it and send it over. Their name
then appears in the dropdown on the login page and the password is the only
thing they ever type.

**5. To actually upload things, add storage**

Uploads need a Cloudflare R2 bucket ([setup below](#uploads-and-storage)). Until
then everything else works fine — you can log in, click around and explore.
Only uploading fails, with a message telling you what's missing.

### Commands

| Command | What it does |
| --- | --- |
| `bun dev` | Frontend + backend together |
| `bun run build` | Production build of both |
| `bun start` | Run the production builds |
| `bun run seed` | Create the admin user without booting the API |
| `bun run db:generate` | Regenerate SQL migrations after editing the schema |
| `bun run studio` | Drizzle Studio |
| `bunx biome check --write .` | Format + lint |

---

## The pages

| Route | Who | What |
| --- | --- | --- |
| `/login` | anyone | Pick your name from the dropdown, type your password |
| `/` | logged in | The feed — column or grid, click anything for fullscreen |
| `/upload` | logged in | Drop clips and memes, caption them, watch them upload |
| `/admin` | admins | Every clip, every user, and what the site is called |
| `/p/<id>` | **anyone** | One shared post — the only page a stranger can open |
| `/docs` | anyone | Swagger for the whole API |

---

## How logins work

There's no signup form and no email anywhere. An admin creates a user with a
name and a password, that name appears in the `/login` dropdown, and the
password is the only thing to type.

- Passwords are hashed with **argon2id** (Bun's built-in `Bun.password`).
- The session is a JWT in an **HttpOnly cookie**, good for **400 days** — the
  longest a cookie is allowed to live, so nobody gets logged out mid-scroll.
- The cookie only carries a user id and the row is re-read on every request, so
  deleting someone or changing their admin flag takes effect immediately.
- Passwords are shown once and can't be read back. Only reset.

---

## Sharing a post outside the group

Everything on the site needs a session, with exactly one exception: a post
somebody has deliberately shared. Pressing **Share** on a post opens a modal
that says, in as many words, that this makes the post readable by anyone —
including people with no account and search engines — and nothing happens until
that's confirmed a second time.

Once shared, the post has a public address at `/p/<id>`, and the card in the
feed carries a **Public** badge from then on, so nobody has to remember or go
looking to find out which clips have left the group.

**What the link gives a stranger:** the media, the caption, the author's name
and avatar, and how many likes and comments it has. **Not** who liked it, not a
single comment, and no way to reach any other post — there is no list to page
through and no neighbours to arrow into.

How that's actually enforced:

- A nullable `posts.shared_at` is the whole switch. The public query filters on
  it in the `where` clause, so there is no version of it that returns a private
  post.
- The public routes live under their own `/public` prefix in
  `routes/public/index.ts`, which never touches `isAuth`. Everything reachable
  without logging in is what's mounted there — one route.
- The response is built by `publicPost()` in `utils/lib/serialize.ts`, an
  explicit field list rather than a spread, so a column added to `posts` later
  can't quietly join it.
- A post that doesn't exist, one that was never shared and one that's been
  unshared all answer with the same 404. Ids are v4 UUIDs, so there's nothing to
  guess at either.
- Only `/p/` is crawlable — `app/robots.ts` disallows the rest, and every page
  but a shared post sends `noindex`. There's no sitemap on purpose: listing the
  shared posts would need an endpoint that enumerates them, and one link is
  meant to say nothing about the others.

**One caveat worth knowing.** Making a post private again stops the page and the
API answering, immediately. It does *not* un-publish the file itself: the bucket
behind `R2_PUBLIC_URL` is public, so the media has a permanent address that
anyone who already opened the post could have saved — the same as any image on
any website. If a clip needs to be genuinely gone, delete the post, which
deletes the R2 object with it.

## Uploads and storage

The browser asks the API to sign an upload, sends the file **directly to R2**,
and only then tells the API to publish the post. The bytes never pass through
the API, which is what makes "any size, any length" true — no request body limit
to raise, no memory spike, no timeout to tune.

```
browser ──POST /uploads/sign──> API ──> presigned PUT URL
browser ──PUT (the whole file)──────────────────────────> R2
browser ──POST /posts { key }──> API ──HeadObject──> R2   (confirms it landed)
```

The API never trusts what the client claims about a file: it reads the size and
content type back off R2, and refuses any key outside the caller's own
`posts/<their-user-id>/` folder. The one real ceiling is **5 GB per file**,
which is S3's limit for a single PUT.

A post row stores the **object key only** — never a full URL. The public address
is `R2_PUBLIC_URL` plus the key, built on the way out of the API, so pointing the
bucket at a different domain is one env change and every existing post follows.

### Setting up R2

1. Create a bucket (e.g. `clipnest`).
2. Expose it publicly — either the `r2.dev` subdomain or a custom domain. Put
   the hostname in `R2_PUBLIC_URL`, no scheme, e.g. `r2.clipnest.dev`.
3. Create an **R2 API token** with Object Read & Write, and fill in
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
4. **Add a CORS rule to the bucket.** Without it the browser's upload is blocked
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

---

## Database

Postgres through Drizzle. `users` and `posts`, with `post_likes`, `comments` and
`comment_likes` hanging off them — everything cascades, so deleting a post (or
the person who made it) takes the likes and the thread with it. Plus `settings`,
one row holding the site's name and tagline.

**Locally**, leave `DATABASE_URL` unset and the app falls back to
[PGlite](https://pglite.dev) — the real Postgres engine compiled to WASM,
persisting to `apps/backend/.data/`. Same SQL, same schema, same migrations, but
nothing to install. Delete that folder to start over.

**In production**, set `DATABASE_URL` and you're on a normal Postgres server.

Migrations run automatically on boot, so a fresh clone needs no extra step.
After editing `db/schema.ts`, run `bun run db:generate` to write a new migration.

---

## Environment

Both `.env.example` files are commented in detail — this is the short version.

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
| `WEBSITE_NAME` | Fallback site name, used until an admin sets one in `/admin` → Site. |
| `WEBSITE_URL` | Optional. The site's own address, used for the canonical and `og:` URLs on a shared post. Unset → taken from each request's own host. Also inlined at build time. |

### Cookies across domains

Locally the site (`:3000`) and API (`:5600`) count as the same site — ports
aren't part of a cookie's origin — so the default `SameSite=Lax` works.

In production the cookie is pinned to the parent domain, so `api.example.com`
can set a cookie that `example.com` sends back. If you put the API on a
**different registrable domain**, change `authCookieOptions` in
`apps/backend/utils/constants/Auth.ts` to `sameSite: 'none'` with `secure: true`.

---

## Structure

```
apps/
  backend/            Elysia API
    app.ts            Entrypoint — migrations, seed, middleware, routes
    db/               Drizzle schema, driver switch, migrations, seed
    middlewares/      isAuth / isAdmin
    routes/           auth · posts · uploads · admin · settings · public
    utils/lib/r2/     R2 client, presigning, reads, best-effort cleanup
  frontend/           Next.js site
    app/(app)/        Everything behind the auth guard (feed, upload, admin)
    app/login/        The way in
    app/p/[id]/       A shared post, server-rendered for crawlers
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

- **Deleting is permanent.** Removing a post deletes the R2 object too, and
  removing a user takes all their posts with them.
- **Video thumbnails** in the grid are just the browser rendering the first
  frame via a `#t=0.1` URL fragment. Nothing is generated or stored.
- **Dimensions and duration** are measured in the browser before upload, since
  the server never sees the bytes. If a file can't be decoded, the post is
  still created without them.
- **Likes are optimistic** — the heart moves on the click and reverts if the
  request fails, instead of waiting on the server.
- **Sharing isn't.** It's the one action that waits for the server before the
  badge appears: a share that quietly failed but looked like it worked is the
  wrong way round for something that crosses out of the group.
- **A shared video has no preview image.** Nothing generates a thumbnail, so the
  `og:video` tag is all there is — Discord, Telegram, iMessage and Facebook play
  it inline, and Twitter/X falls back to a plain card. Shared images get a full
  `summary_large_image`.
- **Feed paging** uses a keyset cursor holding the exact tuple its sort walks, so
  posting or liking while someone scrolls never duplicates or skips an item.
  The sort orders live in `packages/shared/feed.ts`: the API validates against
  that list and the dropdown is built from it, so adding one is a single edit.
