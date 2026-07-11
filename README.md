# Multiplication Dojo

A belt-based multiplication practice app for the ×3, 4, 6, 7, 8, 9, 11, 12 tables, with
student login and progress tracking, ready to deploy as a real website — **for free**,
including data that reliably persists over weeks or months (e.g. summer break, where
students log in sporadically rather than every day).

- **Students** go to your Render URL, enter the class code + their name, and practice.
- **You (teacher)** go to `your-url.onrender.com/teacher.html` and enter the class code to
  see everyone's belt progress.

No passwords — just a shared class code (so random visitors can't create accounts) plus
each student's own name. This is intentionally low-friction for 4th graders, not a
security system. Don't have students enter anything more sensitive than a first
name + last initial.

---

## Why this needs two free services, not one

The app itself runs on **Render** (free). But Render's free web services have an
*ephemeral filesystem* — any local file changes are wiped every time the service spins
down, which happens automatically after just 15 minutes with no visitors. For a tool
used sporadically over the summer, that's not an edge case — it will happen basically
every time, and any progress saved to a plain file would vanish before you next check it.

The fix is to store data somewhere that isn't tied to Render's filesystem at all:
**Neon**, a free hosted Postgres database that doesn't expire and doesn't wipe data —
it just "sleeps" between visits (like Render) and wakes up in a fraction of a second,
with everything intact. Both Render's web hosting and Neon's database are free, so the
whole setup costs nothing.

## 1. Put this project on GitHub

Render deploys from a GitHub (or GitLab) repository — it doesn't accept a raw file
upload for web services with a backend, so this is the one unavoidable manual step.

1. Go to [github.com](https://github.com) and create a free account if you don't have one.
2. Click **New repository**. Name it something like `multiplication-dojo`. Public or
   private both work. Don't add a README (you already have one).
3. On your own computer, unzip this project, then in a terminal inside the folder run:
   ```
   git init
   git add .
   git commit -m "Multiplication Dojo"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/multiplication-dojo.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your GitHub username — GitHub shows you this exact
   command on the empty repo's page too.)

   No terminal experience? GitHub also lets you drag-and-drop files directly in the
   browser: open your new repo → **Add file → Upload files** → drag in everything from
   this folder (keep the `public` folder structure intact) → commit.

## 2. Create a free Neon database

1. Go to [neon.tech](https://neon.tech) and sign up (no credit card required).
2. Create a new project (any name, e.g. `multiplication-dojo`).
3. On the project's dashboard, find the **Connection string** (sometimes under
   "Connect" or "Quickstart"). It looks like:
   `postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
4. Copy that whole string — you'll paste it into Render in the next step.

That's it — the app automatically creates the table it needs the first time it starts up.

## 3. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (signing up with your GitHub
   account makes the next step easier).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if prompted, then select the `multiplication-dojo` repo.
4. Fill in the settings:
   - **Name**: `multiplication-dojo` (this becomes part of your URL)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Under **Environment Variables**, add two:
   - **Key**: `CLASS_CODE` — **Value**: whatever code your students should use, e.g.
     `DOJO101` or `MRSMITH4`
   - **Key**: `DATABASE_URL` — **Value**: the Neon connection string you copied in step 2
6. Click **Create Web Service**. Render installs dependencies and starts the app — a
   couple of minutes the first time.
7. Once it says **Live**, check the **Logs** tab for this line:
   `Connected to Postgres (DATABASE_URL is set) — progress persists permanently...`
   That confirms students' progress will actually stick around.
8. Your app is at `https://multiplication-dojo-XXXX.onrender.com` (Render assigns the
   exact subdomain) — that's the link to give your students. Your teacher view is the
   same address with `/teacher.html` added.

## What to still expect on the free tier

- **The app itself still "sleeps."** After 15 idle minutes, Render spins the web
  service down; the next visitor waits 30-60 seconds while it wakes back up. Totally
  normal — just a brief loading screen, not a sign anything is broken.
- **Data no longer disappears**, because it's not stored on that sleeping service
  anymore — it's in Neon, which keeps it indefinitely regardless of how often (or
  rarely) anyone visits.

## Alternative: pay for Render instead of using Neon

If you'd rather keep everything inside Render and are fine with a small monthly cost,
you can skip Neon: upgrade the Render service to a paid **Starter** instance
(~$7/month, doesn't spin down) and attach a **persistent disk** (service → **Disks** tab
→ mount at `/var/data`), then set an environment variable `DATA_DIR` = `/var/data`
instead of `DATABASE_URL`. The app supports either approach automatically — it uses
Postgres if `DATABASE_URL` is set, otherwise local storage at `DATA_DIR` (or a default
folder, which is ephemeral on Render's free tier). For sporadic summer use, the free
Neon approach above is the better fit.

## Updating the app later

Render auto-deploys: once your GitHub repo is connected, any time you push new commits
to the connected branch, Render automatically rebuilds and redeploys — you don't need
to go back into the Render dashboard to "trigger" anything. You'll only open the
dashboard to check logs or change environment variables like `CLASS_CODE`.

## Changing the class code later

In the Render dashboard: your service → **Environment** → edit the `CLASS_CODE` value →
save (Render automatically restarts the app with the new code).

## Running it locally (optional, to test before deploying)

```
npm install
npm start
```
Then open `http://localhost:3000`. Without a `DATABASE_URL` set, it falls back to a
local file at `data/db.json` — fine for a quick local test. The class code defaults to
`DOJO101` unless you set `CLASS_CODE` yourself.
