# Multiplication Dojo

A belt-based multiplication practice app for the ×3, 4, 6, 7, 8, 9, 11, 12 tables, with
student login and progress tracking, ready to deploy as a real website on Render.

- **Students** go to your Render URL, enter the class code + their name, and practice.
- **You (teacher)** go to `your-url.onrender.com/teacher.html` and enter the class code to
  see everyone's belt progress.

No passwords — just a shared class code (so random visitors can't create accounts) plus
each student's own name. This is intentionally low-friction for 4th graders, not a
security system. Don't have students enter anything more sensitive than a first
name + last initial.

---

## 1. Put this project on GitHub

Render deploys from a GitHub (or GitLab) repository — it doesn't accept a raw file
upload for web services with a backend, so this is the one unavoidable manual step.

1. Go to [github.com](https://github.com) and create a free account if you don't have one.
2. Click **New repository**. Name it something like `multiplication-dojo`. Keep it **Public**
   or **Private** — either works with Render's free tier. Don't add a README (you already have one).
3. On your own computer, unzip this project, then in a terminal inside the folder run:
   ```
   git init
   git add .
   git commit -m "Multiplication Dojo"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/multiplication-dojo.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your actual GitHub username. GitHub will show you this
   exact command on the empty repo's page too.)

   No terminal experience? GitHub also lets you drag-and-drop the files directly in the
   browser: open your new repo → **Add file → Upload files** → drag in everything from
   this folder (keep the `public` folder structure intact) → commit.

## 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (you can sign up directly with your
   GitHub account, which makes step 2 easier).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if prompted, then select the `multiplication-dojo` repo.
4. Fill in the settings:
   - **Name**: `multiplication-dojo` (this becomes part of your URL)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free is fine to start
5. Under **Environment Variables**, add one:
   - **Key**: `CLASS_CODE`
   - **Value**: whatever code you want your students to use, e.g. `DOJO101` or `MRSMITH4`
6. Click **Create Web Service**. Render will install dependencies and start the app —
   this takes a couple of minutes the first time.
7. Once it says **Live**, your app is at `https://multiplication-dojo-XXXX.onrender.com`
   (Render assigns the exact subdomain). That's the link to give your students — they can
   type it directly into their browser's address bar, or you can bookmark it / put it on
   your class website.

Your teacher view is at the same address with `/teacher.html` added, e.g.
`https://multiplication-dojo-XXXX.onrender.com/teacher.html`.

## Important: about the free tier

Two things worth knowing about Render's **free** instance type:

- **It sleeps when idle.** After ~15 minutes with no visitors, the app spins down. The
  next visit takes 30-60 seconds to "wake up" while it says "Loading..." — totally normal,
  just tell students to be patient on the first load of the day.
- **Progress data can be lost on redeploy.** This app stores scores in a simple file on
  disk. Render's free tier doesn't guarantee that disk survives a redeploy or restart —
  it usually persists fine day-to-day, but if you push a code update or Render restarts
  the service, saved scores could reset. If long-term progress tracking across the whole
  school year matters, upgrade to a **paid instance with a persistent disk** (Render's
  dashboard → your service → Disks) — this is a small monthly cost but guarantees your
  data survives restarts and deploys.

## Changing the class code later

In the Render dashboard: your service → **Environment** → edit the `CLASS_CODE` value →
save (Render will automatically restart the app with the new code).

## Running it locally (optional, to test before deploying)

```
npm install
npm start
```
Then open `http://localhost:3000` in your browser. The class code defaults to `DOJO101`
unless you set the `CLASS_CODE` environment variable yourself.
