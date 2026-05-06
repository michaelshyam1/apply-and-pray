# Apply & Pray

> Track every shot. Remember every prayer.

A local-first internship application tracker powered by Ollama (local AI). Paste a job URL → AI extracts details → syncs to Google Sheets. No cloud AI costs, no API keys for extraction.

## Quick Start (browser)

```bash
npm install
cp .env.example .env.local
# Fill in Google Sheets credentials in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Requirements

| Tool | Purpose | Install |
|---|---|---|
| Node.js 18+ | Runs the Next.js server | [nodejs.org](https://nodejs.org) |
| Ollama | Local AI for URL/text extraction | [ollama.com](https://ollama.com) |
| `llama3.2:3b` model | Text extraction model | `ollama pull llama3.2:3b` |

### Start Ollama before using the app

```powershell
ollama serve
```

The app shows a warning dialog if Ollama is not running when it opens. URL extraction and text extraction both require it. The dashboard and Google Sheets sync work without it.

---

## Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```env
# Ollama — local AI (no API key needed)
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Google Sheets — service account (no login required)
GOOGLE_SHEET_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=name@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
GOOGLE_SHEET_NAME=Applications
```

### Google Sheets Setup

1. Open [Google Cloud Console](https://console.cloud.google.com) and enable the **Google Sheets API**
2. Go to **IAM & Admin → Service Accounts** and create a service account
3. Create a JSON key — download the file
4. Copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. Copy `private_key` → `GOOGLE_PRIVATE_KEY` (keep `\n` as literal `\n` inside the quotes)
6. Create a Google Sheet and share it with the service account email (Editor access)
7. Copy the sheet ID from its URL → `GOOGLE_SHEET_ID`
8. Restart the dev server

---

## Desktop App (Tauri — Windows)

Tauri wraps the Next.js app in a native window. No Electron, no bundled Chromium.
The desktop build uses your system Node.js to start the Next.js server on launch.

### Additional prerequisites for desktop build

| Tool | Install |
|---|---|
| Rust | `winget install Rustlang.Rust.MSVC` or [rustup.rs](https://rustup.rs) |
| Visual Studio C++ build tools | [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — select "C++ build tools" workload |
| WebView2 | Included on Windows 11; [download for Win 10](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |

### One-time: generate app icons

Place a 1024×1024 PNG at `src-tauri/icons/app-icon.png`, then run:

```powershell
npm run tauri:icon
```

### Development (native window + hot reload)

```powershell
npm run tauri:dev
```

Tauri starts `npm run dev` automatically, then opens a native window at `http://localhost:3000`. Hot reload works normally.

### Production build

```powershell
npm run tauri:build
```

This runs in order:
1. `npm run build` — Next.js standalone build → `.next/standalone/server.js`
2. `node scripts/copy-standalone.mjs` — copies static assets into standalone
3. `cargo build --release` — compiles the Tauri binary

Output: `src-tauri/target/release/apply-and-pray.exe`

On launch the `.exe`:
1. Finds the project root automatically (walks up from the exe path)
2. Spawns `node .next/standalone/server.js` using your system Node.js
3. Waits up to 30 s for the server to be ready
4. Opens a native 1280×800 window at `http://localhost:3000`
5. Shows a warning dialog if Ollama is not running
6. Kills the Node.js server cleanly when the window is closed

`.env.local` is not bundled — it is read from the project directory at runtime.

---

## Usage

### Adding Applications

**URL extraction (primary mode)**
1. Go to `/upload` → URL / Manual tab
2. Paste any public job posting URL
3. The backend fetches the page, parses the HTML, and sends the text to Ollama
4. Ollama extracts: company, role, location, category, deadline, salary
5. Review and edit the extracted fields
6. Click "Save Application"

**Manual text entry**
1. Go to `/upload` → URL / Manual tab
2. Paste the job description text directly (useful when a site blocks scraping)

**Screenshot (experimental)**
- Requires a vision-capable model (e.g. `qwen2.5vl:7b`)
- `llama3.2:3b` is text-only and will fail on images
- Set `OLLAMA_MODEL=qwen2.5vl:7b` to enable screenshot extraction

### Dashboard

- Stats: total tracked, active in pipeline, offers, response rate, rejected
- Velocity chart: applications over time (daily + cumulative, 30-day window)
- Status breakdown chart
- Deadline warnings (7-day window, highlighted amber/red)
- Sortable and filterable application table
- Click any status badge to change it inline

### Google Sheets Sync

- New applications auto-append to the sheet on save
- Edit/delete/status changes mark the sheet as "unsynced" (amber dot on button)
- Click **Push Changes to Sheet** to overwrite the sheet with current dashboard state

**Sheet columns:** Date Applied | Company | Role | Category | Location | Status | Deadline | Salary | Notes | URL

---

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS** + custom shadcn-style components
- **Framer Motion** for animations
- **Recharts** for analytics
- **Ollama** (`llama3.2:3b`) for local AI extraction — no cloud, no API costs
- **Cheerio** for server-side HTML parsing
- **Google Sheets API** (service account) for sync
- **localStorage** for primary storage — no database needed
- **Tauri 2** for the native desktop wrapper (optional)

## Changing the Ollama Model

Update `OLLAMA_MODEL` in `.env.local`:

```env
# Text-only (default, fast, low RAM)
OLLAMA_MODEL=llama3.2:3b

# Vision-capable (enables screenshot extraction, needs ~8 GB RAM)
OLLAMA_MODEL=qwen2.5vl:7b
```

Then pull the model:

```powershell
ollama pull llama3.2:3b
# or
ollama pull qwen2.5vl:7b
```

No code changes required — the model name is read at runtime.
