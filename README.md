# Apply & Pray

A local-first internship application tracker. Paste a job URL → local AI extracts the details → syncs to Google Sheets. No cloud AI costs, no API keys for extraction.

---

# Features

- URL extraction via local AI (Ollama)
- Google Sheets sync (service account, no login)
- Native desktop app (Tauri) + browser mode
- Dashboard analytics and deadline warnings
- Runs fully with local AI via Ollama — no cloud AI APIs required.

---

# Quick Start (Browser)

## 1. Install prerequisites

**Node.js** — [nodejs.org](https://nodejs.org)

**Ollama** — [ollama.com](https://ollama.com)

After installing Ollama, pull the model:

```powershell
ollama pull llama3.2:3b
```

## 2. Start Ollama

```powershell
ollama serve
```

Keep this running in the background whenever you use the app.

## 3. Clone and install

```powershell
git clone https://github.com/michaelshyam1/apply-and-pray
cd apply-and-pray
npm install
```

## 4. Create environment variables

Duplicate `.env.example` and rename the copy to:

.env.local

Edit `.env.local`:

```env
# Ollama — local AI (no API key needed)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Google Sheets — service account (no login required)
# Leave blank if you don't want Sheets sync — app still works locally
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_NAME=Applications
```

Google Sheets is optional. Without it, applications are saved to browser localStorage only.

## 5. Configure Google Sheets (optional)

1. Open [Google Cloud Console](https://console.cloud.google.com) and create a project
2. Enable the **Google Sheets API**
3. Go to **IAM & Admin → Service Accounts** → create a service account
4. Click the service account email → **Keys** → **Add Key** → **JSON** → download
5. From the downloaded JSON file, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (paste the full value including `-----BEGIN PRIVATE KEY-----`, keep `\n` as literal `\n` inside the quotes)
6. Create a Google Sheet and **share it with the service account email** (Editor access)
7. Copy the sheet ID from the URL:

```
https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
```

```env
GOOGLE_SHEET_ID=1AbCdEfGhIJkLmNoPqRsTuVwXyZ1234567890
```

## 6. Run

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

# Desktop App (Tauri - Optional)

The Tauri build wraps the Next.js app in a native Windows window. No Electron, no bundled Chromium. The `.exe` starts the Next.js server using your system Node.js on launch.

**Get the browser version working first before attempting this.**

## Additional prerequisites

| Tool | Why | Install |
|---|---|---|
| Rust + Cargo | Compiles the native binary | `winget install Rustlang.Rust.MSVC` or [rustup.rs](https://rustup.rs) |
| Visual Studio C++ Build Tools | Rust's Windows compiler backend | [VS Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — select **"Desktop development with C++"** workload |
| WebView2 | Browser engine for the native window | Included on Windows 11; [download for Windows 10](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |

Verify Rust is installed:

```powershell
rustc --version
cargo --version
```

Both should print version numbers. If not, install Rust and restart your terminal before continuing.

## Development mode (native window + hot reload)

Make sure Ollama is running, then:

```powershell
npm run tauri:dev
```

Tauri automatically runs `npm run dev` in the background, then opens a native window pointed at `http://localhost:3000`. Hot reload works normally — save a file and the window updates.

## Production build

```powershell
npm run tauri:build
```

This runs in sequence:
1. `npm run build` — Next.js standalone build → `.next/standalone/server.js`
2. `node scripts/copy-standalone.mjs` — copies static assets into the standalone directory
3. `cargo build --release` — compiles the Rust/Tauri binary (takes a few minutes the first time)

Output executable: `src-tauri/target/release/apply-and-pray.exe`

You can create a shortcut to this `.exe` on your desktop.

## What happens when you launch the .exe

1. Finds the project root automatically (walks up from the exe path)
2. Reads `.env.local` from the project root
3. Spawns `node .next/standalone/server.js` using your system Node.js
4. Waits up to 30 s for the server to be ready
5. Opens a native 1280×800 window at `http://localhost:3000`
6. Shows a warning dialog if Ollama is not running
7. Kills the Node.js server cleanly when the window is closed

**Important:** The `.exe` must stay inside the project folder. It finds `.env.local` and `.next/standalone/server.js` by navigating up from its own path. Do not move it elsewhere.

---

# How It Works

1. You paste a public job posting URL
2. The server fetches the page, strips HTML noise with Cheerio
3. Cleaned text is sent to Ollama (`llama3.2:3b`) running locally
4. Ollama extracts: company, role, location, category, deadline, salary
5. You review and confirm the extracted fields
6. Application is saved to localStorage and appended to Google Sheets
7. Dashboard hydrates from Google Sheets on startup (localStorage is a cache)

---

# Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Framer Motion |
| AI extraction | Ollama (`llama3.2:3b`) — runs locally |
| HTML parsing | Cheerio (server-side) |
| Storage | localStorage (cache) + Google Sheets (source of truth) |
| Sheets auth | Google service account (no OAuth login) |
| Desktop wrapper | Tauri 2 (Rust) |
| Charts | Recharts |

---

# Troubleshooting

**"Ollama is not running" warning on launch**
Run `ollama serve` in a terminal and keep it open. The app checks port 11434 on startup.

**URL extraction returns empty or wrong fields**
Some job portals block server-side scraping. Try pasting the job description text directly into the text field instead of the URL.

**Google Sheets not syncing**
- Check that all three `GOOGLE_*` variables are set in `.env.local`
- Make sure the sheet is shared with the service account email (Editor access)
- The `GOOGLE_PRIVATE_KEY` value must include the full key with `-----BEGIN PRIVATE KEY-----` and keep `\n` as literal backslash-n inside the quotes

**Screenshot extraction not working**
The default model (`llama3.2:3b`) is text-only. Screenshot extraction requires a vision model. Change `OLLAMA_MODEL=qwen2.5vl:7b` in `.env.local` and run `ollama pull qwen2.5vl:7b`. Note: vision models need ~8 GB RAM.

**`cargo` not found when running `npm run tauri:dev`**
Rust was installed but the terminal hasn't picked up the new PATH. Close and reopen your terminal, then try again. Run `cargo --version` to confirm it's available.

**Tauri build fails with "icon file not found"**
You need to generate icons first. Place a 1024×1024 PNG at `src-tauri/icons/app-icon.png` and run `npm run tauri:icon`.

---

## One-time: generate app icons (OPTIONAL)

Place a 1024×1024 PNG at `src-tauri/icons/app-icon.png`, then run:

```powershell
npm run tauri:icon
```

This generates all required icon sizes (`32x32.png`, `128x128.png`, `icon.ico`, etc.) in `src-tauri/icons/`.

# Changing the AI Model

Update `OLLAMA_MODEL` in `.env.local`:

```env
# Text-only — fast, low RAM (~2 GB), default
OLLAMA_MODEL=llama3.2:3b

# Vision-capable — enables screenshot extraction, needs ~8 GB RAM
OLLAMA_MODEL=qwen2.5vl:7b
```

Pull the model before switching:

```powershell
ollama pull llama3.2:3b
# or
ollama pull qwen2.5vl:7b
```

No code changes needed — the model name is read from `.env.local` at runtime.
