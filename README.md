# DreamVerse AI

**Design Your Dreams. Explore Your Future.**

An AI-powered 3D life simulation: describe your dream future, generate a personalized world, explore it, make life decisions, and get an actionable roadmap. Outcomes are an imaginative simulation, not predictions.

## Status

- [x] Phase 1 — Project setup (client + server skeleton, MongoDB connection, theme). Install, client build and backend tests verified.
- [x] Phase 2 — Frontend design (homepage with 3D city, auth pages, dashboard, Create Your Future). Client build verified.
- [x] Phase 3 — Backend (auth, models, REST APIs, achievements/XP). 34 backend tests pass, including the database-backed API suite; register, create dream and dashboard verified against MongoDB Atlas. AI endpoints (`/api/ai/*`) come in Phase 5 and simulation endpoints (`/api/simulation/*`) in Phase 6.
- [x] Phase 4 — 3D world (walkable city, park, apartment, office, café; avatar editor; day/night; touch controls). Build and 18 client tests pass; walking and dream creation confirmed in the browser.
- [x] Phase 5 — AI integration (Nova chat, AI future profile, AI roadmap, decision simulator, demo mode). 36 offline AI tests pass, and the live paths were checked against a real provider (Groq): Nova chat ~2 s, Personalize with AI ~3 s, decision ~5 s. Without an AI key the app stays in clearly labeled demo mode.
- [x] Phase 6 — Gamification and decision simulator: decision simulator, Roadmap / Decisions / Achievements pages, world-visit XP, Future Explorer and Decision Maker, level titles, daily streak, level-gated avatar styles. 75 server and 27 client tests pass; confirmed working in the browser. Real-time features (Socket.IO) were optional in the spec and are not built.
- [x] Phase 7 — Testing and polish: security and configuration checks, sign-out on an expired login, page titles and screen-reader announcements, friendlier server errors, a full test guide. 177 server tests (including the five database-backed suites, run against a separate Atlas test database) and 39 client tests pass; `npm audit` reports 0 vulnerabilities. The browser walkthrough in "Testing Phase 7" is still the way to re-check by hand.
- [ ] Phase 8 — Deployment: Render blueprint for the API, Netlify / Vercel settings for the site, a post-deployment smoke check, a "still working" notice for sleeping free servers, hosted email (Brevo) and a step-by-step guide. Tick once your live site passes the smoke check and the browser checklist in "Deployment".

## Prerequisites

- Node.js 20+
- MongoDB (local, or a free MongoDB Atlas cluster)

## Setup

```bash
# 1. Install everything (root, client, server)
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env
cp client/.env.example client/.env
# edit server/.env: set MONGODB_URI and a long random JWT_SECRET

# 3. Run both apps
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5000 (health check: `GET /api/health`)

Run every test suite from the project root with `npm test` (backend first, then the client's world-logic tests).

## Testing Phase 1

1. Run `npm run dev`.
2. Open http://localhost:5173/status — you should see the DreamVerse status card.
3. The status card shows **API: online** and **Database: connected** when the server and MongoDB are reachable.
4. Run `npm test` for the backend tests.

## Testing Phase 2

1. `npm run build` completes without errors, then `npm run dev`.
2. **Home (/)**: hero text and both buttons show; the neon city rotates and can be dragged. On a phone-width window the menu button opens the mobile menu. With "reduce motion" enabled in your OS, the city stops auto-rotating.
3. **Demo World (/demo-world)**: drag to orbit, scroll to zoom.
4. **Register / Login**: submitting with bad input shows inline errors. With valid input you are signed in (this needs MongoDB and a `JWT_SECRET`, see Phase 3).
5. Click **Explore with sample data** on the login page: you land on the dashboard (XP ring, roadmap, achievements, chart, scenarios) with a "sample data" notice. **Exit demo** in the sidebar returns you home.
6. **Create Your Future (/create)**: fill fields, refresh the page (the draft stays), try **Use an example**. Submitting in demo mode explains that an account is needed.
7. Visit `/dashboard` while logged out: you are redirected to `/login`.

## Testing Phase 3

**Before you start**
- In `server/.env` set `JWT_SECRET` to a long random string (16+ characters). Without it, register and login return an explanatory error.
- MongoDB must be reachable (`MONGODB_URI`). If it is not, the API answers `503 The database is not connected` and keeps retrying every 5 seconds, so you can start MongoDB later without restarting the API.

**Automated tests**
```bash
npm test
```
- Unit tests (XP, validators, tokens, templates) and API tests (validation, auth gates, 503 when the DB is down) need no database.
- The end-to-end suite (`tests/integration.test.js`) is skipped unless you set `TEST_MONGODB_URI` to a **throwaway** database whose name contains `test` (it is wiped), for example:
  - Mac/Linux: `TEST_MONGODB_URI=mongodb://127.0.0.1:27017/dreamverse_test npm test`
  - PowerShell: `$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/dreamverse_test"; npm test`

**Manual flow**
1. Register at `/register`. You land on **Create Your Future**.
2. Fill in a career (and anything else) and click **Generate My DreamVerse**. You land on the dashboard showing your dream, a 6-milestone roadmap and 50 XP with the **First Dream Created** badge.
3. Log out, log back in at `/login`: your data is still there.
4. Refresh the dashboard: data persists. Try `/dashboard` while logged out: you are sent to `/login`.

**Endpoints (all JSON, private ones need `Authorization: Bearer <token>`)**

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create account / log in, returns `{ token, user }` |
| GET, PATCH | `/api/auth/me` | Current user / update name |
| POST, GET | `/api/dreams` | Create a dream (also builds a starter profile and roadmap) / list yours |
| GET, PUT | `/api/dreams/:id` | One dream with profile and roadmap / update its answers |
| GET | `/api/progress` | XP, level, weekly XP, achievements, latest dream and roadmap |
| PATCH | `/api/progress/milestones/:id` | Tick or untick a task `{ taskId, done }`; the server awards XP once per task |
| GET | `/api/achievements` | All achievements with earned state |

Roadmaps and profiles are first built with simple rules and labeled `source: "template"`. With an AI provider configured you can upgrade them to `source: "ai"` (see Testing Phase 5).

## Testing Phase 4

**Automated:** `npm test --prefix client` (also part of `npm test`). It checks movement and collisions, that every door leads somewhere real, that every interactable and spawn is reachable on foot, avatar sanitizing and the interaction copy. It does not need a browser or a database.

**In the browser** (`npm run dev`, then sign in or use **Explore with sample data**, then click **Continue Exploring** on the dashboard or open `/world`):
1. The controls help opens the first time. **Start exploring** closes it (**?** reopens it).
2. **Walk** with W A S D or the arrow keys; hold Shift to run. You collide with buildings, trees, the pond and furniture, and slide along them.
3. **Camera**: drag on the scene (or press Q / R) to turn it, scroll to zoom.
4. Walk to the gold diamond over a building door and press **E** (or click the prompt). The screen fades and you are inside. Check all three: **apartment** (bed, desk, shelf, window, TV), **office** (roadmap whiteboard, desks, meeting room, server rack), **café** (counter, tables). Use the exit door in each room to return to the city, standing in front of the building you left.
5. Pink diamonds are things to examine. A panel shows text built from your dream (career, skills, goals, next roadmap step). With no dream yet, it points you to **Create Your Future**. **Esc** closes the panel.
6. The park (south-west of the city) has a pond, trees and benches. The label in the top bar changes as you move between districts.
7. **Sun / moon button**: Day, Night, then Auto (a slow day/night cycle). Windows and lamps glow at night.
8. **Palette button**: change skin, hair, clothes and accent glow. Refresh the page: your look is remembered on this device.
9. **Phone**: use device emulation or a real phone. A thumb stick appears at the bottom left; drag elsewhere to turn the camera; tap the prompt to interact. Shadows are turned off and resolution is capped on small screens.
10. Turn on "reduce motion" in your OS: the camera follows without easing and the markers stop bobbing.

Known limits: the world is built from simple shapes (no downloaded models), interactions give information only (entering a building earns XP, see Testing Phase 6), and Nova is not a character in the world: the server rack in the office links to the Nova chat page.

## Testing Phase 5

Nova chat, AI-personalized future profile and AI roadmap. Without an AI provider the app runs in **demo mode** and says so everywhere; nothing pretends to be AI.

**Automated (no network, no key, no database needed):** `npm test --prefix server`. The AI suite (`tests/ai.test.js`) covers the provider client (request shape, retry without JSON mode, timeout, leaking no key), parsing and sanitizing model output (fenced JSON, wrong shapes, over-long text, unknown themes, unsafe links), prompt-injection hardening, the self-harm safety net, the scripted demo replies, and error mapping. With `TEST_MONGODB_URI` set, `tests/integration.test.js` also runs the full API flow with a fake provider (personalize, replace roadmap, refuse when progress exists, chat history, privacy between users, provider failure, double-click guard).

**In the browser, demo mode** (leave `AI_API_KEY` empty in `server/.env`; `http://localhost:5000/api/health` shows `"aiMode":"demo"`):
1. Sign in with a real account that has a dream. Open **Nova** in the sidebar. A yellow badge says *Demo mode · scripted replies, no AI connected*.
2. Click "What should I do next?". The reply names your first unfinished roadmap task and is tagged *Demo reply · not an AI model*. Refresh: the conversation is still there. **Clear chat** removes it.
3. On the dashboard click **Personalize with AI**. It reports that AI is not connected and that nothing changed.
4. Sample-data mode: Nova explains that an account is needed.
5. Type "I want to end my life" (just to test the safety net). Nova answers with a fixed caring message that points to local emergency services and findahelpline.com.

**In the browser, live AI** (set the three values below in `server/.env`, restart the server; health shows `"aiMode":"live"`):
1. Nova now shows a green *AI-powered* badge and answers in your language, using your dream and roadmap as context.
2. **Personalize with AI** (dashboard) rewrites the summary, themes and two decision scenarios. Reload: the card says it was personalized by AI. The 3D city/room colors follow the new themes.
3. **Rewrite roadmap with AI** appears only while no task is ticked. After you tick any task it disappears, and the API answers `409` (this protects your progress and stops XP being earned twice).
4. Wrong key or provider down: you get a plain error message, your typed text comes back, and nothing is saved.

## Testing Phase 6

Decision simulator, roadmap and achievements pages, XP for exploring. Everything the user earns is decided by the server.

**Automated:** `npm test` runs backend (`tests/phase6.test.js`, no database needed: input validation, outcome parsing, scenario keys, templates, prompts, AI/demo simulation) and client tests (`tests/routes.test.js` fails if any sidebar or 3D-world link points to a page that does not exist). With `TEST_MONGODB_URI` set, `tests/integration.test.js` also covers the full flow: XP once per scenario, the daily cap, repeats, AI vs template labels, provider failure storing nothing, privacy between users, world visits and Future Explorer.

**In the browser** (sign in with a real account that has a dream):
1. The sidebar now lists Roadmap, Decisions, Achievements and Nova as real pages (no more "Soon").
2. **Roadmap**: the first unfinished milestone is open. Tick a task: a purple box shows `+10 XP`. Untick and tick it again: no extra XP. Finish a milestone: `+50 XP` and *Career Starter*. Resource links open in a new tab.
3. **Decisions**: pick one of your two saved scenarios (or **Write your own**), then choose option A or B. You get a headline, a short story, a possible upside, a possible challenge and a step to try this week, plus `+20 XP` and *Decision Maker* the first time. The badge says whether the outcome came from AI or from the built-in template. Choose the same scenario again: no XP, and it says why. After three XP-earning decisions in one day, further ones still work but earn nothing.
4. **3D world**: walk into the apartment, the office and the café. Each first visit shows `First visit! +10 XP` at the top; after all three, *Future Explorer* unlocks. The decision room in the office links to the simulator and the server rack links to Nova.
5. **Achievements**: shows what each badge needs, when it was earned, level progress and which buildings you visited.
6. **Dashboard**: "Recent decisions" lists your last three choices.
7. Sample-data mode: Roadmap is read-only, Decisions and Nova ask you to create an account.

**Level titles, streak and unlocks:**
8. Every 500 XP is a level. Titles: Explorer, Dreamer, Builder, Pathfinder, Architect, Visionary (level 6 and up). The title shows in the sidebar, the dashboard header, the Achievements page (with a ladder of all titles) and as a greeting when the 3D world opens. When you gain a level, a gold "Level up!" banner appears wherever you are.
9. **Daily streak** (dashboard, Achievements page): completing a roadmap task, making a decision or visiting a building counts the day. The first action of each day pays 5 XP times the streak day, up to 25 XP, and the reward box says "Day N streak". Further actions the same day pay no extra bonus. Skip a whole day and the streak restarts (the best streak is remembered). "Today" follows your own time zone (sent by the browser as `X-Timezone`; an invalid value falls back to UTC). Set `STREAK_STEP_XP=0` in `server/.env` to turn the bonus off.
10. **Avatar unlocks** (palette button in the 3D world): options with a lock icon unlock at set levels, for example long hair and a gold glow at level 2, the bun hairstyle at level 3, a green glow at level 4. Locked options cannot be picked and Random never uses them. These unlocks are cosmetic and enforced in the browser only (your look is saved on your device), which is fine because they carry no XP.

## Testing Phase 7

Hardening, polish and a full regression pass. Nothing here adds a feature; it makes the existing ones safer and easier to check.

**What changed**
- A website that is not in `CLIENT_ORIGIN` now gets a clean `403` from the API instead of a `500`.
- `TRUST_PROXY` (see `server/.env.example`) makes rate limiting see each visitor's real address when the API runs behind a hosting proxy. Leave it unset on your own computer.
- With `NODE_ENV=production` the server refuses to start without a real `JWT_SECRET`, and warns about localhost addresses in `CLIENT_ORIGIN` / `MONGODB_URI` and weak `BCRYPT_ROUNDS`.
- If the server rejects your login mid-session (expired or account removed), the app signs you out and sends you to the login page, instead of showing errors on every page.
- Every page has a tab title, changing page scrolls to the top and announces the new page to screen readers, and a server error without a readable message shows a friendly one.

**Automated, no database needed:** `npm test`. New suites: `server/tests/config.test.js` (proxy and startup checks), `server/tests/hardening.test.js` (CORS, security headers, oversized bodies, database-operator injection, forged / expired / unsigned / edited tokens) and `client/tests/polish.test.js` (page titles, sign-out event, error messages).

**Automated, with a database (run this at least once).** The database-backed suites (`API integration`, `AI integration`, `Simulation and gamification integration`, `Daily streak integration`) are skipped unless you point them at a throwaway database. Use a **separate** database on your Atlas cluster, and its name must contain `test`. The suites create and delete their own data there, so never use your real `dreamverse` database. In PowerShell:

```
$env:TEST_MONGODB_URI = "mongodb+srv://USER:PASSWORD@YOUR-CLUSTER.mongodb.net/dreamverse_test?retryWrites=true&w=majority"
npm test --prefix server
Remove-Item Env:TEST_MONGODB_URI
```

Expect no `skipped` suites and `fail 0`. The variable only lives in that PowerShell window; do not put it in a file you commit.

**Regression walkthrough in the browser** (sign in with a real account; about 15 minutes):
1. Home loads, the 3D city moves, "Explore Demo World" opens the sample world, Register and Log in work and show clear messages for wrong input.
2. Create Your Future saves a dream; the Dashboard shows the future summary, roadmap and level title.
3. Roadmap: tick a task (`+10 XP`), untick, tick again (no extra XP).
4. Decisions: make one decision. Nova: send one message. In demo mode both are labeled as demo/template.
5. 3D world: walk, enter the apartment, office and café (each first visit pays once), open the avatar editor.
6. Achievements shows badges, level progress, title ladder and streak.

**Error states** (each should show a plain message, never a blank page):
7. Stop the API (Ctrl+C in the server window) and click around: pages say they cannot reach the server. Start it again and reload: everything is back.
8. Expired login: in the browser dev tools open Application → Local Storage → `dreamverse_token`, change a few characters of the value, then click any sidebar link. You are returned to the login page.
9. Open `http://localhost:5173/nothing-here`: a "page not found" screen with a way back, and the tab title says *Page not found*.

**Accessibility and devices:**
10. Keyboard only: press Tab from the top of any page. The first stop is "Skip to content"; every button and link shows a visible outline and can be used with Enter or Space.
11. Page titles: the browser tab changes on every page (for example *Roadmap · DreamVerse AI*).
12. Zoom the browser to 200%: text stays readable and nothing is cut off. Narrow the window to phone width (about 390 px): the sidebar becomes a menu button and the 3D world shows the on-screen joystick.
13. Turn on "Reduce motion" in Windows (Settings → Accessibility → Visual effects → Animation effects off): large animations calm down.

**Security checks you can run yourself** (replace the port if yours differs):
14. `curl -i -H "Origin: https://evil.example" http://localhost:5000/api/health` answers `403`; without the `Origin` header it answers `200`.
15. `curl -i http://localhost:5000/api/dreams` answers `401 Authentication required`.

Known limits: the avatar unlocks are enforced in the browser only (cosmetic); AI answers depend on your provider and model, and small local models sometimes need a second try to produce valid JSON; the three.js chunk produces a build size warning, which does not affect behavior.

## Password reset

"Forgot your password?" on the login page sends a one-hour reset link by email.

**How it works and why it is safe**
- The link contains a random 64-character token. The server stores only a hash of it, so a copy of the database cannot be used to reset accounts. Each link works once and expires after 60 minutes; asking again replaces the old link.
- The answer is identical whether or not the email has an account, so the form cannot be used to find out who is registered. A new link can be requested once a minute, and the endpoint is rate-limited to 5 requests per 15 minutes per address.
- After a reset every login issued before it stops working (the app signs those devices out). The reset page removes the token from the address bar as soon as it opens.
- Email can be turned on later. Without the Brevo settings the server runs in **console mode**: nothing is sent and, in development only, the link is printed in the server terminal. In production logs never contain links. `GET /api/health` shows `"mailMode":"smtp"` or `"console"`.

**Turn on real email (optional).** Real emails go through [Brevo](https://www.brevo.com) over HTTPS (free plan: 300 emails a day; its emails may carry a "Sent with Brevo" line). It works on your computer and on hosts that block email ports, such as Render's free plan. Create an account, make an API key under *SMTP & API → API Keys*, add and verify your sender address under *Senders*, then put both values in `server/.env` and restart the server:

```
BREVO_API_KEY=your-brevo-api-key
MAIL_FROM=DreamVerse AI <your-verified-sender@example.com>
APP_URL=http://localhost:5173
```

Never commit these values or paste them in chat. `GET /api/health` then shows `"mailMode":"brevo"`. (The first version of this feature also supported Gmail over SMTP through the `nodemailer` package. It was removed because `npm audit` reported a high-severity issue in it and Render's free plan blocks SMTP anyway; one email path is easier to keep safe.)

**Try it in the browser**
1. Create a test account, log out, and open Log in → **Forgot your password?**. Enter its email and submit: you always get "Check your email".
2. Console mode: find the block starting `[mail] Email is not configured…` in the server terminal and open the link on its own line. With Brevo set up: open the email. Check that the link starts with your `APP_URL`.
3. The reset page opens and the address bar changes to plain `/reset-password` (token hidden). Try a weak password and a mismatch: you get clear messages. Save a good password: "Password updated".
4. Open the same link again, or refresh the reset page: it is refused and offers a new link.
5. Log in with the old password: refused. Log in with the new one: works. If you were logged in on another browser, its next click returns you to the login page.
6. Request a link twice in a row: only one email/terminal block appears (one-minute cooldown). Enter an email with no account: you get the same message and nothing is printed.

**Automated:** `npm test` covers the token, email, mailer (Brevo requests are checked with a pretend server) and validation pieces without a database (`server/tests/reset.test.js`, `client/tests/account.test.js`). With `TEST_MONGODB_URI` set, the *Password reset integration* suite covers the full flow: same answer for known and unknown emails, token stored only as a hash, cooldown, wrong / expired / reused links, simultaneous use of one link, old logins rejected, and cleanup when the email cannot be sent.

Known limits: sign-up still tells a visitor when an email is already registered (a common trade-off for a friendlier form); there is no "change password while logged in" page yet.

## Deployment

Goal: the website on **Netlify** (or Vercel), the API on **Render**, the data in **MongoDB Atlas**. All three have free plans. Free plans change, so check the pricing pages before you rely on them; what I found when this guide was written is noted in each step.

What gets deployed: `render.yaml` (API), `netlify.toml` (website, Netlify), `client/vercel.json` (website, Vercel alternative). Secrets are never in Git: Render asks for them in its dashboard.

**Free-plan facts to know before you start**
- Render free web services go to sleep after 15 minutes without visitors, and the next visit takes about a minute to wake them. DreamVerse shows a "Still working…" notice when a request is slow. A free service gets 750 hours per month, may be restarted at any time, and keeps nothing on disk (the app stores everything in MongoDB, so this is fine).
- Render's free plan **blocks outgoing email on ports 25, 465 and 587**, so ordinary SMTP email cannot work there. Password reset emails use Brevo's HTTPS API (free plan: 300 emails a day, and its emails may carry a "Sent with Brevo" line).
- Netlify's free plan gives 300 credits a month with a hard limit (a production deploy costs 15 credits, 1 GB of traffic costs 20), plenty for a demo. If you ever hit the limit the site pauses until the next month.
- **Ollama only works on your own computer.** A deployed site cannot reach it. Online, Nova and the simulator either run in labeled demo mode (the default, nothing to do) or use a hosted AI provider with a key (step 7).

**1. Put the code on GitHub** (a private repository is fine). In PowerShell, in the project folder:
```
git init
git add .
git status
```
Read the `git status` list: **no `.env` file may appear** (only `.env.example`). If one does, stop and tell me. Then:
```
git commit -m "DreamVerse AI"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/dreamverse-ai.git
git push -u origin main
```
(Create the empty repository on github.com first and turn on two-step login for your account.) If a `.env` file was ever committed, treat every secret in it as leaked and replace it.

**2. MongoDB Atlas**
1. Database Access: create a **new** database user just for the deployed app, with a long random password (letters and digits avoid URL-encoding problems) and the privilege *Read and write* on the `dreamverse` database only.
2. Network Access: Render's free plan has no fixed address, so allow `0.0.0.0/0` ("anywhere"). That is acceptable here only because access still needs the long password. Stricter option: use the outbound address ranges Render lists for your region instead.
3. Connect → Drivers: copy the connection string, put the new user and password in it, and add the database name: `mongodb+srv://USER:PASSWORD@YOUR-CLUSTER.mongodb.net/dreamverse?retryWrites=true&w=majority`. Keep it for step 4. If the password you used while developing ever appeared in a chat or screenshot, change it now.

**3. Email for password reset (optional but recommended)**
1. Create a free Brevo account. SMTP & API → API Keys → create a key. Senders → add the address you want emails to come from and click the link Brevo emails you.
2. You will enter `BREVO_API_KEY` (the key) and `MAIL_FROM` (like `DreamVerse AI <that-address>`) in step 4. Without them the deployed site cannot send reset emails and the Forgot password page says so.
3. Emails sent from a free mailbox address (Gmail, Outlook) can land in spam. For a public site, verify a domain you own in Brevo.

**4. API on Render**
1. render.com → New → **Blueprint** → connect your GitHub repository. Render reads `render.yaml` and asks for the values marked in it: `MONGODB_URI` (step 2), `CLIENT_ORIGIN` and `APP_URL` (not known yet: type `https://placeholder.example` for now), `BREVO_API_KEY` and `MAIL_FROM` (step 3, or leave empty), and the three `AI_*` values (leave empty for demo mode). `JWT_SECRET` is generated for you; do not reuse your local one.
2. Wait for the deploy. Open `https://YOUR-SERVICE.onrender.com/api/health`: it should show `"status":"ok"` and `"database":"connected"`. If the logs say `FATAL` the server refused to start because of an unsafe setting; the message says which.
3. Copy the service address (no trailing slash).

**5. Website on Netlify**
1. app.netlify.com → Add new site → Import from Git → pick the repository. Netlify reads `netlify.toml` (base folder `client`, build `npm run build`, publish `dist`).
2. Before deploying, add the environment variable `VITE_API_URL` = your Render address plus `/api`, e.g. `https://YOUR-SERVICE.onrender.com/api`. It is read when the site is built, so changing it later needs a new deploy (Deploys → Trigger deploy).
3. Deploy, then copy the site address (like `https://something.netlify.app`; you can rename it under Site configuration). Vercel instead: Import the repository, set *Root Directory* to `client`, add the same variable. Vercel's free Hobby plan is for non-commercial use.

**6. Tell the API about the site**
In Render → your service → Environment: set `CLIENT_ORIGIN` and `APP_URL` to the exact Netlify address (https, no trailing slash). Save: Render restarts the service. These must match exactly or the browser blocks every request.

**7. AI online (optional)**
Leave the three `AI_*` values empty for labeled demo mode, or set them in Render to a hosted OpenAI-compatible provider (see "AI configuration"). Keys go only in Render, never in the website. Set a monthly spending limit at the provider: anyone can create an account, and the per-user limit (`AI_RATE_LIMIT`, 30 requests per 15 minutes) cannot stop many accounts. Slow models need `AI_TIMEOUT_MS=60000` or more.

**8. Check the live site**
From your computer (the first call may take a minute while Render wakes up):
```
npm run smoke --prefix server -- https://YOUR-SERVICE.onrender.com https://YOUR-SITE.netlify.app
```
Every line should say `PASS`. A `FAIL` line names what to fix (for example the CORS line means `CLIENT_ORIGIN` does not match). Then in the browser on the live address:
1. Register, create a dream, and see the dashboard.
2. Tick a roadmap task, make a decision, send Nova a message (labeled demo or AI as configured).
3. Open the 3D world on your computer and on a phone.
4. Press F5 on `/dashboard` and on `/world`: the page must reload, not show "Not found".
5. Forgot password: with Brevo set up, the email arrives (check spam) and the link opens the live reset page.
6. Open the browser console (F12): no red errors.

**9. After it works**
- Turn on two-step login for GitHub, Render, Netlify, Atlas and Brevo.
- Atlas: set up an alert for unusual connections, and keep the test database name containing `test` separate from the real one.
- Updating the site later: `git push` to `main`; Render and Netlify redeploy by themselves. Each dashboard can roll back to an earlier deploy.
- Run `npm audit --prefix server` now and then and update packages that have fixes.

**If something is wrong**
| You see | Usual cause |
|---|---|
| Red CORS error in the console, or "Cannot reach the DreamVerse server" right after the site loads | `CLIENT_ORIGIN` on Render differs from the site address (http vs https, a trailing slash, www). Or `VITE_API_URL` is wrong/missing: fix it and redeploy the site |
| Everything works but takes a minute the first time | Render woke up from sleep (normal on the free plan) |
| `503 The database is not connected` | Atlas Network Access does not allow Render, or the user/password in `MONGODB_URI` is wrong |
| Reloading a page shows Netlify's "Page not found" | The redirect was not applied: check that the build log mentions `netlify.toml`, and that the base directory is `client` |
| Everyone is logged out after a deploy | `JWT_SECRET` changed. Keep the generated value |
| Log line `Brevo refused the email (HTTP 4xx)` | Sender address not verified in Brevo, or a wrong key. The log line includes Brevo's reason |
| Log line `FATAL: JWT_SECRET ...` | Environment variable missing or too short |

Not included: custom domains, a CDN for the 3D assets (they are drawn from shapes, so there is nothing to host), and server-side logging/monitoring. They are optional once the basics work.

## AI configuration

AI calls only happen on the server; the browser never sees the key. Set these in `server/.env` to use any OpenAI-compatible provider that hosts an open-weight model (check your provider's current model list for the exact model id):

```
AI_BASE_URL=https://api.together.xyz/v1
AI_API_KEY=your-key
AI_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
```

Other options: Groq (`https://api.groq.com/openai/v1`), OpenRouter (`https://openrouter.ai/api/v1`), or a local Ollama server (`http://localhost:11434/v1`, set `AI_API_KEY` to any non-empty text such as `ollama`). With any of the three values missing the server runs in clearly labeled **demo mode** (scripted replies; the personalize buttons change nothing).

Optional: `AI_TIMEOUT_MS` (default 30000), `AI_MAX_TOKENS` (default 1800), `AI_JSON_MODE=false` (if your provider rejects strict-JSON mode), `AI_RATE_LIMIT` (AI requests per user per 15 minutes, default 30).

How the AI is kept safe and honest:
- Everything the model returns is validated: JSON shape, length limits, only known 3D theme ids, milestone and task counts. Resource links are kept only when they are plain https website home pages (models invent deep links), otherwise only the title is kept.
- User text is passed to the model as quoted data and the system prompt says to ignore instructions inside it. This reduces, but cannot eliminate, prompt injection, which is why the output is validated and nothing from the model is ever executed or rendered as HTML.
- A deterministic self-harm check runs before any model call and returns a fixed supportive message.
- The AI cannot grant XP or achievements; those stay server-controlled.
- Outcomes are described as an imaginative simulation, never a prediction.
