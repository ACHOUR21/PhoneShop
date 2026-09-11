# Deploying PhoneShop Pro 🚀

The app ships as a Docker image (Next.js standalone + SQLite on a persistent
volume). Pick one option — **Render is the easiest** (no CLI needed).

Required env vars everywhere:

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | SQLite file **on the persistent volume** | `file:/app/data/prod.db` |
| `NEXTAUTH_SECRET` | Session signing key (min 32 random chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public https URL of the app (auth callbacks) | `https://phoneshop-pro.onrender.com` |
| `BOOTSTRAP_ADMIN_EMAIL` | Creates the first admin on empty DB | `admin@myshop.dz` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password for that admin | (strong password) |

> `BOOTSTRAP_*` only acts when the database has **zero users**, then never
> again. You can remove the vars after the first login, or keep them.

---

## Option A — Render (recommended, ~5 min, no CLI)

1. Push this repo to GitHub (the `main` branch).
2. Go to **dashboard.render.com → New → Blueprint** and select the repo.
   Render reads `render.yaml`: builds the Dockerfile, creates the `starter`
   web service + 1 GB persistent disk.
3. When prompted, fill `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.
4. After the first deploy, check the service URL:
   - If it isn't `https://phoneshop-pro.onrender.com`, update `NEXTAUTH_URL`
     and `NEXT_PUBLIC_APP_URL` in **Environment**, save, and redeploy.
5. Open the URL → log in with your bootstrap admin. Done ✅

Notes:
- Persistent disks need a paid (`starter`) plan — required, otherwise the
  SQLite database is wiped on every deploy.
- Health check: `GET /api/health`.

## Option B — Fly.io (CLI, generous free allowance)

```bash
# one-time setup
fly auth login
fly launch --no-deploy        # reuse fly.toml, choose app name/region

# persistent volume for SQLite (3 GB shown; 1 GB is enough)
fly volumes create phoneshop_data --size 3 --region cdg

# secrets (never commit these)
fly secrets set \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  NEXTAUTH_URL="https://phoneshop-pro.fly.dev" \
  BOOTSTRAP_ADMIN_EMAIL="admin@myshop.dz" \
  BOOTSTRAP_ADMIN_PASSWORD="change-me-strong"

fly deploy
```

Open `https://<your-app>.fly.dev` and log in. If you picked a different app
name, update `NEXTAUTH_URL` accordingly and `fly deploy` again.

## Option C — Any VPS with Docker

```bash
git clone https://github.com/ACHOUR21/PhoneShop.git
cd PhoneShop

# create env file (never commit it)
cat > .env.production <<'EOF'
DATABASE_URL=file:/app/data/prod.db
NEXTAUTH_SECRET=replace-with-openssl-rand-base64-32
NEXTAUTH_URL=https://shop.example.com
NEXT_PUBLIC_APP_URL=https://shop.example.com
BOOTSTRAP_ADMIN_EMAIL=admin@myshop.dz
BOOTSTRAP_ADMIN_PASSWORD=change-me-strong
EOF

docker compose --env-file .env.production up -d --build
```

Put Caddy/Nginx in front for HTTPS, e.g. Caddy:

```
shop.example.com {
    reverse_proxy localhost:3000
}
```

## Option D — Prebuilt image (GHCR)

Every push to `main` builds and publishes:

```
ghcr.io/ACHOUR21/phoneshop:latest
```

Pull and run it anywhere Docker runs (attach a volume at `/app/data`
and pass the env vars above).

## After deploy checklist

- [ ] Log in as bootstrap admin, then **change the password** (Settings).
- [ ] Create staff accounts with proper roles (Users page, admin only).
- [ ] Remove `BOOTSTRAP_*` vars (optional — they're inert after first user).
- [ ] Back up `/app/data/prod.db` regularly (Render disk snapshots / `fly sftp`
      / VPS cron copy).
